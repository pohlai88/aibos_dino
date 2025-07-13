/**
 * MonitorManager Service
 * Enterprise-grade multi-monitor detection and management for AI-BOS
 * - Detects available monitors (Deno/browser fallback)
 * - Provides monitor info (bounds, DPI, orientation)
 * - Emits events on monitor changes (hot-plug)
 * - Supports window-to-monitor assignment
 */

// Monitor info type
export interface MonitorInfo {
  id: string;
  bounds: { x: number; y: number; width: number; height: number };
  dpi: number; // Physical pixels per inch (e.g., 96, 120, 144)
  scaleFactor: number; // Logical UI scaling factor (e.g., 1.0, 1.25, 2.0)
  isPrimary: boolean;
  orientation: 'landscape' | 'portrait';
  name?: string;
}

// Extended Screen interface for multi-monitor support
interface ExtendedScreen {
  left?: number;
  top?: number;
  width: number;
  height: number;
  devicePixelRatio?: number;
  isPrimary?: boolean;
  label?: string;
  orientation?: ScreenOrientation;
  availWidth?: number;
  availHeight?: number;
}

// Window assignment type
export interface WindowMonitorAssignment {
  windowId: string;
  monitorId: string;
}

// Event types
export type MonitorEvent = 'monitorsChanged' | 'monitorAssigned' | 'primaryMonitorChanged' | 'monitorOrientationChanged';

// MonitorManager class
class MonitorManager {
  private monitors: MonitorInfo[] = [];
  private assignments: Map<string, string> = new Map(); // windowId -> monitorId
  private listeners: Map<MonitorEvent, Set<(...args: unknown[]) => void>> = new Map();
  private isInitialized = false;
  private detecting = false; // Prevent concurrent detection calls
  private lastPrimaryMonitorId: string | null = null; // Track primary monitor changes

  private static ASSIGNMENTS_KEY = 'aibos-monitor-assignments';
  private static NAMES_KEY = 'aibos-monitor-names';
  private monitorNames: Map<string, string> = new Map();

  constructor() {
    this.restoreAssignments();
    this.restoreMonitorNames();
    this.initialize();
  }

  /**
   * Initialize monitor detection
   */
  async initialize(): Promise<void> {
    await this.detectMonitors();
    this.setupHotPlugListener();
    this.isInitialized = true;
  }

  /**
   * Wait for initialization to complete
   */
  async ready(): Promise<void> {
    if (!this.isInitialized) {
      await new Promise<void>((resolve) => {
        const checkReady = () => {
          if (this.isInitialized) {
            resolve();
          } else {
            setTimeout(checkReady, 10);
          }
        };
        checkReady();
      });
    }
  }

  /**
   * Detect available monitors (Deno, browser fallback)
   */
  async detectMonitors(): Promise<void> {
    // Prevent concurrent detection calls
    if (this.detecting) return;
    this.detecting = true;

    try {
      // Deno: TODO - use Deno APIs if available
      // Browser: use window.screen and window.getScreenDetails (if available)
      if (typeof window !== 'undefined' && 'getScreenDetails' in window) {
        // Experimental: Multi-Screen Window Placement API
        const details = await (globalThis as typeof globalThis & { getScreenDetails?: () => Promise<{ screens: Screen[] }> }).getScreenDetails?.();
        
        if (details?.screens) {
          this.monitors = details.screens.map((screen: ExtendedScreen, _idx: number) => {
            const baseInfo = {
              id: this.generateMonitorId(screen),
              bounds: {
                x: screen.left ?? 0,
                y: screen.top ?? 0,
                width: screen.width,
                height: screen.height,
              },
              dpi: this.getPhysicalDPI(screen),
              scaleFactor: screen.devicePixelRatio || globalThis.devicePixelRatio || 1,
              isPrimary: screen.isPrimary ?? false,
              orientation: this.detectOrientation(screen),
            };
            
            return screen.label 
              ? { ...baseInfo, name: screen.label } as MonitorInfo
              : baseInfo as MonitorInfo;
          });
        }
      } else if (typeof window !== 'undefined' && globalThis.screen) {
        // Fallback: single screen
        const screen: ExtendedScreen = {
          width: globalThis.screen.width,
          height: globalThis.screen.height,
          devicePixelRatio: globalThis.devicePixelRatio,
          isPrimary: true,
          label: 'Primary Display',
        };
        
        const baseInfo = {
          id: this.generateMonitorId(screen),
          bounds: {
            x: 0,
            y: 0,
            width: screen.width,
            height: screen.height,
          },
          dpi: this.getPhysicalDPI(screen),
          scaleFactor: screen.devicePixelRatio || 1,
          isPrimary: true,
          orientation: this.detectOrientation(screen),
        };
        
        const monitorInfo = screen.label 
          ? { ...baseInfo, name: screen.label } as MonitorInfo
          : baseInfo as MonitorInfo;
        
        this.monitors = [monitorInfo];
      } else {
        // Deno/Node: TODO - implement using Deno APIs if/when available
        this.monitors = [{
          id: 'primary-0-0-1920x1080',
          bounds: { x: 0, y: 0, width: 1920, height: 1080 },
          dpi: 96, // Standard DPI
          scaleFactor: 1,
          isPrimary: true,
          orientation: 'landscape',
          name: 'Default',
        }];
      }

      // Clean up stale window assignments to non-existent monitors
      this.cleanupStaleAssignments();

      // Check for primary monitor changes
      const newPrimary = this.getPrimaryMonitor();
      if (this.lastPrimaryMonitorId !== null && this.lastPrimaryMonitorId !== newPrimary.id) {
        this.emit('primaryMonitorChanged', newPrimary);
      }
      this.lastPrimaryMonitorId = newPrimary.id;

      this.emit('monitorsChanged', this.getMonitors());
    } catch (error) {
      console.warn('Failed to detect monitors:', error);
      // Fallback to default monitor
      this.monitors = [{
        id: 'fallback-0-0-1920x1080',
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
        dpi: 96,
        scaleFactor: 1,
        isPrimary: true,
        orientation: 'landscape',
        name: 'Fallback Display',
      }];
      this.emit('monitorsChanged', this.getMonitors());
    } finally {
      this.detecting = false;
    }
  }

