import { EnterpriseLogger } from './core/logger';

export class UIService {
  private logger: EnterpriseLogger;
  private contextMenuBatch: Record<string, any> = {};
  private contextMenuBatchTimer?: number;

  constructor() {
    this.logger = new EnterpriseLogger();
  }

  async initialize(): Promise<void> {
    this.logger.info('UIService initialized', {
      component: 'UIService',
      action: 'initialize'
    });
  }

  registerContextMenu(id: string, config: any): void {
    this.contextMenuBatch[id] = config;
    
    if (this.contextMenuBatchTimer) {
      clearTimeout(this.contextMenuBatchTimer);
    }
    
    this.contextMenuBatchTimer = window.setTimeout(() => {
      this.flushContextMenuBatch();
    }, 100);
  }

  private flushContextMenuBatch(): void {
    const entries = Object.entries(this.contextMenuBatch);
    if (entries.length > 0) {
      this.logger.info('Context menu batch processed', {
        component: 'UIService',
        action: 'flushContextMenuBatch',
        metadata: { count: entries.length }
      });
      this.contextMenuBatch = {};
    }
  }

  destroy(): void {
    if (this.contextMenuBatchTimer) {
      clearTimeout(this.contextMenuBatchTimer);
    }
    this.logger.info('UIService destroyed', {
      component: 'UIService',
      action: 'destroy'
    });
  }
}