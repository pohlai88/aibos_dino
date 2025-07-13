// systemIntegration.ts

import { SystemService } from './system';
import { FileSystemService } from './filesystem';
import { ClipboardService } from './clipboard';
import { UIService } from './ui';
import { FileAssociationService } from './file-system/associations';
import { ContextMenuService } from './context-menu/context-menu-service';

import type { SystemInfo, SystemCapabilities, PowerState } from './system';
import type { Logger } from './core/logger';

/**
 * Enterprise-grade SystemIntegrationService
 * Orchestrates all system-level operations through specialized services
 */
class SystemIntegrationService {
  private systemService: SystemService;
  private fileSystemService: FileSystemService;
  private clipboardService: ClipboardService;
  private uiService: UIService;
  private fileAssociationService: FileAssociationService;
  private contextMenuService: ContextMenuService;

  constructor(private logger: Logger) {
    // Inject logger into all services for consistent enterprise logging
    this.systemService = new SystemService(this.logger);
    this.fileSystemService = new FileSystemService(this.logger);
    this.clipboardService = new ClipboardService(this.logger);
    this.uiService = new UIService(this.logger);

    this.fileAssociationService = new FileAssociationService(this.logger);
    this.contextMenuService = new ContextMenuService(this.logger);
  }

  /**
   * Initialize all integrated services
   */
  async initialize(): Promise<void> {
    await Promise.all([
      this.systemService.initialize(),
      this.fileSystemService.initialize(),
      this.clipboardService.initialize(),
      this.uiService.initialize(),
      this.fileAssociationService.initialize(),
      this.contextMenuService.initialize()
    ]);
    this.logger.info('SystemIntegrationService initialized successfully', {
      component: 'SystemIntegrationService',
      action: 'initialize'
    });
  }

  /**
   * System Info delegation
   */
  getSystemInfo(): SystemInfo {
    return this.systemService.getSystemInfo();
  }

  getCapabilities(): SystemCapabilities {
    return this.systemService.getCapabilities();
  }

  getPowerState(): PowerState | null {
    return this.systemService.getPowerState();
  }

  /**
   * File System delegation
   */
  async openFilePicker(): Promise<FileSystemFileHandle[]> {
    return this.fileSystemService.openFilePicker();
  }

  async saveFilePicker(): Promise<FileSystemFileHandle> {
    return this.fileSystemService.saveFilePicker();
  }

  async openDirectoryPicker(): Promise<FileSystemDirectoryHandle | null> {
    return this.fileSystemService.openDirectoryPicker();
  }

  async readDirectory(dirHandle: FileSystemDirectoryHandle): Promise<any[]> {
    return this.fileSystemService.readDirectory(dirHandle);
  }

  /**
   * Clipboard delegation
   */
  async readClipboard(): Promise<string> {
    return this.clipboardService.read();
  }

  async writeClipboard(text: string): Promise<void> {
    return this.clipboardService.write(text);
  }

  /**
   * UI / Context Menu delegation
   */
  registerContextMenu(id: string, config: any): void {
    this.uiService.registerContextMenu(id, config);
  }

  showContextMenu(config: any): Promise<void> {
    return this.contextMenuService.showContextMenu(config);
  }

  /**
   * File Associations delegation
   */
  getFileAssociations(): any {
    return this.fileAssociationService.getRegisteredAssociations();
  }

  unregisterFileAssociations(): Promise<void> {
    return this.fileAssociationService.unregisterFileAssociations();
  }

  getServiceWorkerScript(): string {
    return this.fileAssociationService.getServiceWorkerScript();
  }

  /**
   * Destroy all services
   */
  destroy(): void {
    this.systemService.destroy();
    this.fileSystemService.destroy();
    this.clipboardService.destroy();
    this.uiService.destroy();
    this.logger.info('SystemIntegrationService destroyed', {
      component: 'SystemIntegrationService',
      action: 'destroy'
    });
  }
}

export { SystemIntegrationService };
export type { SystemInfo, SystemCapabilities, PowerState };
export type { LogContext, Logger } from './core/logger';
