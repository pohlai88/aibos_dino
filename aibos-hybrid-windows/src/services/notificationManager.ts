// System Notification Manager for AI-BOS
// Provides native notification integration and management

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  icon?: string;
  timestamp: number;
  duration?: number;
  actions?: NotificationAction[];
  isRead: boolean;
  isPersistent: boolean;
}

export interface NotificationAction {
  id: string;
  label: string;
  action: () => void;
}

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  desktop: boolean;
  duration: number;
  maxNotifications: number;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

class NotificationManager {
  private notifications: Map<string, Notification> = new Map();
  private settings: NotificationSettings;
  private isInitialized = false;
  private audioContext?: AudioContext;

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): NotificationSettings {
    if (typeof window === 'undefined') {
      return {
        enabled: true,
        sound: true,
        desktop: true,
        duration: 5000,
        maxNotifications: 10,
        position: 'top-right'
      };
    }

    const saved = localStorage.getItem('aibos-notification-settings');
    if (saved) {
      try {
        return { ...JSON.parse(saved) };
      } catch {
        // Fallback to defaults
      }
    }

    return {
      enabled: true,
      sound: true,
      desktop: true,
      duration: 5000,
      maxNotifications: 10,
      position: 'top-right'
    };
  }

  private saveSettings(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('aibos-notification-settings', JSON.stringify(this.settings));
    }
  }

  // Core notification methods
  show(notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): string {
    if (!this.settings.enabled) return '';

    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const fullNotification: Notification = {
      ...notification,
      id,
      timestamp: Date.now(),
      isRead: false
    };

    this.notifications.set(id, fullNotification);
    this.cleanupOldNotifications();
    this.playNotificationSound();
    this.showDesktopNotification(fullNotification);

    // Auto-remove after duration
    if (fullNotification.duration && !fullNotification.isPersistent) {
      setTimeout(() => this.remove(id), fullNotification.duration);
    }

    return id;
  }

  remove(id: string): boolean {
    return this.notifications.delete(id);
  }

  markAsRead(id: string): boolean {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.isRead = true;
      return true;
    }
    return false;
  }

  clearAll(): void {
    this.notifications.clear();
  }

  getNotifications(): Notification[] {
    return Array.from(this.notifications.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  getUnreadCount(): number {
    return Array.from(this.notifications.values()).filter(n => !n.isRead).length;
  }

  // Desktop notifications
  private async showDesktopNotification(notification: Notification): Promise<void> {
    if (!this.settings.desktop || typeof window === 'undefined') return;

    if ('Notification' in window && Notification.permission === 'granted') {
      const desktopNotif = new Notification(notification.title, {
        body: notification.message,
        icon: notification.icon || '/favicon.ico',
        tag: notification.id,
        requireInteraction: notification.isPersistent
      });

      // Handle notification click
      desktopNotif.onclick = () => {
        this.markAsRead(notification.id);
        window.focus();
      };

      // Auto-close
      if (!notification.isPersistent) {
        setTimeout(() => desktopNotif.close(), this.settings.duration);
      }
    }
  }

  // Request notification permission
  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return Notification.permission === 'granted';
  }

  // Sound notifications
  private playNotificationSound(): void {
    if (!this.settings.sound) return;

    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.2);
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }

  // Utility methods
  private cleanupOldNotifications(): void {
    const notifications = Array.from(this.notifications.values());
    if (notifications.length > this.settings.maxNotifications) {
      const toRemove = notifications
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(0, notifications.length - this.settings.maxNotifications);
      
      toRemove.forEach(n => this.remove(n.id));
    }
  }

  // Settings management
  updateSettings(newSettings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }

  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  // Convenience methods
  info(title: string, message: string, options?: Partial<Notification>): string {
    return this.show({ title, message, type: 'info', ...options });
  }

  success(title: string, message: string, options?: Partial<Notification>): string {
    return this.show({ title, message, type: 'success', ...options });
  }

  warning(title: string, message: string, options?: Partial<Notification>): string {
    return this.show({ title, message, type: 'warning', ...options });
  }

  error(title: string, message: string, options?: Partial<Notification>): string {
    return this.show({ title, message, type: 'error', ...options });
  }

  // System notifications
  systemUpdate(): string {
    return this.info('System Update', 'AIBOS has been updated to the latest version', {
      icon: '🔄',
      isPersistent: false
    });
  }

  windowGroupCreated(name: string): string {
    return this.success('Window Group Created', `Group "${name}" has been created successfully`, {
      icon: '📑',
      isPersistent: false
    });
  }

  layoutApplied(name: string): string {
    return this.success('Layout Applied', `Layout "${name}" has been applied to your windows`, {
      icon: '🔲',
      isPersistent: false
    });
  }

  performanceMode(enabled: boolean): string {
    return this.info(
      'Performance Mode',
      `Performance mode has been ${enabled ? 'enabled' : 'disabled'}`,
      { icon: enabled ? '⚡' : '🐌', isPersistent: false }
    );
  }

  initialize(): void {
    if (this.isInitialized) return;
    
    this.requestPermission();
    this.isInitialized = true;
    console.log('Notification Manager initialized');
  }
}

export const notificationManager = new NotificationManager();
export type { Notification, NotificationAction, NotificationSettings }; 