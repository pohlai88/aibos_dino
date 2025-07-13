// Consolidated FileIndexerService - Enterprise Implementation
import { supabase } from '../../modules/supabase-client.ts';
import { EnterpriseLogger } from './core/logger.ts';
import { EventThrottler } from './core/event-throttler.ts';

// Unified interfaces
export interface FileMetadata {
  id: string;
  name: string;
  path: string;
  size: number;
  type: 'file' | 'directory';
  extension: string;
  modified: Date;
  created: Date;
  content?: string;
  tags: string[];
  checksum: string;
  // Enterprise fields
  tenantId?: string;
  indexVersion: number;
  lastSynced?: Date;
  storageLocation?: string;
}

export interface SearchFilters {
  type?: 'file' | 'directory';
  extension?: string[];
  sizeMin?: number;
  sizeMax?: number;
  modifiedAfter?: Date;
  modifiedBefore?: Date;
  tags?: string[];
}

export interface IndexingProgress {
  phase: 'scanning' | 'indexing' | 'extracting' | 'embedding' | 'saving';
  current: number;
  total: number;
  currentFile?: string;
  percentage: number;
  estimatedTimeRemaining?: number;
  errors: number;
}

interface FileChecksum {
  path: string;
  size: number;
  modified: number;
  hash: string;
}

interface PersistentIndex {
  saveIndex(): Promise<void>;
  loadIndex(): Promise<void>;
  saveEmbeddings(fileId: string, embeddings: number[]): Promise<void>;
  loadEmbeddings(fileId: string): Promise<number[] | null>;
  saveLargeContent(fileId: string, content: string): Promise<string>;
  loadLargeContent(storageUrl: string): Promise<string>;
}

// Unified FileIndexerService Class
export class FileIndexerService implements PersistentIndex {
  private tenantId: string = 'default';
  private readonly LARGE_CONTENT_THRESHOLD = 1024 * 1024; // 1MB
  private progressCallback?: ((progress: IndexingProgress) => void) | undefined;
  private startTime = 0;
  private fileChecksums = new Map<string, FileChecksum>();
  private isIndexing = false;
  private indexingErrors: Array<{ file: string; error: unknown; type: string }> = [];
  private logger: EnterpriseLogger;
  private throttler: EventThrottler;
  private index = {
    files: new Map<string, FileMetadata>(),
    directories: new Map<string, FileMetadata>(),
    lastUpdated: new Date()
  };

  constructor(tenantId?: string) {
    this.tenantId = tenantId || 'default';
    this.logger = new EnterpriseLogger();
    this.throttler = new EventThrottler();
  }

  // ============================================================================
  // PERSISTENCE METHODS
  // ============================================================================

