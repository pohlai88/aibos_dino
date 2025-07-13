// System Tray Manager for AI-BOS
export interface TrayItem {
  id: string;
  title: string;
  icon: string;
  windowId: string;
  isMinimized: boolean;
  timestamp: number;
}

export interface TrayMenu {
  id: string;
  title: string;
  action: () => void;
  icon?: string;
  shortcut?: string;
}

class SystemTrayManager {
  private trayItems: Map<string, TrayItem> = new Map();
  private isVisible = false;
  private listeners: Set<(items: TrayItem[]) => void> = new Set();

  // Add window to tray
  addToTray(windowId: string, title: string, icon: string): void {
    const item: TrayItem = {
      id: `tray-${windowId}`,
      title,
      icon,
      windowId,
      isMinimized: true,
      timestamp: Date.now()
    };
    this.trayItems.set(windowId, item);
    this.notifyListeners();
  }

  // Remove from tray
  removeFromTray(windowId: string): void {
    this.trayItems.delete(windowId);
    this.notifyListeners();
  }

  // Restore window from tray
  restoreFromTray(windowId: string): void {
    const item = this.trayItems.get(windowId);
    if (item) {
      item.isMinimized = false;
      this.trayItems.delete(windowId);
      this.notifyListeners();
      // Trigger window restore event
      window.dispatchEvent(new CustomEvent('restore-window', { detail: { windowId } }));
    }
  }

  // Get all tray items
  getTrayItems(): TrayItem[] {
    return Array.from(this.trayItems.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  // Get tray menu items
  getTrayMenu(): TrayMenu[] {
    const items: TrayMenu[] = [];
    
    // Add tray items
    this.trayItems.forEach(item => {
      items.push({
        id: item.id,
        title: item.title,
        icon: item.icon,
        action: () => this.restoreFromTray(item.windowId)
      });
    });

    // Add system actions
    if (this.trayItems.size > 0) {
      items.push({ id: 'separator', title: '', action: () => {} });
      items.push({
        id: 'restore-all',
        title: 'Restore All Windows',
        icon: '🔄',
        action: () => this.restoreAllWindows()
      });
    }

    items.push({ id: 'separator2', title: '', action: () => {} });
    items.push({
      id: 'show-desktop',
      title: 'Show Desktop',
      icon: '🖥️',
      shortcut: 'Win+D',
      action: () => this.showDesktop()
    });
    items.push({
      id: 'task-manager',
      title: 'Task Manager',
      icon: '⚙️',
      shortcut: 'Ctrl+Shift+Esc',
      action: () => this.openTaskManager()
    });

    return items;
  }

  // Restore all windows
  restoreAllWindows(): void {
    const windowIds = Array.from(this.trayItems.keys());
    windowIds.forEach(id => this.restoreFromTray(id));
  }

  // Show desktop
  showDesktop(): void {
    window.dispatchEvent(new CustomEvent('show-desktop'));
  }

  // Open task manager
  openTaskManager(): void {
    window.dispatchEvent(new CustomEvent('open-task-manager'));
  }

  // Subscribe to tray changes
  subscribe(callback: (items: TrayItem[]) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    const items = this.getTrayItems();
    this.listeners.forEach(callback => callback(items));
  }
}

export const systemTrayManager = new SystemTrayManager(); 