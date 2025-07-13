import { EnterpriseLogger } from './core/logger';

export class FileSystemService {
  private logger: EnterpriseLogger;

  constructor() {
    this.logger = new EnterpriseLogger();
  }

  async initialize(): Promise<void> {
    this.logger.info('FileSystemService initialized', {
      component: 'FileSystemService',
      action: 'initialize'
    });
  }

  async openFilePicker(): Promise<FileSystemFileHandle[]> {
    try {
      if ('showOpenFilePicker' in window) {
        return await (window as any).showOpenFilePicker();
      }
      throw new Error('File System Access API not supported');
    } catch (error) {
      this.logger.error('File picker failed', {
        component: 'FileSystemService',
        action: 'openFilePicker',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  async saveFilePicker(): Promise<FileSystemFileHandle> {
    try {
      if ('showSaveFilePicker' in window) {
        return await (window as any).showSaveFilePicker();
      }
      throw new Error('File System Access API not supported');
    } catch (error) {
      this.logger.error('Save picker failed', {
        component: 'FileSystemService',
        action: 'saveFilePicker',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  destroy(): void {
    this.logger.info('FileSystemService destroyed', {
      component: 'FileSystemService',
      action: 'destroy'
    });
  }
}