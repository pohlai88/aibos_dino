// systemIntegration.ts

import { SystemService } from './system/index.ts';
import { FileSystemService } from './filesystem.ts';
import { ClipboardService } from './clipboard.ts';
import { UIService } from './ui.ts';
import { FileAssociationService } from './fileAssociations.ts';
import { contextMenuService } from './contextMenuService.ts';

import type { SystemInfo, SystemCapabilities, PowerState } from './system/types.ts';
import { EnterpriseLogger } from './core/logger.ts';
import type { RecentFile } from './recentFilesManager.ts';

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
  openFilePicker(): Promise<FileSystemFileHandle[]> {
    return this.fileSystemService.openFilePicker();
  }

  saveFilePicker(): Promise<FileSystemFileHandle> {
    return this.fileSystemService.saveFilePicker();
  }

  openDirectoryPicker(): Promise<FileSystemDirectoryHandle | null> {
    // TODO: Implement directory picker functionality
    return Promise.resolve(null);
  }

  readDirectory(_dirHandle: FileSystemDirectoryHandle): Promise<unknown[]> {
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
   * Window management methods
   */
  restoreWindow(id: string): void {
    this.logger.info('Restore window', { component: 'SystemIntegrationService', action: 'restoreWindow', metadata: { windowId: id } });
  }

  minimizeWindow(id: string): void {
    this.logger.info('Minimize window', { component: 'SystemIntegrationService', action: 'minimizeWindow', metadata: { windowId: id } });
  }

  maximizeWindow(id: string): void {
    this.logger.info('Maximize window', { component: 'SystemIntegrationService', action: 'maximizeWindow', metadata: { windowId: id } });
  }

  closeWindow(id: string): void {
    this.logger.info('Close window', { component: 'SystemIntegrationService', action: 'closeWindow', metadata: { windowId: id } });
  }

  /**
   * File operations
   */
  openFile(path: string): Promise<void> {
    this.logger.info('Open file', { component: 'SystemIntegrationService', action: 'openFile', metadata: { path } });
    return Promise.resolve();
  }

  openApp(appId: string, options: Record<string, unknown>): Promise<void> {
    this.logger.info('Open app', { component: 'SystemIntegrationService', action: 'openApp', metadata: { appId, options } });
    return Promise.resolve();
  }

  showAppChooser(path: string): Promise<void> {
    this.logger.info('Show app chooser', { component: 'SystemIntegrationService', action: 'showAppChooser', metadata: { path } });
    return Promise.resolve();
  }

  copyToClipboard(path: string): Promise<void> {
    this.logger.info('Copy to clipboard', { component: 'SystemIntegrationService', action: 'copyToClipboard', metadata: { path } });
    return Promise.resolve();
  }

  cutToClipboard(path: string): Promise<void> {
    this.logger.info('Cut to clipboard', { component: 'SystemIntegrationService', action: 'cutToClipboard', metadata: { path } });
    return Promise.resolve();
  }

  pasteFromClipboard(target: string): Promise<void> {
    this.logger.info('Paste from clipboard', { component: 'SystemIntegrationService', action: 'pasteFromClipboard', metadata: { target } });
    return Promise.resolve();
  }

  hasClipboardContent(): boolean {
    return true; // TODO: Implement actual clipboard check
  }

  renameFile(path: string): Promise<void> {
    this.logger.info('Rename file', { component: 'SystemIntegrationService', action: 'renameFile', metadata: { path } });
    return Promise.resolve();
  }

  deleteFile(path: string): Promise<void> {
    this.logger.info('Delete file', { component: 'SystemIntegrationService', action: 'deleteFile', metadata: { path } });
    return Promise.resolve();
  }

  showFileProperties(path: string): Promise<void> {
    this.logger.info('Show file properties', { component: 'SystemIntegrationService', action: 'showFileProperties', metadata: { path } });
    return Promise.resolve();
  }

  openTerminal(path: string): Promise<void> {
    this.logger.info('Open terminal', { component: 'SystemIntegrationService', action: 'openTerminal', metadata: { path } });
    return Promise.resolve();
  }

  createNewFolder(): Promise<void> {
    this.logger.info('Create new folder', { component: 'SystemIntegrationService', action: 'createNewFolder' });
    return Promise.resolve();
  }

  createNewFile(extension: string): Promise<void> {
    this.logger.info('Create new file', { component: 'SystemIntegrationService', action: 'createNewFile', metadata: { extension } });
    return Promise.resolve();
  }

  pasteToDesktop(): Promise<void> {
    this.logger.info('Paste to desktop', { component: 'SystemIntegrationService', action: 'pasteToDesktop' });
    return Promise.resolve();
  }

  refreshDesktop(): Promise<void> {
    this.logger.info('Refresh desktop', { component: 'SystemIntegrationService', action: 'refreshDesktop' });
    return Promise.resolve();
  }

  showDesktopProperties(): Promise<void> {
    this.logger.info('Show desktop properties', { component: 'SystemIntegrationService', action: 'showDesktopProperties' });
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
    this.fileAssociationService.unregisterFileAssociations();
    return Promise.resolve();
  }

  getServiceWorkerScript(): string {
    return this.fileAssociationService.getServiceWorkerScript();
  }

  /**
   * Returns a list of recent files (stub implementation)
   */
  getRecentFiles(): RecentFile[] {
    // TODO: Implement real recent files logic
    return [];
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

// Create a default instance with the EnterpriseLogger
const systemIntegration = new SystemIntegrationService(new EnterpriseLogger());

export { SystemIntegrationService, systemIntegration };
export type { SystemInfo, SystemCapabilities, PowerState };
export type { LogContext, EnterpriseLogger } from './core/logger.ts';
