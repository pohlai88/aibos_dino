export interface BatteryInfo {
  level: number;
  charging: boolean;
  timeRemaining?: number;
}

export interface NetworkInfo {
  status: 'online' | 'offline' | 'slow';
  speed?: number;
  type?: string;
}

export interface RecentFileInfo {
  path: string;
  name: string;
  lastAccessed: string;
  size: number;
  type: string;
}

export type SystemEvents = {
  'battery:updated': BatteryInfo;
  'network:changed': NetworkInfo;
  'file:recent-added': RecentFileInfo;
  'memory:updated': { total: number; available: number; used: number };
  'storage:updated': { total: number; available: number; used: number };
};

class TypedEventEmitter<T extends Record<string, any>> {
  private listeners: Map<keyof T, Set<(data: any) => void>> = new Map();

  on<K extends keyof T>(event: K, handler: (data: T[K]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${String(event)}:`, error);
        }
      });
    }
  }

  off<K extends keyof T>(event: K, handler?: (data: T[K]) => void): void {
    if (!handler) {
      this.listeners.delete(event);
    } else {
      this.listeners.get(event)?.delete(handler);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const systemEvents = new TypedEventEmitter<SystemEvents>();