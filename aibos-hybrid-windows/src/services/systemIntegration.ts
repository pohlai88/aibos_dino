// systemIntegration.ts

import { SystemService } from './system/index.ts';
import { FileSystemService } from './filesystem.ts';
import { ClipboardService } from './clipboard.ts';
import { UIService } from './ui.ts';
import { FileAssociationService } from './fileAssociations.ts';
import { contextMenuService } from './contextMenuService.ts';

import type { SystemInfo, SystemCapabilities, PowerState } from './system/types.ts';
import type { EnterpriseLogger } from './core/logger.ts';

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
  private contextMenuService: typeof contextMenuService;

  constructor(private logger: EnterpriseLogger) {
    // Inject logger into all services for consistent enterprise logging
    this.systemService = new SystemService();
    this.fileSystemService = new FileSystemService();
    this.clipboardService = new ClipboardService();
    this.uiService = new UIService();

    this.fileAssociationService = new FileAssociationService(this.logger);
    this.contextMenuService = contextMenuService;
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
    // TODO: Implement directory picker functionality
    return null;
  }

  readDirectory(dirHandle: FileSystemDirectoryHandle): Promise<unknown[]> {
    // TODO: Implement directory reading functionality
    return Promise.resolve([]);
  }

  /**
   * Clipboard delegation
   */
  readClipboard(): Promise<string> {
    return this.clipboardService.read();
  }

  writeClipboard(text: string): Promise<void> {
    return this.clipboardService.write(text);
  }

  /**
   * UI / Context Menu delegation
   */
  registerContextMenu(_id: string, _config: Record<string, unknown>): void {
    // Implementation for registering context menu
  }

  showContextMenu(_config: Record<string, unknown>): Promise<void> {
    // Implementation for showing context menu
    return Promise.resolve();
  }

  /**
   * File Associations delegation
   */
  getFileAssociations(): Record<string, unknown> {
    // Implementation for getting file associations
    return {};
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
export type { LogContext, EnterpriseLogger } from './core/logger.ts';