  /**
   * Generate unique monitor ID based on bounds
   */
  private generateMonitorId(screen: ExtendedScreen): string {
    return `monitor-${screen.width}x${screen.height}-${Date.now()}`;
  }

  /**
   * Get physical DPI (separate from scale factor)
   */
  private getPhysicalDPI(screen: ExtendedScreen): number {
    // Try to get actual physical DPI if available
    if (screen.devicePixelRatio && screen.width && screen.height) {
      // Estimate based on common DPI values and screen size
      const diagonalPixels = Math.sqrt(screen.width * screen.width + screen.height * screen.height);
      const diagonalInches = diagonalPixels / (screen.devicePixelRatio * 96); // Assume 96 DPI base
      return Math.round(diagonalPixels / diagonalInches);
    }
    return 96; // Standard DPI fallback
  }

  /**
   * Detect screen orientation with fallback
   */
  private detectOrientation(screen: ExtendedScreen): 'landscape' | 'portrait' {
    // Try modern API first
    if (screen.orientation?.type?.includes('portrait')) {
      return 'portrait';
    }
    if (screen.orientation?.type?.includes('landscape')) {
      return 'landscape';
    }
    
    // Fallback to ratio-based detection with square monitor handling
    const width = screen.width;
    const height = screen.height;
    return height === width ? 'landscape' : (height > width ? 'portrait' : 'landscape');
  }

  /**
   * Clean up stale window assignments to non-existent monitors
   */
  private cleanupStaleAssignments(): void {
    const validMonitorIds = new Set(this.monitors.map(m => m.id));
    let changed = false;
    for (const [windowId, monitorId] of this.assignments.entries()) {
      if (!validMonitorIds.has(monitorId)) {
        this.assignments.delete(windowId);
        changed = true;
        console.warn(`Removed stale window assignment: window ${windowId} was assigned to non-existent monitor ${monitorId}`);
      }
    }
    if (changed) this.saveAssignments();
  }

  /**
   * Save assignments to localStorage
   */
  private saveAssignments(): void {
    if (typeof window !== 'undefined' && globalThis.localStorage) {
      const obj: Record<string, string> = {};
      for (const [win, mon] of this.assignments.entries()) {
        obj[win] = mon;
      }
      globalThis.localStorage.setItem(MonitorManager.ASSIGNMENTS_KEY, JSON.stringify(obj));
    }
  }

  /**
   * Restore assignments from localStorage
   */
  private restoreAssignments(): void {
    if (typeof window !== 'undefined' && globalThis.localStorage) {
      const raw = globalThis.localStorage.getItem(MonitorManager.ASSIGNMENTS_KEY);
      if (raw) {
        try {
          const obj = JSON.parse(raw);
          this.assignments = new Map(Object.entries(obj));
        } catch {
          this.assignments = new Map();
        }
      }
    }
  }

