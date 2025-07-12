/**
 * Simple and efficient event bus for decoupled communication
 */
export type Listener<T = any> = (data: T, event: string) => void;

export interface EventBusOptions {
  /** Enable error handling for listeners */
  enableErrorHandling?: boolean;
  /** Maximum number of listeners per event */
  maxListeners?: number;
}

export class EventBus {
  private listeners: Map<string, Listener[]> = new Map();
  private readonly enableErrorHandling: boolean;
  private readonly maxListeners: number;

  constructor(options: EventBusOptions = {}) {
    this.enableErrorHandling = options.enableErrorHandling ?? true;
    this.maxListeners = options.maxListeners ?? 10;
  }

  /**
   * Register a listener for an event
   */
  on<T = any>(event: string, listener: Listener<T>): void {
    if (!event || typeof event !== 'string') {
      throw new Error('Event name must be a non-empty string');
    }

    if (typeof listener !== 'function') {
      throw new Error('Listener must be a function');
    }

    const existing = this.listeners.get(event) || [];
    
    // Check max listeners limit
    if (existing.length >= this.maxListeners) {
      console.warn(`EventBus: Max listeners (${this.maxListeners}) exceeded for event '${event}'`);
    }

    if (!existing.includes(listener)) {
      existing.push(listener);
      this.listeners.set(event, existing);
    }
  }

  /**
   * Register a one-time listener for an event
   */
  once<T = any>(event: string, listener: Listener<T>): void {
    const wrapper: Listener<T> = (data, eventName) => {
      listener(data, eventName);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  /**
   * Remove a listener from an event
   */
  off(event: string, listener: Listener): void {
    if (!event || typeof event !== 'string') {
      return;
    }

    const listeners = this.listeners.get(event);
    if (listeners) {
      const filtered = listeners.filter((l) => l !== listener);
      if (filtered.length === 0) {
        this.listeners.delete(event);
      } else {
        this.listeners.set(event, filtered);
      }
    }
  }

  /**
   * Remove all listeners for an event
   */
  offAll(event: string): void {
    if (!event || typeof event !== 'string') {
      return;
    }
    this.listeners.delete(event);
  }

  /**
   * Emit an event with data
   */
  emit<T = any>(event: string, data?: T): void {
    if (!event || typeof event !== 'string') {
      return;
    }

    const listeners = this.listeners.get(event);
    if (!listeners || listeners.length === 0) {
      return;
    }

    // Create a copy to avoid issues if listeners modify the array during execution
    const listenersCopy = [...listeners];

    for (const listener of listenersCopy) {
      try {
        listener(data, event);
      } catch (error) {
        if (this.enableErrorHandling) {
          console.error(`EventBus: Error in listener for event '${event}':`, error);
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount(event: string): number {
    if (!event || typeof event !== 'string') {
      return 0;
    }
    return this.listeners.get(event)?.length || 0;
  }

  /**
   * Get all registered event names
   */
  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Check if an event has any listeners
   */
  hasListeners(event: string): boolean {
    return this.listenerCount(event) > 0;
  }

  /**
   * Clear all listeners and events
   */
  clear(): void {
    this.listeners.clear();
  }

  /**
   * Get event bus statistics
   */
  getStats(): { totalEvents: number; totalListeners: number; events: Record<string, number> } {
    const events: Record<string, number> = {};
    let totalListeners = 0;

    for (const [event, listeners] of this.listeners.entries()) {
      events[event] = listeners.length;
      totalListeners += listeners.length;
    }

    return {
      totalEvents: this.listeners.size,
      totalListeners,
      events
    };
  }
}
