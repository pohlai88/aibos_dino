import { EnterpriseLogger } from './core/logger.ts';

export class ClipboardService {
  private logger: EnterpriseLogger;

  constructor() {
    this.logger = new EnterpriseLogger();
  }

  initialize(): void {
    this.logger.info('ClipboardService initialized', {
      component: 'ClipboardService',
      action: 'initialize'
    });
  }

  async read(): Promise<string> {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        return await navigator.clipboard.readText();
      }
      throw new Error('Clipboard API not supported');
    } catch (error) {
      this.logger.error('Clipboard read failed', {
        component: 'ClipboardService',
        action: 'read',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  async write(text: string): Promise<void> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('Clipboard API not supported');
      }
    } catch (error) {
      this.logger.error('Clipboard write failed', {
        component: 'ClipboardService',
        action: 'write',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  destroy(): void {
    this.logger.info('ClipboardService destroyed', {
      component: 'ClipboardService',
      action: 'destroy'
    });
  }
}