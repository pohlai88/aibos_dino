// System Integration Service for AI-BOS
// Provides integration with OS-level features and system APIs

export interface SystemInfo {
  platform: string;
  version: string;
  architecture: string;
  memory: {
    total: number;
    available: number;
    used: number;
  };
  cpu: {
    cores: number;
    usage: number;
    temperature?: number;
  };
  storage: {
    total: number;
    available: number;
    used: number;
  };
  network: {
    status: 'online' | 'offline' | 'slow';
    speed?: number;
    type?: string;
  };
  battery?: {
    level: number;
    charging: boolean;
    timeRemaining?: number;
  };
}

export interface SystemCapabilities {
  notifications: boolean;
  fileSystem: boolean;
  clipboard: boolean;
  powerManagement: boolean;
  networkAccess: boolean;
  audio: boolean;
  video: boolean;
  sensors: boolean;
}

export interface PowerState {
  isCharging: boolean;
  batteryLevel: number;
  timeRemaining?: number;
  powerMode: 'performance' | 'balanced' | 'power-saver';
}

class SystemIntegrationService {
  private capabilities: SystemCapabilities;
  private systemInfo: SystemInfo;
  private isInitialized = false;
  private updateInterval?: number;

  constructor() {
    this.capabilities = this.detectCapabilities();
    this.systemInfo = this.getDefaultSystemInfo();
  }

  private detectCapabilities(): SystemCapabilities {
    return {
      notifications: 'Notification' in window,
      fileSystem: 'showDirectoryPicker' in window || 'showOpenFilePicker' in window,
      clipboard: 'clipboard' in navigator,
      powerManagement: 'getBattery' in navigator,
      networkAccess: 'navigator' in window,
      audio: 'AudioContext' in window || 'webkitAudioContext' in window,
      video: 'getUserMedia' in navigator,
      sensors: 'DeviceOrientationEvent' in window || 'DeviceMotionEvent' in window,
    };
  }

  private getDefaultSystemInfo(): SystemInfo {
    return {
      platform: navigator.platform || 'unknown',
      version: navigator.userAgent || 'unknown',
      architecture: navigator.platform.includes('64') ? 'x64' : 'x86',
      memory: {
        total: 0,
        available: 0,
        used: 0,
      },
      cpu: {
        cores: navigator.hardwareConcurrency || 1,
        usage: 0,
      },
      storage: {
        total: 0,
        available: 0,
        used: 0,
      },
      network: {
        status: navigator.onLine ? 'online' : 'offline',
      },
    };
  }

  // Initialize system integration
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Request necessary permissions
      await this.requestPermissions();
      
      // Start monitoring system resources
      this.startMonitoring();
      
      // Initialize power management
      await this.initializePowerManagement();
      
