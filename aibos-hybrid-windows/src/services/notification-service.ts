/**
 * Enterprise-Grade Notification Service
 * Supports multiple notification channels, priority queuing, and analytics
 */

import { EventEmitter } from 'events';
import { z } from 'https://esm.sh/zod@3.22.4';

// 🔥 ENHANCEMENT: Strongly typed event system
type NotificationEvents = {
  'notification:queued': { notification: Notification };
  'notification:delivered': { notification: Notification; channel: NotificationChannel };
  'notification:clicked': { notification: Notification };
  'notification:dismissed': { notification: Notification; reason: string };
  'notification:updated': { notification: Notification };
  'notification:failed': { notification: Notification; error: string; channel: NotificationChannel };
  'notifications:all-read': void;
  'notification:error': {
    message: string;
    context: string;
    notificationId?: string;
    timestamp: string;
    stack?: string;
  };
};

// Enterprise notification schema with strict validation
const NotificationSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  type: z.enum(['info', 'success', 'warning', 'error', 'system']),
  priority: z.enum(['low', 'normal', 'high', 'critical']),
  category: z.string().optional(),
  actions: z.array(z.object({
    id: z.string(),
    label: z.string(),
    action: z.function(),
    style: z.enum(['primary', 'secondary', 'danger']).optional()
  })).optional(),
  metadata: z.record(z.unknown()).optional(),
  expiresAt: z.date().optional(),
  persistent: z.boolean().default(false),
  sound: z.string().optional(),
  icon: z.string().optional(),
  image: z.string().optional(),
  badge: z.string().optional(),
  tag: z.string().optional(),
  requireInteraction: z.boolean().default(false),
  silent: z.boolean().default(false)
});

export type Notification = z.infer<typeof NotificationSchema>;

// Enterprise notification channels
export enum NotificationChannel {
  BROWSER = 'browser',
  SYSTEM = 'system',
  TOAST = 'toast',
  BANNER = 'banner',
  EMAIL = 'email',
  SMS = 'sms',
  WEBHOOK = 'webhook'
}

// Enterprise notification analytics
interface NotificationAnalytics {
  sent: number;
  delivered: number;
  clicked: number;
  dismissed: number;
  expired: number;
  failed: number;
  averageDisplayTime: number;
  clickThroughRate: number;
  categoryBreakdown: Record<string, number>;
  hourlyDistribution: Record<string, number>;
}

// Enterprise notification preferences
interface NotificationPreferences {
  channels: Record<NotificationChannel, boolean>;
  categories: Record<string, {
    enabled: boolean;
    priority: 'low' | 'normal' | 'high' | 'critical';
    sound: boolean;
    channels: NotificationChannel[];
  }>;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  doNotDisturb: boolean;
  maxNotifications: number;
  groupSimilar: boolean;
  showPreviews: boolean;
}

interface NotificationServiceConfig {
  queueProcessingInterval?: number;
  cleanupInterval?: number;
  maxRetries?: number;
  rateLimitCount?: number;
  rateLimitWindow?: number;
}

// 🔥 ENHANCEMENT: Channel sender abstraction for dependency injection
interface ChannelSender {
  send(notification: Notification): Promise<boolean>;
}

class EmailChannelSender implements ChannelSender {
  send(notification: Notification): Promise<boolean> {
    // AWS SES implementation placeholder
    console.log(`[EMAIL] Sending: ${notification.title}`);
    return Promise.resolve(true);
  }
}

class SMSChannelSender implements ChannelSender {
  send(notification: Notification): Promise<boolean> {
    // Twilio implementation placeholder
    console.log(`[SMS] Sending: ${notification.title}`);
    return Promise.resolve(true);
  }
}

class WebhookChannelSender implements ChannelSender {
  send(notification: Notification): Promise<boolean> {
    // HTTP POST implementation placeholder
    console.log(`[WEBHOOK] Sending: ${notification.title}`);
    return Promise.resolve(true);
  }
}

export class EnterpriseNotificationService extends EventEmitter {
  private config: Required<NotificationServiceConfig>;
  private notifications: Notification[] = [];
  private queue: Notification[] = [];
  private analytics: NotificationAnalytics;
  private preferences: NotificationPreferences;
  private recentNotifications: { timestamp: number; id: string }[] = [];
  private channelSenders: Map<NotificationChannel, ChannelSender>;
  
  constructor(config: NotificationServiceConfig = {}) {
    super();
    this.config = {
      queueProcessingInterval: 100,
      cleanupInterval: 5 * 60 * 1000,
      maxRetries: 3,
      rateLimitCount: 10,
      rateLimitWindow: 60000,
      ...config
    };
    
    // Initialize analytics
    this.analytics = {
      sent: 0,
      delivered: 0,
      clicked: 0,
      dismissed: 0,
      expired: 0,
      failed: 0,
      averageDisplayTime: 0,
      clickThroughRate: 0,
      categoryBreakdown: {},
      hourlyDistribution: {}
    };
    
    // Initialize default preferences
    this.preferences = {
      channels: {
        [NotificationChannel.BROWSER]: true,
        [NotificationChannel.SYSTEM]: true,
        [NotificationChannel.TOAST]: true,
        [NotificationChannel.BANNER]: true,
        [NotificationChannel.EMAIL]: false,
        [NotificationChannel.SMS]: false,
        [NotificationChannel.WEBHOOK]: false
      },
      categories: {},
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: 'UTC'
      },
      doNotDisturb: false,
      maxNotifications: 50,
      groupSimilar: true,
      showPreviews: true
    };
    
