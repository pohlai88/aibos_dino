// systemIntegration.ts - Enterprise-grade facade
import { SystemService } from './system';
import { FileSystemService } from './filesystem';
import { ClipboardService } from './clipboard';
import { UIService } from './ui';
import type { SystemInfo, SystemCapabilities, PowerState } from './system';

/**
 * Enterprise SystemIntegrationService
 * Orchestrates all system-level operations through specialized services
 */
class SystemIntegrationService {
  private systemService: SystemService;
  private fileSystemService: FileSystemService;
  private clipboardService: ClipboardService;
  private uiService: UIService;

  constructor() {
    this.systemService = new SystemService();
    this.fileSystemService = new FileSystemService();
    this.clipboardService = new ClipboardService();
    this.uiService = new UIService();
  }

  async initialize(): Promise<void> {
    await Promise.all([
      this.systemService.initialize(),
      this.fileSystemService.initialize(),
      this.clipboardService.initialize(),
      this.uiService.initialize()
    ]);
  }

  // System delegation
  getSystemInfo(): SystemInfo {
    return this.systemService.getSystemInfo();
  }

  getCapabilities(): SystemCapabilities {
    return this.systemService.getCapabilities();
  }

  getPowerState(): PowerState | null {
    return this.systemService.getPowerState();
  }

  // File system delegation
  async openFilePicker(): Promise<FileSystemFileHandle[]> {
    return this.fileSystemService.openFilePicker();
  }

  async saveFilePicker(): Promise<FileSystemFileHandle> {
    return this.fileSystemService.saveFilePicker();
  }

  // Clipboard delegation
  async readClipboard(): Promise<string> {
    return this.clipboardService.read();
  }

  async writeClipboard(text: string): Promise<void> {
    return this.clipboardService.write(text);
  }

  // UI delegation
  registerContextMenu(id: string, config: any): void {
    this.uiService.registerContextMenu(id, config);
  }

  destroy(): void {
    this.systemService.destroy();
    this.fileSystemService.destroy();
    this.clipboardService.destroy();
    this.uiService.destroy();
  }
}

export const systemIntegration = new SystemIntegrationService();
export type { SystemInfo, SystemCapabilities, PowerState };
export type { LogContext, Logger } from './core/logger';
