/**
 * Enterprise-Grade Notification Service
 * Supports multiple notification channels, priority queuing, and analytics
 */

import { EventEmitter } from 'events';
import { z } from 'zod';

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
  async send(notification: Notification): Promise<boolean> {
    // AWS SES implementation placeholder
    console.log(`[EMAIL] Sending: ${notification.title}`);
    return true;
  }
}

class SMSChannelSender implements ChannelSender {
  async send(notification: Notification): Promise<boolean> {
    // Twilio implementation placeholder
    console.log(`[SMS] Sending: ${notification.title}`);
    return true;
  }
}

class WebhookChannelSender implements ChannelSender {
  async send(notification: Notification): Promise<boolean> {
    // HTTP POST implementation placeholder
    console.log(`[WEBHOOK] Sending: ${notification.title}`);
    return true;
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
    this.emit(event, data);
  }
  
  // Core notification methods
  async send(
    notification: Omit<Notification, 'id'>,
    channels: NotificationChannel[] = [NotificationChannel.BROWSER]
  ): Promise<string> {
    try {
      // Validate notification
      const validatedNotification = NotificationSchema.parse({
        ...notification,
        id: crypto.randomUUID()
      });
      
      // Check rate limiting
      if (!this.checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }
      
      // Check user preferences
      if (!this.shouldSend(validatedNotification, channels)) {
        return validatedNotification.id;
      }
      
      // Add to queue
      this.addToQueue(validatedNotification);
      this.emitTyped('notification:queued', { notification: validatedNotification });
      
      // Send to channels
      await this.sendToChannels(validatedNotification, channels);
      
      return validatedNotification.id;
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
  
  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) return;
    
    const notification = this.queue.shift()!;
    this.notifications.unshift(notification);
    
    // Limit stored notifications
    if (this.notifications.length > this.preferences.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.preferences.maxNotifications);
    }
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
      if (result.status === 'fulfilled' && result.value) {
        this.analytics.delivered++;
        this.emitTyped('notification:delivered', { notification, channel });
      } else {
        this.analytics.failed++;
        const error = result.status === 'rejected' ? result.reason.message : 'Unknown error';
        this.emitTyped('notification:failed', { notification, error, channel });
      }
    });
  }
  
  private async sendToChannel(
    notification: Notification,
    channel: NotificationChannel
  ): Promise<boolean> {
    try {
      switch (channel) {
        case NotificationChannel.BROWSER:
          return await this.sendBrowserNotification(notification);
        case NotificationChannel.SYSTEM:
          return await this.sendSystemNotification(notification);
        case NotificationChannel.TOAST:
          return await this.sendToastNotification(notification);
        case NotificationChannel.BANNER:
          return await this.sendBannerNotification(notification);
        case NotificationChannel.EMAIL:
        case NotificationChannel.SMS:
        case NotificationChannel.WEBHOOK:
          const sender = this.channelSenders.get(channel);
          return sender ? await sender.send(notification) : false;
        default:
          return false;
      }
    } catch (error) {
      this.handleError(error as Error, `sendToChannel:${channel}`, notification);
      return false;
    }
  }
  
  // Channel implementations
  private async sendBrowserNotification(notification: Notification): Promise<boolean> {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: notification.icon,
        badge: notification.badge,
        image: notification.image,
        silent: notification.silent,
        requireInteraction: notification.requireInteraction
      });
      return true;
    }
    return false;
  }
  
  private async sendSystemNotification(notification: Notification): Promise<boolean> {
    // System notification implementation
    console.log(`[SYSTEM] ${notification.title}: ${notification.message}`);
    return true;
  }
  
  private async sendToastNotification(notification: Notification): Promise<boolean> {
    // Toast notification implementation
    console.log(`[TOAST] ${notification.title}: ${notification.message}`);
    return true;
  }
  
  private async sendBannerNotification(notification: Notification): Promise<boolean> {
    // Banner notification implementation
    console.log(`[BANNER] ${notification.title}: ${notification.message}`);
    return true;
  }
  
  // Utility methods
  private checkRateLimit(): boolean {
    const now = Date.now();
    this.recentNotifications = this.recentNotifications.filter(
      n => now - n.timestamp < this.config.rateLimitWindow
    );
    
    if (this.recentNotifications.length >= this.config.rateLimitCount) {
      return false;
    }
    
    this.recentNotifications.push({ timestamp: now, id: crypto.randomUUID() });
    return true;
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
    return this.notifications.filter(n => !n.metadata?.read).length;
  }
  
  markAsRead(id: string): boolean {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      if (!notification.metadata) {
        notification.metadata = {};
      }
      notification.metadata.read = true;
      this.emitTyped('notification:updated', { notification });
      return true;
    }
    return false;
  }
  
  markAllAsRead(): void {
    this.notifications.forEach(n => {
      if (!n.metadata) {
        n.metadata = {};
      }
      n.metadata.read = true;
    });
    this.emitTyped('notifications:all-read', undefined);
  }
  
  async dismiss(id: string, reason: string = 'user'): Promise<boolean> {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      const notification = this.notifications[index];
      this.notifications.splice(index, 1);
      this.analytics.dismissed++;
      this.emitTyped('notification:dismissed', { notification, reason });
      return true;
    }
    return false;
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
        n.metadata?.createdAt || ''
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
    const errorData = {
      message: error.message,
      context,
      notificationId: notification?.id,
      timestamp: new Date().toISOString(),
      stack: error.stack
    };
    
    // Ready for Sentry/Datadog integration
    console.error('[NotificationService]', errorData);
    
    this.emitTyped('notification:error', errorData);
  }
}

// Singleton instance for global access
export const notificationService = new EnterpriseNotificationService();