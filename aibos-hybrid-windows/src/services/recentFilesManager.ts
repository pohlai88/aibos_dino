import { systemIntegration } from './systemIntegration.ts';
import { storageService } from './storageService.ts';

export interface RecentFile {
  path: string;
  name: string;
  lastAccessed: string;
  size: number;
  type: string;
  isPinned?: boolean;
  thumbnail?: string;
}

class RecentFilesManagerService {
  private maxRecentFiles = 50;
  private pinnedFiles: Set<string> = new Set();

  getRecentFiles(limit?: number): RecentFile[] {
    const files: RecentFile[] = systemIntegration.getRecentFiles();
    const sorted = files.sort((a: RecentFile, b: RecentFile) => 
      new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()
    );
    return limit ? sorted.slice(0, limit) : sorted;
  }

  async getPinnedFiles(): Promise<RecentFile[]> {
    const files = await this.getRecentFiles();
    return files.filter(f => this.pinnedFiles.has(f.path));
  }

  async pinFile(filePath: string): Promise<void> {
    this.pinnedFiles.add(filePath);
    await storageService.setItem('aibos-pinned-files', [...this.pinnedFiles]);
  }

  async unpinFile(filePath: string): Promise<void> {
    this.pinnedFiles.delete(filePath);
    await storageService.setItem('aibos-pinned-files', [...this.pinnedFiles]);
  }

  async clearRecentFiles(): Promise<void> {
    await storageService.setItem('aibos-recent-files', []);
  }

  private async loadPinnedFiles(): Promise<void> {
    try {
      const pinned = await storageService.getItem<string[]>('aibos-pinned-files') || [];
      this.pinnedFiles = new Set(pinned);
    } catch {
      this.pinnedFiles = new Set();
    }
  }

  constructor() {
    this.loadPinnedFiles();
  }
}

export const recentFilesManager = new RecentFilesManagerService();