  /**
   * Save monitor names to localStorage
   */
  private saveMonitorNames(): void {
    if (typeof window !== 'undefined' && globalThis.localStorage) {
      const obj: Record<string, string> = {};
      for (const [id, name] of this.monitorNames.entries()) {
        obj[id] = name;
      }
      globalThis.localStorage.setItem(MonitorManager.NAMES_KEY, JSON.stringify(obj));
    }
  }

  /**
   * Restore monitor names from localStorage
   */
  private restoreMonitorNames(): void {
    if (typeof window !== 'undefined' && globalThis.localStorage) {
      const raw = globalThis.localStorage.getItem(MonitorManager.NAMES_KEY);
      if (raw) {
        try {
          const obj = JSON.parse(raw);
          this.monitorNames = new Map(Object.entries(obj));
        } catch {
          this.monitorNames = new Map();
        }
      }
    }
  }

  /**
   * Set a custom name for a monitor
   */
  setMonitorName(monitorId: string, name: string): void {
    this.monitorNames.set(monitorId, name);
    this.saveMonitorNames();
  }

  /**
   * Get a custom name for a monitor
   */
  getMonitorName(monitorId: string): string | undefined {
    return this.monitorNames.get(monitorId);
  }

  /**
   * Listen for monitor hot-plug events (browser only)
   */
  private setupHotPlugListener(): void {
    if (typeof window !== 'undefined' && globalThis.addEventListener) {
      // Use addEventListener instead of overwriting onscreenchange
      globalThis.addEventListener('screenschange', () => {
        this.detectMonitors();
      });
    }
  }

  /**
   * Get all monitors (immutable copy, with custom names)
   */
  getMonitors(): MonitorInfo[] {
    return this.monitors.map(m => {
      const customName = this.getMonitorName(m.id);
      const finalName = customName || m.name;
      
      return finalName 
        ? { ...m, name: finalName } as MonitorInfo
        : { ...m } as MonitorInfo;
    });
  }

  /**
   * Get primary monitor (immutable copy)
   */
  getPrimaryMonitor(): MonitorInfo {
    const primary = this.monitors.find(m => m.isPrimary) || this.monitors[0];
    return primary ? { ...primary } : {
      id: 'fallback',
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      dpi: 96,
      scaleFactor: 1,
      isPrimary: true,
      orientation: 'landscape',
      name: 'Fallback',
    };
  }

  /**
   * Get a specific monitor by ID (with custom name)
   */
  getMonitor(monitorId: string): MonitorInfo | null {
    const monitor = this.monitors.find(m => m.id === monitorId);
    if (!monitor) return null;
    
    const customName = this.getMonitorName(monitor.id);
    const finalName = customName || monitor.name;
    
    return finalName 
      ? { ...monitor, name: finalName } as MonitorInfo
      : { ...monitor } as MonitorInfo;
  }

  /**
   * Set a monitor as primary
   */
  setPrimaryMonitor(monitorId: string): void {
    const monitor = this.monitors.find(m => m.id === monitorId);
    if (!monitor) return;

    // Update all monitors to set isPrimary to false
    this.monitors.forEach(m => m.isPrimary = false);
    
    // Set the selected monitor as primary
    monitor.isPrimary = true;
    
    // Emit event
    this.emit('primaryMonitorChanged', monitor);
  }

  /**
   * Assign a window to a monitor
   */
  assignWindowToMonitor(windowId: string, monitorId: string): void {
    this.assignments.set(windowId, monitorId);
    this.saveAssignments();
    this.emit('monitorAssigned', { windowId, monitorId });
  }

  /**
   * Unassign a window from its monitor
   */
  unassignWindow(windowId: string): void {
    this.assignments.delete(windowId);
    this.saveAssignments();
  }

  /**
   * Get monitor for a window
   */
  getMonitorForWindow(windowId: string, fallback = true): MonitorInfo | null {
    const monitorId = this.assignments.get(windowId);
    if (!monitorId) {
      return fallback ? { ...this.getPrimaryMonitor() } : null;
    }
    const monitor = this.monitors.find(m => m.id === monitorId);
    return monitor ? { ...monitor } : (fallback ? { ...this.getPrimaryMonitor() } : null);
  }

  /**
   * Event subscription
   */
  on(event: MonitorEvent, listener: (...args: unknown[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }
  off(event: MonitorEvent, listener: (...args: unknown[]) => void): void {
    this.listeners.get(event)?.delete(listener);
  }

  /**
   * Remove all listeners for an event or all events
   */
  offAll(event?: MonitorEvent): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  private emit(event: MonitorEvent, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach(fn => fn(...args));
  }
}

// Export singleton
export const monitorManager = new MonitorManager(); 