  async saveIndex(): Promise<void> {
    try {
      const indexData = {
        tenant_id: this.tenantId,
        files: Array.from(this.index.files.values()),
        directories: Array.from(this.index.directories.values()),
        last_updated: new Date(),
        version: 1
      };

      const { error } = await supabase
        .from('file_indexes')
        .upsert(indexData, { onConflict: 'tenant_id' });

      if (error) throw error;

      this.logger.info('Index saved successfully', {
        component: 'FileIndexer',
        action: 'saveIndex',
        metadata: { 
          tenantId: this.tenantId,
          fileCount: this.index.files.size,
          directoryCount: this.index.directories.size
        }
      });
    } catch (error) {
      this.logger.error('Failed to save index', {
        component: 'FileIndexer',
        action: 'saveIndex',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  async loadIndex(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('file_indexes')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        this.index.files.clear();
        this.index.directories.clear();
        
        data.files?.forEach((file: FileMetadata) => {
          this.index.files.set(file.path, file);
        });
        
        data.directories?.forEach((dir: FileMetadata) => {
          this.index.directories.set(dir.path, dir);
        });
        
        this.index.lastUpdated = new Date(data.last_updated);
      }

      this.logger.info('Index loaded successfully', {
        component: 'FileIndexer',
        action: 'loadIndex',
        metadata: { 
          tenantId: this.tenantId,
          fileCount: this.index.files.size,
          directoryCount: this.index.directories.size
        }
      });
    } catch (error) {
      this.logger.error('Failed to load index', {
        component: 'FileIndexer',
        action: 'loadIndex',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  async saveLargeContent(fileId: string, content: string): Promise<string> {
    const fileName = `content/${this.tenantId}/${fileId}.txt`;
    
    const { data: _data, error } = await supabase.storage
      .from('file-content')
      .upload(fileName, content, { upsert: true });

    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('file-content')
      .getPublicUrl(fileName);

    return publicUrl;
  }

  async loadLargeContent(storageUrl: string): Promise<string> {
    const response = await fetch(storageUrl);
    if (!response.ok) throw new Error(`Failed to load content: ${response.statusText}`);
    return await response.text();
  }

  async saveEmbeddings(fileId: string, embeddings: number[]): Promise<void> {
    const { error } = await supabase
      .from('file_embeddings')
      .upsert({
        file_id: fileId,
        tenant_id: this.tenantId,
        embeddings: embeddings,
        created_at: new Date()
      }, { onConflict: 'file_id,tenant_id' });

    if (error) throw error;
  }

  async loadEmbeddings(fileId: string): Promise<number[] | null> {
    const { data, error } = await supabase
      .from('file_embeddings')
      .select('embeddings')
      .eq('file_id', fileId)
      .eq('tenant_id', this.tenantId)
      .single();

    if (error || !data) return null;
    return data.embeddings;
  }

  // ============================================================================
  // INDEXING METHODS
  // ============================================================================

  async indexFiles(files: File[], onProgress?: (progress: IndexingProgress) => void): Promise<void> {
    this.progressCallback = onProgress;
    this.startTime = Date.now();
    this.isIndexing = true;
    
    const total = files.length;
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;
        this.reportProgress({
          phase: 'indexing',
          current: i + 1,
          total,
          currentFile: file.name,
          percentage: ((i + 1) / total) * 100,
          estimatedTimeRemaining: this.calculateETA(i + 1, total),
          errors: this.indexingErrors.length
        });
        try {
          await this.indexFileFromBlob(file);
        } catch (error) {
          this.addIndexingError(file.name, error, 'content');
        }
      }
      await this.saveIndex();
    } finally {
      this.isIndexing = false;
    }
  }

  async indexDirectory(dirPath: string, onProgress?: (progress: IndexingProgress) => void): Promise<void> {
    this.progressCallback = onProgress;
    this.startTime = Date.now();
    this.isIndexing = true;
    
    try {
      const totalFiles = await this.countFilesInDirectory(dirPath);
      
      this.reportProgress({
        phase: 'scanning',
        current: 0,
        total: totalFiles,
        percentage: 0,
        errors: 0
      });
      
      await this.indexDirectoryWithProgress(dirPath, totalFiles);
      await this.saveIndex();
    } finally {
      this.isIndexing = false;
    }
  }

  // ============================================================================
  // SEARCH METHODS
  // ============================================================================

  async search(query: string, filters: SearchFilters = {}): Promise<FileMetadata[]> {
    try {
      await this.loadIndex();
      
      if (this.index.files.size === 0) {
        this.logger.warn('No files indexed yet', {
          component: 'FileIndexer',
          action: 'search'
        });
        return [];
      }
      
      const queryLower = query.toLowerCase();
      let results = Array.from(this.index.files.values());
      
      // Apply text search
      if (query.trim()) {
        results = results.filter(file => 
          file.name.toLowerCase().includes(queryLower) ||
          file.path.toLowerCase().includes(queryLower) ||
          file.content?.toLowerCase().includes(queryLower) ||
          file.tags.some(tag => tag.toLowerCase().includes(queryLower))
        );
      }
      
      // Apply filters
      if (filters.type) {
        results = results.filter(file => file.type === filters.type);
      }
      
      if (filters.extension?.length) {
        results = results.filter(file => 
          filters.extension!.includes(file.extension.toLowerCase())
        );
      }
      
      if (filters.sizeMin !== undefined) {
        results = results.filter(file => file.size >= filters.sizeMin!);
      }
      
      if (filters.sizeMax !== undefined) {
        results = results.filter(file => file.size <= filters.sizeMax!);
      }
      
      if (filters.modifiedAfter) {
        results = results.filter(file => file.modified >= filters.modifiedAfter!);
      }
      
      if (filters.modifiedBefore) {
        results = results.filter(file => file.modified <= filters.modifiedBefore!);
      }
      
      if (filters.tags?.length) {
        results = results.filter(file => 
          filters.tags!.some(tag => file.tags.includes(tag))
        );
      }
      
      // Sort by relevance (name matches first, then content matches)
      results.sort((a, b) => {
        const aNameMatch = a.name.toLowerCase().includes(queryLower);
        const bNameMatch = b.name.toLowerCase().includes(queryLower);
        
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        
        return b.modified.getTime() - a.modified.getTime();
      });
      
      this.logger.info('Search completed', {
        component: 'FileIndexer',
        action: 'search',
        metadata: {
          query,
          resultCount: results.length,
          totalIndexed: this.index.files.size
        }
      });
      
      return results;
    } catch (error) {
      this.logger.error('Search failed', {
        component: 'FileIndexer',
        action: 'search',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private async indexFileFromBlob(file: File): Promise<void> {
    const metadata = await this.createFileMetadata(file, file.name);
    this.index.files.set(metadata.path, metadata);
  }

  private async createFileMetadata(file: File, name: string): Promise<FileMetadata> {
    const content = this.isTextFile(name) ? await file.text() : '';
    const checksum = await this.calculateChecksum(file);
    
    return {
      id: `${this.tenantId}-${name}-${Date.now()}`,
      name,
      path: name,
      size: file.size,
      type: 'file',
      extension: this.getFileExtension(name),
      modified: new Date(file.lastModified),
      created: new Date(file.lastModified),
      content,
      tags: this.generateTags(name),
      checksum,
      tenantId: this.tenantId,
      indexVersion: 1
    };
  }

  private isTextFile(filename: string): boolean {
    const textExtensions = ['.txt', '.md', '.js', '.ts', '.json', '.html', '.css', '.xml', '.csv'];
    const ext = this.getFileExtension(filename);
    return textExtensions.includes(ext);
  }

  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(lastDot).toLowerCase() : '';
  }

  private generateTags(filename: string): string[] {
    const tags = [];
    const ext = this.getFileExtension(filename);
    if (ext) tags.push(ext.substring(1)); // Remove the dot
    
    // Add category tags based on extension
    const categories: Record<string, string> = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.md': 'markdown',
      '.txt': 'text',
      '.json': 'data'
    };
    
    if (categories[ext]) {
      tags.push(categories[ext]);
    }
    
    return tags;
  }

  private async calculateChecksum(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private reportProgress(progress: IndexingProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  private calculateETA(current: number, total: number): number {
    if (current === 0) return 0;
    const elapsed = Date.now() - this.startTime;
    const rate = current / elapsed;
    const remaining = total - current;
    return remaining / rate;
  }

  private addIndexingError(file: string, error: unknown, type: string): void {
    this.indexingErrors.push({ file, error, type });
    this.logger.error('Indexing error', {
      component: 'FileIndexer',
      action: 'addIndexingError',
      metadata: { file, type, error: error instanceof Error ? error.message : String(error) }
    });
  }

  private countFilesInDirectory(_dirPath: string): Promise<number> {
    // Implementation depends on file system access method
    return Promise.resolve(0); // Placeholder
  }

  private async indexDirectoryWithProgress(_dirPath: string, _totalFiles: number): Promise<void> {
    // Implementation depends on file system access method
    // Placeholder for directory indexing logic
  }

  // Public API methods
  getStats() {
    return {
      totalFiles: this.index.files.size,
      totalDirectories: this.index.directories.size,
      lastUpdated: this.index.lastUpdated,
      errors: this.indexingErrors.length
    };
  }

  clearErrors(): void {
    this.indexingErrors = [];
  }

  destroy(): void {
    this.index.files.clear();
    this.index.directories.clear();
    this.fileChecksums.clear();
    this.indexingErrors = [];
    this.throttler.clear();
  }
}

// Export singleton instance
export const fileIndexer = new FileIndexerService();