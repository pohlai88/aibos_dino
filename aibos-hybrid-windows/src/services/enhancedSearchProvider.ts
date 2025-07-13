/**
 * AIBOS Enhanced Search Provider
 * Integrates file indexing with advanced search capabilities
 */

import { SearchProvider, SearchResult } from '../types/search.ts';
import { fileIndexer, FileMetadata, SearchFilters } from './fileIndexer.ts';
import { createSearchResult } from './searchRegistry.ts';
import { EnterpriseLogger } from './core/logger.ts';

export interface EnhancedSearchOptions {
  includeFiles?: boolean;
  includeContent?: boolean;
  fuzzySearch?: boolean;
  searchHistory?: boolean;
  suggestions?: boolean;
  maxResults?: number;
}

class EnhancedSearchProvider implements SearchProvider {
  id = 'enhanced-search';
  name = 'Enhanced Search';
  description = 'Advanced file and content search with filtering';
  priority = 6; // Higher priority than basic search

  private logger = new EnterpriseLogger();
  private searchHistory: string[] = [];
  private maxHistorySize = 50;
  private fuzzySearchEnabled = true;
  private maxResults = 20;

  constructor(options: EnhancedSearchOptions = {}) {
    this.fuzzySearchEnabled = options.fuzzySearch ?? true;
    this.maxResults = options.maxResults ?? 20;
  }

  /**
   * Search with advanced capabilities
   */
  async search(query: string, limit?: number): Promise<SearchResult[]> {
    if (!query.trim()) return [];

    const startTime = performance.now();
    const maxResults = limit || this.maxResults;

    try {
      this.addToHistory(query);
      const { searchQuery, filters } = this.parseQuery(query);
      const fileResults = await this.searchFiles(searchQuery, filters, maxResults);
      const results = fileResults.map(file => this.createFileSearchResult(file));

      const duration = performance.now() - startTime;
      this.logger.info('Enhanced search completed', {
        component: 'EnhancedSearchProvider',
        action: 'search',
        metadata: { 
          duration: `${duration.toFixed(2)}ms`,
          resultCount: results.length,
          query: searchQuery
        }
      });

      return results;
    } catch (error) {
      this.logger.warn('Enhanced search failed', {
        component: 'EnhancedSearchProvider',
        action: 'search',
        metadata: { 
          error: error instanceof Error ? error.message : String(error),
          query
        }
      });
      return [];
    }
  }

  /**
   * Get quick access items
   */
  async getQuickAccess(limit: number = 8): Promise<SearchResult[]> {
    try {
      const recentFiles = await this.getRecentFiles(limit);
      return recentFiles.map(file => this.createFileSearchResult(file));
    } catch (error) {
      this.logger.warn('Failed to get quick access', {
        component: 'EnhancedSearchProvider',
        action: 'getQuickAccess',
        metadata: { 
          error: error instanceof Error ? error.message : String(error),
          limit
        }
      });
      return [];
    }
  }

  /**
   * Search files with advanced filtering
   */
  private async searchFiles(query: string, filters: SearchFilters, limit: number): Promise<FileMetadata[]> {
    // Use fuzzy search if enabled
    if (this.fuzzySearchEnabled && query.length > 2) {
      return this.fuzzySearch(query, filters, limit);
    }

    // Use exact search
    return fileIndexer.search(query, filters).then(results => results.slice(0, limit));
  }