    // Initialize channel senders
    this.channelSenders = new Map([
      [NotificationChannel.EMAIL, new EmailChannelSender()],
      [NotificationChannel.SMS, new SMSChannelSender()],
      [NotificationChannel.WEBHOOK, new WebhookChannelSender()]
    ]);
    
    // Start processing intervals
    setInterval(() => this.processQueue(), this.config.queueProcessingInterval);
    setInterval(() => this.cleanup(), this.config.cleanupInterval);
  }
  
  // 🔥 ENHANCEMENT: Type-safe event emission
  private emitTyped<K extends keyof NotificationEvents>(
    event: K,
    data: NotificationEvents[K]
  ): void {
    super.emit(event, data);
  }
  
  // Core notification methods
  send(
    notification: Omit<Notification, 'id'>,
    channels: NotificationChannel[] = [NotificationChannel.BROWSER]
  ): Promise<string> {
    try {
      const id = crypto.randomUUID();
      const fullNotification = { ...notification, id };
      
      // Validate notification
      const validatedNotification = NotificationSchema.parse(fullNotification);
      
      // Check rate limiting
      if (!this.checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }
      
      // Check if should send based on preferences
      if (!this.shouldSend(validatedNotification, channels)) {
        return Promise.resolve(id);
      }
      
      // Add to queue
      this.addToQueue(validatedNotification);
      
      // Emit queued event
      this.emitTyped('notification:queued', { notification: validatedNotification });
      
      return Promise.resolve(id);
    } catch (error) {
      this.handleError(error as Error, 'send', notification as Notification);
      throw error;
    }
  }
  
  private addToQueue(notification: Notification): void {
    const priorityOrder = { low: 0, normal: 1, high: 2, critical: 3 };
    const insertIndex = this.queue.findIndex(
      n => priorityOrder[notification.priority] > priorityOrder[n.priority]
    );
    
    if (insertIndex === -1) {
      this.queue.push(notification);
    } else {
      this.queue.splice(insertIndex, 0, notification);
    }
  }
  
  private processQueue(): void {
    if (this.queue.length === 0) return;
    
    const notification = this.queue.shift();
    if (!notification) return;
    
    // Send to default channels
    this.sendToChannels(notification, [NotificationChannel.BROWSER]);
  }
  
  private async sendToChannels(
    notification: Notification,
    channels: NotificationChannel[]
  ): Promise<void> {
    const enabledChannels = channels.filter(channel => 
      this.preferences.channels[channel]
    );
    
    const results = await Promise.allSettled(
      enabledChannels.map(channel => this.sendToChannel(notification, channel))
    );
    
    results.forEach((result, index) => {
      const channel = enabledChannels[index];
      if (channel) { // Ensure channel is defined
        if (result.status === 'fulfilled' && result.value) {
          this.analytics.delivered++;
          this.emitTyped('notification:delivered', { notification, channel: channel as NotificationChannel });
        } else {
          this.analytics.failed++;
          const error = result.status === 'rejected' ? result.reason.message : 'Unknown error';
          this.emitTyped('notification:failed', { notification, error, channel: channel as NotificationChannel });
        }
      }
    });
  }
  
  private async sendToChannel(
    notification: Notification,
    channel: NotificationChannel
  ): Promise<boolean> {
    try {
      let success = false;
      
      switch (channel) {
        case NotificationChannel.BROWSER: {
          success = this.sendBrowserNotification(notification);
          break;
        }
        case NotificationChannel.SYSTEM: {
          success = await this.sendSystemNotification(notification);
          break;
        }
        case NotificationChannel.TOAST: {
          success = await this.sendToastNotification(notification);
          break;
        }
        case NotificationChannel.BANNER: {
          success = await this.sendBannerNotification(notification);
          break;
        }
        default: {
          const sender = this.channelSenders.get(channel);
          if (sender) {
            success = await sender.send(notification);
          }
          break;
        }
      }
      
      if (success) {
        this.emitTyped('notification:delivered', { notification, channel });
      } else {
        this.emitTyped('notification:failed', { notification, error: 'Channel failed', channel });
      }
      
      return success;
    } catch (error) {
      this.emitTyped('notification:failed', { 
        notification, 
        error: error instanceof Error ? error.message : 'Unknown error',
        channel 
      });
      return false;
    }
  }

  // Channel implementations
  private sendBrowserNotification(notification: Notification): boolean {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    
    if (Notification.permission === 'granted') {
      const options: NotificationOptions = {
        body: notification.message,
        requireInteraction: notification.requireInteraction,
        silent: notification.silent,
      };
      
      if (notification.icon) options.icon = notification.icon;
      if (notification.badge) options.badge = notification.badge;
      if (notification.tag) options.tag = notification.tag;
      if (notification.metadata) options.data = notification.metadata;
      
      const browserNotification = new Notification(notification.title, options);
      
      // Add click handler
      browserNotification.onclick = () => {
        this.emitTyped('notification:clicked', { notification });
      };
      
      return true;
    }
    
    return false;
  }

  private sendSystemNotification(notification: Notification): Promise<boolean> {
    // System notification implementation
    console.log(`[SYSTEM] ${notification.title}: ${notification.message}`);
    return Promise.resolve(true);
  }

  private sendToastNotification(notification: Notification): Promise<boolean> {
    // Toast notification implementation
    console.log(`[TOAST] ${notification.title}: ${notification.message}`);
    return Promise.resolve(true);
  }

  private sendBannerNotification(notification: Notification): Promise<boolean> {
    // Banner notification implementation
    console.log(`[BANNER] ${notification.title}: ${notification.message}`);
    return Promise.resolve(true);
  }
  
  // Utility methods
  private checkRateLimit(): boolean {
    const now = Date.now();
    this.recentNotifications = this.recentNotifications.filter(
      n => now - n.timestamp < this.config.rateLimitWindow
    );
    
    const priorityWeights = {
      low: 1,
      normal: 2,
      high: 3,
      critical: 4
    };
    
    const totalWeight = this.recentNotifications.reduce((sum, n) => {
      const notification = this.notifications.find(notif => notif.id === n.id);
      const priority = notification?.priority || 'normal';
      return sum + (priorityWeights[priority as keyof typeof priorityWeights] || 1);
    }, 0);
    
    return totalWeight <= this.config.rateLimitCount;
  }
  
  private shouldSend(notification: Notification, _channels: NotificationChannel[]): boolean {
    // Check Do Not Disturb
    if (this.preferences.doNotDisturb) {
      return notification.priority === 'critical';
    }
    
    // Check quiet hours
    if (this.preferences.quietHours.enabled) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const { start, end } = this.preferences.quietHours;
      
      if (start <= end) {
        if (currentTime >= start && currentTime <= end) {
          return notification.priority === 'critical';
        }
      } else {
        if (currentTime >= start || currentTime <= end) {
          return notification.priority === 'critical';
        }
      }
    }
    
    return true;
  }
  
  private cleanup(): void {
    const now = new Date();
    const expiredNotifications = this.notifications.filter(
      n => n.expiresAt && n.expiresAt < now
    );
    
    expiredNotifications.forEach(notification => {
      this.analytics.expired++;
      this.emitTyped('notification:dismissed', { notification, reason: 'expired' });
    });
    
    this.notifications = this.notifications.filter(
      n => !n.expiresAt || n.expiresAt >= now
    );
  }
  
  // 🔥 ENHANCEMENT: Methods moved inside class
  getUnreadCount(): number {
    return this.notifications.filter(n => !(n as Record<string, unknown>)['read']).length;
  }
  
  markAsRead(id: string): boolean {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      (notification as Record<string, unknown>)['read'] = true;
      return true;
    }
    return false;
  }
  
  markAllAsRead(): void {
    this.notifications.forEach(n => {
      (n as Record<string, unknown>)['read'] = true;
    });
    this.emitTyped('notifications:all-read', undefined);
  }
  
  dismiss(id: string, reason: string = 'user'): boolean {
    const notification = this.notifications.find(n => n.id === id);
    if (!notification) return false;
    
    // Remove from notifications
    this.notifications = this.notifications.filter(n => n.id !== id);
    
    // Emit dismissed event
    this.emitTyped('notification:dismissed', { notification, reason });
    
    return true;
  }
  
  getHistory(options: { limit?: number; category?: string } = {}): Notification[] {
    let filtered = this.notifications;
    
    if (options.category) {
      filtered = filtered.filter(n => n.category === options.category);
    }
    
    return filtered.slice(0, options.limit || 50);
  }
  
  getAnalytics(): NotificationAnalytics {
    return { ...this.analytics };
  }
  
  exportData(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['id', 'title', 'message', 'type', 'priority', 'category', 'timestamp'];
      const rows = this.notifications.map(n => [
        n.id,
        n.title,
        n.message,
        n.type,
        n.priority,
        n.category || '',
        n.metadata?.['createdAt'] || ''
      ]);
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    
    return JSON.stringify({
      notifications: this.notifications,
      analytics: this.analytics,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }
  
  // 🔥 ENHANCEMENT: Centralized error handling
  private handleError(error: Error, context: string, notification?: Notification): void {
    const errorData: NotificationEvents['notification:error'] = {
      message: error.message,
      context,
      timestamp: new Date().toISOString(),
    };
    
    if (notification?.id) {
      errorData.notificationId = notification.id;
    }
    
    if (error.stack) {
      errorData.stack = error.stack;
    }
    
    this.emitTyped('notification:error', errorData);
  }
}

// Singleton instance for global access
export const notificationService = new EnterpriseNotificationService();