      this.isInitialized = true;
      console.log('System Integration Service initialized');
    } catch (error) {
      console.error('Failed to initialize System Integration Service:', error);
      throw error;
    }
  }

  // Request system permissions
  private async requestPermissions(): Promise<void> {
    const permissions = [];

    if (this.capabilities.notifications) {
      permissions.push(Notification.requestPermission());
    }

    if (this.capabilities.clipboard) {
      permissions.push(navigator.permissions.query({ name: 'clipboard-read' as PermissionName }));
    }

    if (this.capabilities.fileSystem) {
      permissions.push(navigator.permissions.query({ name: 'persistent-storage' as PermissionName }));
    }

    await Promise.allSettled(permissions);
  }

  // Start system monitoring
  private startMonitoring(): void {
    // Update system info every 5 seconds
    this.updateInterval = window.setInterval(() => {
      this.updateSystemInfo();
    }, 5000);

    // Initial update
    this.updateSystemInfo();

    // Monitor network status
    window.addEventListener('online', () => {
      this.systemInfo.network.status = 'online';
    });

    window.addEventListener('offline', () => {
      this.systemInfo.network.status = 'offline';
    });
  }

  // Update system information
  private async updateSystemInfo(): Promise<void> {
    try {
      // Update memory info if available
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.systemInfo.memory = {
          total: memory.jsHeapSizeLimit,
          available: memory.jsHeapSizeLimit - memory.usedJSHeapSize,
          used: memory.usedJSHeapSize,
        };
      }

      // Update battery info if available
      if (this.capabilities.powerManagement) {
        const battery = await navigator.getBattery();
        if (battery) {
          this.systemInfo.battery = {
            level: battery.level * 100,
            charging: battery.charging,
            timeRemaining: battery.dischargingTime > 0 ? battery.dischargingTime / 1000 : undefined,
          };
        }
      }

      // Estimate CPU usage (simplified)
      this.systemInfo.cpu.usage = this.estimateCPUUsage();
    } catch (error) {
      console.warn('Failed to update system info:', error);
    }
  }

  // Estimate CPU usage (simplified implementation)
  private estimateCPUUsage(): number {
    // This is a simplified estimation
    // In a real implementation, you'd use more sophisticated methods
    const load = performance.now() % 100;
    return Math.min(load, 100);
  }

  // Initialize power management
  private async initializePowerManagement(): Promise<void> {
    if (!this.capabilities.powerManagement) return;

    try {
      const battery = await navigator.getBattery();
      if (battery) {
        battery.addEventListener('levelchange', () => {
          this.updateSystemInfo();
        });

        battery.addEventListener('chargingchange', () => {
          this.updateSystemInfo();
        });
      }
    } catch (error) {
      console.warn('Failed to initialize power management:', error);
    }
  }

  // Public API methods

  // Get current system information
  getSystemInfo(): SystemInfo {
    return { ...this.systemInfo };
  }

  // Get system capabilities
  getCapabilities(): SystemCapabilities {
    return { ...this.capabilities };
  }

  // Get power state
  async getPowerState(): Promise<PowerState> {
    if (!this.capabilities.powerManagement) {
      return {
        isCharging: false,
        batteryLevel: 100,
        powerMode: 'balanced',
      };
    }

    try {
      const battery = await navigator.getBattery();
      return {
        isCharging: battery.charging,
        batteryLevel: battery.level * 100,
        timeRemaining: battery.dischargingTime > 0 ? battery.dischargingTime / 1000 : undefined,
        powerMode: this.getPowerMode(),
      };
    } catch (error) {
      console.warn('Failed to get power state:', error);
      return {
        isCharging: false,
        batteryLevel: 100,
        powerMode: 'balanced',
      };
    }
  }

  // Get current power mode
  private getPowerMode(): 'performance' | 'balanced' | 'power-saver' {
    // This would integrate with OS power management
    // For now, return balanced
    return 'balanced';
  }

  // Set power mode
  async setPowerMode(mode: 'performance' | 'balanced' | 'power-saver'): Promise<void> {
    // This would integrate with OS power management
    console.log(`Setting power mode to: ${mode}`);
  }

  // Get network information
  async getNetworkInfo(): Promise<{ status: string; speed?: number; type?: string }> {
    if (!navigator.onLine) {
      return { status: 'offline' };
    }

    try {
      // Check connection type if available
      const connection = (navigator as any).connection;
      if (connection) {
        return {
          status: 'online',
          speed: connection.downlink,
          type: connection.effectiveType,
        };
      }

      return { status: 'online' };
    } catch (error) {
      return { status: 'online' };
    }
  }

  // Get storage information
  async getStorageInfo(): Promise<{ total: number; available: number; used: number }> {
    try {
      if ('storage' in navigator && 'estimate' in (navigator as any).storage) {
        const estimate = await (navigator as any).storage.estimate();
        return {
          total: estimate.quota || 0,
          available: (estimate.quota || 0) - (estimate.usage || 0),
          used: estimate.usage || 0,
        };
      }

      // Fallback to system info
      return this.systemInfo.storage;
    } catch (error) {
      console.warn('Failed to get storage info:', error);
      return this.systemInfo.storage;
    }
  }

  // Clipboard operations
  async readClipboard(): Promise<string> {
    if (!this.capabilities.clipboard) {
      throw new Error('Clipboard API not available');
    }

    try {
      return await navigator.clipboard.readText();
    } catch (error) {
      console.warn('Failed to read clipboard:', error);
      throw error;
    }
  }

  async writeClipboard(text: string): Promise<void> {
    if (!this.capabilities.clipboard) {
      throw new Error('Clipboard API not available');
    }

    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.warn('Failed to write to clipboard:', error);
      throw error;
    }
  }

  // File system operations
  async openFilePicker(options?: {
    multiple?: boolean;
    types?: string[];
  }): Promise<File[]> {
    if (!this.capabilities.fileSystem) {
      throw new Error('File System API not available');
    }

    try {
      const opts: any = {};
      if (options?.multiple) opts.multiple = true;
      if (options?.types) {
        opts.types = options.types.map(type => ({
          description: type,
          accept: { [type]: [`.${type}`] }
        }));
      }

      const files = await window.showOpenFilePicker(opts);
      return files;
    } catch (error) {
      console.warn('Failed to open file picker:', error);
      throw error;
    }
  }

  async saveFilePicker(options?: {
    suggestedName?: string;
    types?: string[];
  }): Promise<FileSystemFileHandle | null> {
    if (!this.capabilities.fileSystem) {
      throw new Error('File System API not available');
    }

    try {
      const opts: any = {};
      if (options?.suggestedName) opts.suggestedName = options.suggestedName;
      if (options?.types) {
        opts.types = options.types.map(type => ({
          description: type,
          accept: { [type]: [`.${type}`] }
        }));
      }

      return await window.showSaveFilePicker(opts);
    } catch (error) {
      console.warn('Failed to open save file picker:', error);
      throw error;
    }
  }

  // Audio operations
  async playAudio(url: string, options?: { volume?: number; loop?: boolean }): Promise<void> {
    if (!this.capabilities.audio) {
      throw new Error('Audio API not available');
    }

    try {
      const audio = new Audio(url);
      if (options?.volume !== undefined) audio.volume = options.volume;
      if (options?.loop) audio.loop = true;
      await audio.play();
    } catch (error) {
      console.warn('Failed to play audio:', error);
      throw error;
    }
  }

  // System commands
  async executeSystemCommand(command: string): Promise<{ success: boolean; output?: string; error?: string }> {
    // This would integrate with system shell commands
    // For security reasons, this is limited in web environments
    console.log(`System command requested: ${command}`);
    
    return {
      success: false,
      error: 'System commands not available in web environment',
    };
  }

  // Cleanup
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.isInitialized = false;
  }
}

export const systemIntegration = new SystemIntegrationService();
export type { SystemInfo, SystemCapabilities, PowerState }; 