  /**
   * Fuzzy search with typo tolerance
   */
  private async fuzzySearch(query: string, filters: SearchFilters, limit: number): Promise<FileMetadata[]> {
    const results = await fileIndexer.search('', filters); // Get all files with filters
    const queryLower = query.toLowerCase();

    // Score each result based on similarity
    const scoredResults = results.map(file => ({
      file,
      score: this.calculateSimilarity(file, queryLower)
    }));

    // Sort by score and return top results
    return scoredResults
      .filter(item => item.score > 0.3) // Minimum similarity threshold
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.file);
  }

  /**
   * Calculate similarity score between file and query
   */
  private calculateSimilarity(file: FileMetadata, query: string): number {
    const nameLower = file.name.toLowerCase();
    const pathLower = file.path.toLowerCase();
    const tagsLower = file.tags.map(tag => tag.toLowerCase()).join(' ');
    const contentLower = file.content?.toLowerCase() || '';

    // Exact matches get highest score
    if (nameLower === query) return 1.0;
    if (nameLower.startsWith(query)) return 0.9;
    if (pathLower.includes(query)) return 0.8;

    // Partial matches
    let score = 0;
    if (nameLower.includes(query)) score += 0.6;
    if (tagsLower.includes(query)) score += 0.4;
    if (contentLower.includes(query)) score += 0.3;

    // Levenshtein distance for typo tolerance
    const nameDistance = this.levenshteinDistance(nameLower, query);
    const maxDistance = Math.max(nameLower.length, query.length);
    const distanceScore = 1 - (nameDistance / maxDistance);
    
    if (distanceScore > 0.7) {
      score = Math.max(score, distanceScore * 0.5);
    }

    return Math.min(score, 1.0);
  }

  /**
   * Calculate Levenshtein distance for fuzzy matching
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Parse query for filters and search terms
   */
  private parseQuery(query: string): { searchQuery: string; filters: SearchFilters } {
    const filters: SearchFilters = {};
    let searchQuery = query;

    // Parse type filters
    if (query.includes('type:file')) {
      filters.type = 'file';
      searchQuery = searchQuery.replace('type:file', '').trim();
    } else if (query.includes('type:dir')) {
      filters.type = 'directory';
      searchQuery = searchQuery.replace('type:dir', '').trim();
    }

    // Parse extension filters
    const extMatch = query.match(/ext:(\w+)/g);
    if (extMatch) {
      filters.extension = extMatch.map(match => `.${match.split(':')[1]}`);
      searchQuery = searchQuery.replace(/ext:\w+/g, '').trim();
    }

    // Parse size filters
    const sizeMatch = query.match(/size:(\d+)([kmg]?)/i);
    if (sizeMatch) {
      const size = parseInt(sizeMatch[1]);
      const unit = sizeMatch[2].toLowerCase();
      const multiplier = unit === 'k' ? 1024 : unit === 'm' ? 1024 * 1024 : unit === 'g' ? 1024 * 1024 * 1024 : 1;
      filters.size = { max: size * multiplier };
      searchQuery = searchQuery.replace(/size:\d+[kmg]?/i, '').trim();
    }

    // Parse date filters
    const dateMatch = query.match(/date:(\d+)/);
    if (dateMatch) {
      const days = parseInt(dateMatch[1]);
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      filters.date = { from: fromDate };
      searchQuery = searchQuery.replace(/date:\d+/, '').trim();
    }

    // Parse tag filters
    const tagMatch = query.match(/tag:(\w+)/g);
    if (tagMatch) {
      filters.tags = tagMatch.map(match => match.split(':')[1]);
      searchQuery = searchQuery.replace(/tag:\w+/g, '').trim();
    }

    // Parse content search
    if (query.includes('content:')) {
      filters.content = true;
      searchQuery = searchQuery.replace('content:', '').trim();
    }

    return { searchQuery, filters };
  }

  /**
   * Get recently modified files
   */
  private async getRecentFiles(limit: number): Promise<FileMetadata[]> {
    const allFiles = await fileIndexer.search('', { type: 'file' });
    return allFiles
      .sort((a, b) => b.modified.getTime() - a.modified.getTime())
      .slice(0, limit);
  }

  /**
   * Create search result from file metadata
   */
  private createFileSearchResult(file: FileMetadata): SearchResult {
    const icon = this.getFileIcon(file);
    const description = this.getFileDescription(file);
    const category = this.getFileCategory(file);

    return createSearchResult(
      file.id,
      'file',
      file.name,
      () => this.openFile(file),
      {
        icon,
        description,
        category,
        metadata: {
          path: file.path,
          size: file.size,
          modified: file.modified,
          extension: file.extension,
          tags: file.tags,
        }
      }
    );
  }

  /**
   * Get appropriate icon for file type
   */
  private getFileIcon(file: FileMetadata): string {
    if (file.type === 'directory') return '📁';
    
    const extension = file.extension?.toLowerCase();
    const iconMap: Record<string, string> = {
      '.txt': '📄',
      '.md': '📝',
      '.json': '📋',
      '.js': '📜',
      '.ts': '📜',
      '.jsx': '⚛️',
      '.tsx': '⚛️',
      '.html': '🌐',
      '.css': '🎨',
      '.scss': '🎨',
      '.py': '🐍',
      '.java': '☕',
      '.cpp': '⚙️',
      '.c': '⚙️',
      '.h': '⚙️',
      '.php': '🐘',
      '.rb': '💎',
      '.go': '🐹',
      '.rs': '🦀',
      '.swift': '🍎',
      '.kt': '☕',
      '.scala': '☕',
      '.sql': '🗄️',
      '.xml': '📄',
      '.yaml': '📄',
      '.yml': '📄',
      '.toml': '📄',
      '.ini': '⚙️',
      '.cfg': '⚙️',
      '.jpg': '🖼️',
      '.jpeg': '🖼️',
      '.png': '🖼️',
      '.gif': '🖼️',
      '.svg': '🖼️',
      '.pdf': '📕',
      '.doc': '📘',
      '.docx': '📘',
      '.xls': '📊',
      '.xlsx': '📊',
      '.ppt': '📽️',
      '.pptx': '📽️',
      '.zip': '📦',
      '.rar': '📦',
      '.7z': '📦',
      '.tar': '📦',
      '.gz': '📦',
    };

    return iconMap[extension || ''] || '📄';
  }

  /**
   * Get file description
   */
  private getFileDescription(file: FileMetadata): string {
    if (file.type === 'directory') {
      return `Directory • ${file.path}`;
    }

    const size = this.formatFileSize(file.size);
    const date = file.modified.toLocaleDateString();
    const tags = file.tags.length > 0 ? ` • ${file.tags.slice(0, 3).join(', ')}` : '';
    
    return `${size} • ${date}${tags}`;
  }

  /**
   * Get file category
   */
  private getFileCategory(file: FileMetadata): string {
    if (file.type === 'directory') return 'Directory';
    
    const extension = file.extension?.toLowerCase();
    const categoryMap: Record<string, string> = {
      '.txt': 'Text',
      '.md': 'Documentation',
      '.json': 'Data',
      '.js': 'JavaScript',
      '.ts': 'TypeScript',
      '.jsx': 'React',
      '.tsx': 'React',
      '.html': 'Web',
      '.css': 'Stylesheet',
      '.scss': 'Stylesheet',
      '.py': 'Python',
      '.java': 'Java',
      '.cpp': 'C++',
      '.c': 'C',
      '.h': 'Header',
      '.php': 'PHP',
      '.rb': 'Ruby',
      '.go': 'Go',
      '.rs': 'Rust',
      '.swift': 'Swift',
      '.kt': 'Kotlin',
      '.scala': 'Scala',
      '.sql': 'Database',
      '.xml': 'XML',
      '.yaml': 'Configuration',
      '.yml': 'Configuration',
      '.toml': 'Configuration',
      '.ini': 'Configuration',
      '.cfg': 'Configuration',
      '.jpg': 'Image',
      '.jpeg': 'Image',
      '.png': 'Image',
      '.gif': 'Image',
      '.svg': 'Image',
      '.pdf': 'PDF',
      '.doc': 'Document',
      '.docx': 'Document',
      '.xls': 'Spreadsheet',
      '.xlsx': 'Spreadsheet',
      '.ppt': 'Presentation',
      '.pptx': 'Presentation',
      '.zip': 'Archive',
      '.rar': 'Archive',
      '.7z': 'Archive',
      '.tar': 'Archive',
      '.gz': 'Archive',
    };

    return categoryMap[extension || ''] || 'File';
  }

  /**
   * Format file size
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  /**
   * Open file action
   */
  private async openFile(file: FileMetadata): Promise<void> {
    try {
      // In a real implementation, this would open the file with the appropriate app
      this.logger.info(`Opening file: ${file.path}`, { component: 'EnhancedSearchProvider', action: 'openFile', metadata: { path: file.path } });
      
      // For now, just log the action
      console.log(`Would open file: ${file.path}`);
    } catch (error) {
      this.logger.warn(`Failed to open file ${file.path}: ${error instanceof Error ? error.message : String(error)}`, { component: 'EnhancedSearchProvider', action: 'openFile', metadata: { path: file.path } });
    }
  }

  /**
   * Add query to search history
   */
  private addToHistory(query: string): void {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    // Remove if already exists
    this.searchHistory = this.searchHistory.filter(q => q !== trimmedQuery);
    
    // Add to beginning
    this.searchHistory.unshift(trimmedQuery);
    
    // Keep only recent searches
    if (this.searchHistory.length > this.maxHistorySize) {
      this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Get search history
   */
  getSearchHistory(): string[] {
    return [...this.searchHistory];
  }

  /**
   * Get search suggestions
   */
  getSuggestions(partialQuery: string): string[] {
    if (!partialQuery.trim()) return [];

    const query = partialQuery.toLowerCase();
    return this.searchHistory
      .filter(historyQuery => historyQuery.toLowerCase().includes(query))
      .slice(0, 5);
  }

  /**
   * Clear search history
   */
  clearHistory(): void {
    this.searchHistory = [];
  }
}

// Export singleton instance
export const enhancedSearchProvider = new EnhancedSearchProvider();