/// <reference lib="deno.ns" />

import { supabase } from '../../modules/supabase-client.ts';
import { EnterpriseLogger } from './core/logger.ts';
import { ApiResponse } from '../../modules/types.ts';
import { queryOptimizer } from './query-optimizer.ts';
import { SearchProvider, SearchResult } from '../types/search.ts';
import { createSearchResult } from './searchRegistry.ts';
import { systemIntegration } from './systemIntegration.ts';
// REMOVED: import { logWarn, logError, logSuccess, logInfo } from '../../modules/logging.ts';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  website_url?: string;
  contact_email?: string;
  status: 'active' | 'suspended' | 'pending' | 'cancelled';
  plan_type: 'free' | 'basic' | 'pro' | 'enterprise';
  max_users: number;
  max_storage_gb: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface TenantMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions: Record<string, JsonValue>;
  joined_at: string;
  invited_by?: string;
}

export interface App {
  id: string;
  name: string;
  slug: string;
  description?: string;
  long_description?: string;
  version: string;
  author_id?: string;
  category_id?: string;
  icon_url?: string;
  screenshots: string[];
  download_url?: string;
  repository_url?: string;
  website_url?: string;
  price: number;
  is_free: boolean;
  is_featured: boolean;
  is_verified: boolean;
  status: 'draft' | 'published' | 'archived' | 'rejected';
  downloads_count: number;
  rating_average: number;
  rating_count: number;
  tags: string[];
  requirements: Record<string, JsonValue>;
  metadata: Record<string, JsonValue>;
  created_at: string;
  updated_at: string;
}

export interface AppInstallation {
  id: string;
  tenant_id: string;
  app_id: string;
  version_id?: string;
  installed_by?: string;
  status: 'installing' | 'installed' | 'failed' | 'uninstalled';
  config: Record<string, JsonValue>;
  permissions: Record<string, JsonValue>;
  installed_at: string;
  updated_at: string;
}

export interface AppIntegration {
  id: string;
  app_id: string;
  tenant_id: string;
  integration_type: 'api' | 'webhook' | 'database' | 'file_system' | 'auth' | 'storage';
  config: Record<string, JsonValue>;
  credentials: Record<string, JsonValue>;
  status: 'active' | 'inactive' | 'error';
  last_sync_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  tenant_id: string;
  user_id: string;
  app_id?: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  data: Record<string, JsonValue>;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface AppCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  sort_order?: number;
  is_active: boolean;
}

export interface TenantApp {
  app_id: string;
  app_name: string;
  app_slug: string;
  app_description: string | null;
  app_icon: string | null;
  app_version: string | null;
  installation_status: string | null;
  installed_at: string | null;
}

// JSON-safe value type for flexible metadata/config fields
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

// Subscription payload types
export interface TenantChangePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Tenant | null;
  old: Tenant | null;
}

export interface AppInstallationPayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: AppInstallation | null;
  old: AppInstallation | null;
}

export interface NotificationPayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Notification | null;
  old: Notification | null;
}

// AIBOS Platform Service Class
export class AIBOSPlatformService {
  private logger = new EnterpriseLogger();
  // Helper method to create consistent API responses
  private createApiResponse<T>(success: boolean, data?: T, error?: string): ApiResponse<T> {
    return {
      success,
      data,
      error,
      timestamp: new Date()
    };
  }

  // ============================================================================
  // TENANT MANAGEMENT
  // ============================================================================

  // Get current user
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      this.logger.error(`Failed to get current user: ${error.message}`, { component: 'AibosPlatform', action: 'getCurrentUser' });
      throw error;
    }
    return user;
  }

  // Create a new tenant
  async createTenant(name: string, slug: string, description?: string): Promise<ApiResponse<Tenant>> {
    try {
      const { data, error } = await supabase
        .rpc('create_tenant', { p_name: name, p_slug: slug, p_description: description });

      if (error) {
        this.logger.error(`Tenant creation failed: ${error.message}`, { component: 'AibosPlatform', action: 'createTenant' });
        return {
          success: false,
          error: error.message,
          timestamp: new Date()
        };
      }

      this.logger.info(`Tenant created successfully: ${name}`, { component: 'AibosPlatform', action: 'createTenant' });
      return {
        success: true,
        data: data,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error(`Unexpected error in createTenant: ${error instanceof Error ? error.message : String(error)}`, { component: 'AibosPlatform', action: 'createTenant' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  // Get user's tenants
  async getUserTenants(page: number = 0, limit: number = 50): Promise<ApiResponse<Tenant[]>> {
    try {
      const from = page * limit;
      const to = from + limit - 1;

      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        this.logger.error(`Failed to fetch tenants: ${error.message}`, { component: 'AibosPlatform', action: 'getUserTenants' });
        return this.createApiResponse<Tenant[]>(false, undefined, error.message);
      }

      return this.createApiResponse<Tenant[]>(true, data || []);
    } catch (error) {
      this.logger.error(`Unexpected error in getUserTenants: ${error instanceof Error ? error.message : String(error)}`, { component: 'AibosPlatform', action: 'getUserTenants' });
      return this.createApiResponse<Tenant[]>(false, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Get tenant by ID
  async getTenant(tenantId: string): Promise<ApiResponse<Tenant>> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (error) {
        this.logger.error(`Tenant not found: ${error.message}`, { component: 'AibosPlatform', action: 'getTenant' });
        return this.createApiResponse<Tenant>(false, undefined, error.message);
      }

      return this.createApiResponse<Tenant>(true, data);
    } catch (error) {
      this.logger.error(`Unexpected error in getTenant: ${error instanceof Error ? error.message : String(error)}`, { component: 'AibosPlatform', action: 'getTenant' });
      return this.createApiResponse<Tenant>(false, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Get tenant members
  async getTenantMembers(tenantId: string): Promise<ApiResponse<TenantMember[]>> {
    try {
      const { data, error } = await supabase
        .from('tenant_members')
        .select(`
          *,
          users:user_id(id, email, user_metadata)
        `)
        .eq('tenant_id', tenantId)
        .order('joined_at', { ascending: false });

      if (error) {
        this.logger.error(`Failed to fetch tenant members: ${error.message}`, { component: 'AibosPlatform', action: 'getTenantMembers' });
        return this.createApiResponse<TenantMember[]>(false, undefined, error.message);
      }

      return this.createApiResponse<TenantMember[]>(true, data || []);
    } catch (error) {
      this.logger.error(`Unexpected error in getTenantMembers: ${error instanceof Error ? error.message : String(error)}`, { component: 'AibosPlatform', action: 'getTenantMembers' });
      return this.createApiResponse<TenantMember[]>(false, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Invite user to tenant
  async inviteUserToTenant(tenantId: string, email: string, role: TenantMember['role'] = 'member'): Promise<ApiResponse> {
    try {
      // First, create or get the user
      const { data: userData, error: userError } = await supabase.auth.admin.inviteUserByEmail(email);
      
      if (userError) {
        this.logger.error(`User invitation failed: ${userError.message}`, { component: 'AibosPlatform', action: 'inviteUserToTenant' });
        return this.createApiResponse(false, undefined, userError.message);
      }

      // Add user to tenant
      const { error } = await supabase
        .from('tenant_members')
        .insert({
          tenant_id: tenantId,
          user_id: userData.user?.id,
          role,
          invited_by: (await this.getCurrentUser())?.id
        });

      if (error) {
        this.logger.error(`Failed to add user to tenant: ${error.message}`, { component: 'AibosPlatform', action: 'inviteUserToTenant' });
        return this.createApiResponse(false, undefined, error.message);
      }

      this.logger.info(`User ${email} invited to tenant successfully`, { component: 'AibosPlatform', action: 'inviteUserToTenant' });
      return this.createApiResponse(true, { user_id: userData.user?.id });
    } catch (error) {
      this.logger.error(`Unexpected error in inviteUserToTenant: ${error instanceof Error ? error.message : String(error)}`, { component: 'AibosPlatform', action: 'inviteUserToTenant' });
      return this.createApiResponse(false, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // ============================================================================
  // APP STORE MANAGEMENT
  // ============================================================================

  // Get all published apps
  async getPublishedApps(categoryId?: string): Promise<ApiResponse<App[]>> {
    try {
      let query = supabase
        .from('apps')
        .select(`
          *,
          categories:category_id(name, slug, icon, color)
        `)
        .eq('status', 'published')
        .order('is_featured', { ascending: false })
        .order('downloads_count', { ascending: false });

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error(`Failed to fetch apps: ${error.message}`, { component: 'AibosPlatform', action: 'getPublishedApps' });
        return this.createApiResponse<App[]>(false, undefined, error.message);
      }

      return this.createApiResponse<App[]>(true, data || []);
    } catch (error) {
      this.logger.error(`Unexpected error in getPublishedApps: ${error instanceof Error ? error.message : String(error)}`, { component: 'AibosPlatform', action: 'getPublishedApps' });
      return this.createApiResponse<App[]>(false, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Get app categories
  async getAppCategories(): Promise<ApiResponse<AppCategory[]>> {
    try {
      const { data, error } = await supabase
        .from('app_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        this.logger.error(`Failed to fetch app categories: ${error.message}`, { component: 'AibosPlatform', action: 'getAppCategories' });
        return this.createApiResponse<AppCategory[]>(false, undefined, error.message);
      }

      return this.createApiResponse<AppCategory[]>(true, data || []);
    } catch (error) {
      this.logger.error(`Unexpected error in getAppCategories: ${error instanceof Error ? error.message : String(error)}`, { component: 'AibosPlatform', action: 'getAppCategories' });
      return this.createApiResponse<AppCategory[]>(false, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Get app by slug
  async getAppBySlug(slug: string): Promise<ApiResponse<App>> {
    try {
      const { data, error } = await supabase
        .from('apps')
        .select(`
          *,
          categories:category_id(name, slug, icon, color),
          versions:app_versions(*)
        `)
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (error) {
        this.logger.error(`App not found: ${error.message}`, { component: 'AibosPlatform', action: 'getAppBySlug' });
        return this.createApiResponse<App>(false, undefined, error.message);
      }

      return this.createApiResponse<App>(true, data);
    } catch (error) {
      this.logger.error(`Unexpected error in getAppBySlug: ${error instanceof Error ? error.message : String(error)}`, { component: 'AibosPlatform', action: 'getAppBySlug' });
      return this.createApiResponse<App>(false, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // ============================================================================
  // APP INSTALLATION MANAGEMENT
  // ============================================================================

  // Install app for tenant
  async installApp(appId: string, tenantId: string): Promise<ApiResponse<AppInstallation>> {
    try {
      const { data, error } = await supabase
        .rpc('install_app', { p_app_id: appId, p_tenant_id: tenantId });

      if (error) {
        this.logger.error(`App installation failed: ${error.message}`, { component: 'AibosPlatform', action: 'installApp' });
        return this.createApiResponse<AppInstallation>(false, undefined, error.message);
      }

      this.logger.info(`App installed successfully for tenant ${tenantId}`, { component: 'AibosPlatform', action: 'installApp' });
      return this.createApiResponse<AppInstallation>(true, data);
    } catch (error) {
      this.logger.error(`Unexpected error in installApp: ${error instanceof Error ? error.message : String(error)}`, { component: 'AibosPlatform', action: 'installApp' });
      return this.createApiResponse<AppInstallation>(false, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Get tenant's installed apps
  async getTenantApps(tenantId: string): Promise<ApiResponse<TenantApp[]>> {
    try {
      const { data, error } = await supabase
        .rpc('get_tenant_apps', { p_tenant_id: tenantId });

      if (error) {
        this.logger.error(`Failed to fetch tenant apps: ${error.message}`, { component: 'AibosPlatform', action: 'getTenantApps' });
        return this.createApiResponse<TenantApp[]>(false, undefined, error.message);
      }

      return this.createApiResponse<TenantApp[]>(true, data || []);
    } catch (error) {
      this.logger.error(`Unexpected error in getTenantApps: ${error instanceof Error ? error.message : String(error)}`, { component: 'AibosPlatform', action: 'getTenantApps' });
      return this.createApiResponse<TenantApp[]>(false, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Uninstall app
  async uninstallApp(installationId: string): Promise<ApiResponse> {
    try {
      const { error } = await supabase
        .from('app_installations')
        .update({ status: 'uninstalled' })
        .eq('id', installationId);

      if (error) {
        this.logger.error(`App uninstallation failed: ${error.message}`, { component: 'AibosPlatform', action: 'uninstallApp' });
        return this.createApiResponse(false, undefined, error.message);
      }

      this.logger.info(`App uninstalled successfully`, { component: 'AibosPlatform', action: 'uninstallApp' });
      return this.createApiResponse(true);
    } catch (error) {
      this.logger.error(`Unexpected error in uninstallApp: ${error instanceof Error ? error.message : String(error)}`, { component: 'AibosPlatform', action: 'uninstallApp' });
      return this.createApiResponse(false, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // ============================================================================
  // APP INTEGRATION MANAGEMENT
  // ============================================================================

  // Create app integration
  async createAppIntegration(
    appId: string,
    tenantId: string,
    integrationType: AppIntegration['integration_type'],
    config: Record<string, JsonValue>,
    credentials?: Record<string, JsonValue>
  ): Promise<ApiResponse<AppIntegration>> {
    try {
      const { data, error } = await supabase
        .from('app_integrations')
        .insert({
          app_id: appId,
          tenant_id: tenantId,
          integration_type: integrationType,
          config,
          credentials: credentials || {}
        })
        .select()
        .single();

      if (error) {
        this.logger.error(`Integration creation failed: ${error.message}`, { component: 'AibosPlatform', action: 'createAppIntegration' });
        return this.createApiResponse<AppIntegration>(false, undefined, error.message);
      }

      this.logger.info(`App integration created successfully`, { component: 'AibosPlatform', action: 'createAppIntegration' });
      return this.createApiResponse<AppIntegration>(true, data);
    } catch (error) {
      this.logger.error(`Unexpected error in createAppIntegration: ${error instanceof Error ? error.message : String(error)}`, { component: 'AibosPlatform', action: 'createAppIntegration' });
      return this.createApiResponse<AppIntegration>(false, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Get app integrations for tenant
  async getAppIntegrations(tenantId: string, appId?: string): Promise<ApiResponse<AppIntegration[]>> {
    try {
      let query = supabase
        .from('app_integrations')
        .select('*')
        .eq('tenant_id', tenantId);

      if (appId) {
        query = query.eq('app_id', appId);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error(`Failed to fetch app integrations: ${error.message}`, { component: 'AibosPlatform', action: 'getAppIntegrations' });
        return this.createApiResponse<AppIntegration[]>(false, undefined, error.message);
      }

      return this.createApiResponse<AppIntegration[]>(true, data || []);
    } catch (error) {
      this.logger.error(`Unexpected error in getAppIntegrations: ${error instanceof Error ? error.message : String(error)}`, { component: 'AibosPlatform', action: 'getAppIntegrations' });
      return this.createApiResponse<AppIntegration[]>(false, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Update app integration
  async updateAppIntegration(
    integrationId: string,
    updates: Partial<AppIntegration>
  ): Promise<ApiResponse<AppIntegration>> {
    try {
      const { data, error } = await supabase
        .from('app_integrations')
        .update(updates)
        .eq('id', integrationId)
        .select()
        .single();

      if (error) {
        this.logger.error(`Integration update failed: ${error.message}`, { component: 'AibosPlatform', action: 'updateAppIntegration' });
        return this.createApiResponse<AppIntegration>(false, undefined, error.message);
      }

      this.logger.info(`App integration updated successfully`, { component: 'AibosPlatform', action: 'updateAppIntegration' });
      return this.createApiResponse<AppIntegration>(true, data);
    } catch (error) {
      this.logger.error(`Unexpected error in updateAppIntegration: ${error instanceof Error ? error.message : String(error)}`, { component: 'AibosPlatform', action: 'updateAppIntegration' });
      return this.createApiResponse<AppIntegration>(false, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // ============================================================================
  // NOTIFICATION SYSTEM
  // ============================================================================

  // Create notification
  async createNotification(
    tenantId: string,
    userId: string,
    type: Notification['type'],
    title: string,
    message: string,
    appId?: string,
    data?: Record<string, JsonValue>
  ): Promise<ApiResponse<Notification>> {
    try {
      const { data: notification, error } = await supabase
        .from('notifications')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          app_id: appId,
          type,
          title,
          message,
          data: data || {}
        })
        .select()
        .single();

      if (error) {
        this.logger.error(`Notification creation failed: ${error.message}`, { component: 'AibosPlatform', action: 'createNotification' });
        return this.createApiResponse<Notification>(false, undefined, error.message);
      }

      return this.createApiResponse<Notification>(true, notification);
    } catch (error) {
      this.logger.error(`Unexpected error in createNotification: ${error instanceof Error ? error.message : String(error)}`, { component: 'AibosPlatform', action: 'createNotification' });
      return this.createApiResponse<Notification>(false, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Get user notifications
  async getUserNotifications(limit: number = 50): Promise<ApiResponse<Notification[]>> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', (await this.getCurrentUser())?.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        this.logger.error(`Failed to fetch notifications: ${error.message}`, { component: 'AibosPlatform', action: 'getUserNotifications' });
        return this.createApiResponse<Notification[]>(false, undefined, error.message);
      }

      return this.createApiResponse<Notification[]>(true, data || []);
    } catch (error) {
      this.logger.error(`Unexpected error in getUserNotifications: ${error instanceof Error ? error.message : String(error)}`, { component: 'AibosPlatform', action: 'getUserNotifications' });
      return this.createApiResponse<Notification[]>(false, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: string): Promise<ApiResponse> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        this.logger.error(`Failed to mark notification as read: ${error.message}`, { component: 'AibosPlatform', action: 'markNotificationAsRead' });
        return this.createApiResponse(false, undefined, error.message);
      }

      return this.createApiResponse(true);
    } catch (error) {
      this.logger.error(`Unexpected error in markNotificationAsRead: ${error instanceof Error ? error.message : String(error)}`, { component: 'AibosPlatform', action: 'markNotificationAsRead' });
      return this.createApiResponse(false, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // ============================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ============================================================================

  // Subscribe to tenant changes
  subscribeToTenantChanges(callback: (payload: TenantChangePayload) => void) {
    return supabase
      .channel('tenant-changes')
      .on(
        // deno-lint-ignore no-explicit-any
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'tenants'
        },
        callback
      )
      .subscribe();
  }

  // Subscribe to app installations
  subscribeToAppInstallations(callback: (payload: AppInstallationPayload) => void) {
    return supabase
      .channel('app-installations')
      .on(
        // deno-lint-ignore no-explicit-any
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'app_installations'
        },
        callback
      )
      .subscribe();
  }

  // Subscribe to notifications
  subscribeToNotifications(callback: (payload: NotificationPayload) => void) {
    return supabase
      .channel('notifications')
      .on(
        // deno-lint-ignore no-explicit-any
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        callback
      )
      .subscribe();
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  // Check if user has permission in tenant
  async hasTenantPermission(tenantId: string, permission: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('tenant_members')
        .select('role, permissions')
        .eq('tenant_id', tenantId)
        .eq('user_id', (await this.getCurrentUser())?.id)
        .single();

      if (error || !data) return false;

      // Owner and admin have all permissions
      if (data.role === 'owner' || data.role === 'admin') return true;

      // Check specific permission
      return data.permissions?.[permission] === true;
    } catch (error) {
      this.logger.warn(`Permission check failed: ${error instanceof Error ? error.message : String(error)}`, { component: 'AibosPlatform', action: 'hasTenantPermission' });
      return false;
    }
  }

  // Get user's role in tenant
  async getUserTenantRole(tenantId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('tenant_members')
        .select('role')
        .eq('tenant_id', tenantId)
        .eq('user_id', (await this.getCurrentUser())?.id)
        .single();

      if (error || !data) return null;

      return data.role;
    } catch (error) {
      this.logger.warn(`Failed to get user tenant role: ${error instanceof Error ? error.message : String(error)}`, { component: 'AibosPlatform', action: 'getUserTenantRole' });
      return null;
    }
  }

  // Log audit event
  async logAuditEvent(
    tenantId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    oldValues?: Record<string, JsonValue>,
    newValues?: Record<string, JsonValue>
  ): Promise<void> {
    try {
      await supabase
        .from('audit_logs')
        .insert({
          tenant_id: tenantId,
          user_id: (await this.getCurrentUser())?.id,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          old_values: oldValues,
          new_values: newValues
        });
    } catch (error) {
      this.logger.error(`Failed to log audit event: ${error instanceof Error ? error.message : String(error)}`, { component: 'AibosPlatform', action: 'logAuditEvent' });
    }
  }
}

// Export singleton instance
export const aibosPlatformService = new AIBOSPlatformService();

// Split large service into smaller modules
// Lazy load heavy operations to reduce initial bundle size
export const lazyOperations = {
  getTenantMetrics: () => import('./tenant-metrics.ts').then(m => m.getTenantMetrics),
  getAdvancedAnalytics: () => import('./tenant-metrics.ts').then(m => m.getAdvancedAnalytics),
  bulkCreateTenants: () => import('./bulk-operations.ts').then(m => m.bulkCreateTenants),
  bulkUpdateMembers: () => import('./bulk-operations.ts').then(m => m.bulkUpdateMembers)
};

// Usage example in AIBOSPlatformService:
class AIBOSPlatformService {
  private logger = new EnterpriseLogger();
  
  // Optimized tenant retrieval with caching
  async getUserTenants(page: number = 0, limit: number = 20): Promise<ApiResponse<Tenant[]>> {
    try {
      // Use optimized RPC function instead of direct table query
      const { data, error } = await supabase
        .rpc('get_tenants_paginated', {
          p_page: page,
          p_limit: limit,
          p_user_id: (await this.getCurrentUser())?.id
        });

      if (error) {
        this.logger.error(`Failed to fetch tenants: ${error.message}`, { component: 'AibosPlatform', action: 'getUserTenants' });
        return this.createApiResponse<Tenant[]>(false, undefined, error.message);
      }

      return this.createApiResponse<Tenant[]>(true, data || []);
    } catch (error) {
      this.logger.error(`Unexpected error in getUserTenants: ${error instanceof Error ? error.message : String(error)}`, { component: 'AibosPlatform', action: 'getUserTenants' });
      return this.createApiResponse<Tenant[]>(false, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  // Optimized notes with intelligent caching
  async getNotes(tenantId: string, page: number = 0, limit: number = 50): Promise<ApiResponse<Note[]>> {
    try {
      const cacheKey = `notes_${tenantId}_${page}_${limit}`;
      const cached = getCachedNotes(cacheKey);
      if (cached) {
        return this.createApiResponse<Note[]>(true, cached);
      }

      const from = page * limit;
      const to = from + limit - 1;

      const { data, error } = await supabase
        .from('notes')
        .select('id, title, content, created_at, updated_at, tags')
        .eq('tenant_id', tenantId)
        .eq('is_deleted', false)
        .order('updated_at', { ascending: false })
        .range(from, to);

      if (error) {
        this.logger.error(`Failed to fetch notes: ${error.message}`, { component: 'AibosPlatform', action: 'getNotes' });
        return this.createApiResponse<Note[]>(false, undefined, error.message);
      }

      // Cache the results
      setCachedNotes(cacheKey, data || []);
      return this.createApiResponse<Note[]>(true, data || []);
    } catch (error) {
      this.logger.error(`Unexpected error in getNotes: ${error instanceof Error ? error.message : String(error)}`, { component: 'AibosPlatform', action: 'getNotes' });
      return this.createApiResponse<Note[]>(false, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  // Optimized metrics using new RPC function
  async getTenantMetrics(tenantId: string): Promise<ApiResponse<any>> {
    try {
      const cacheKey = `metrics_${tenantId}`;
      const cached = getCachedNotes(cacheKey);
      if (cached) {
        return this.createApiResponse(true, cached);
      }

      const { data, error } = await supabase
        .rpc('get_tenant_metrics_optimized', { 
          p_tenant_id: tenantId,
          p_include_details: false
        });

      if (error) {
        this.logger.error(`Failed to fetch tenant metrics: ${error.message}`, { component: 'AibosPlatform', action: 'getTenantMetrics' });
        return this.createApiResponse(false, undefined, error.message);
      }

      // Cache metrics for 10 seconds
      setCachedNotes(cacheKey, data, 10000);
      return this.createApiResponse(true, data);
    } catch (error) {
      this.logger.error(`Unexpected error in getTenantMetrics: ${error instanceof Error ? error.message : String(error)}`, { component: 'AibosPlatform', action: 'getTenantMetrics' });
      return this.createApiResponse(false, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  // Cache invalidation on data mutations
  async createNote(tenantId: string, noteData: Partial<Note>): Promise<ApiResponse<Note>> {
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          ...noteData,
          tenant_id: tenantId,
          created_by: (await this.getCurrentUser())?.id
        })
        .select()
        .single();

      if (error) {
        this.logger.error(`Failed to create note: ${error.message}`, { component: 'AibosPlatform', action: 'createNote' });
        return this.createApiResponse<Note>(false, undefined, error.message);
      }

      // Invalidate related caches
      this.invalidateNotesCache(tenantId);
      this.invalidateMetricsCache(tenantId);

      return this.createApiResponse<Note>(true, data);
    } catch (error) {
      this.logger.error(`Unexpected error in createNote: ${error instanceof Error ? error.message : String(error)}`, { component: 'AibosPlatform', action: 'createNote' });
      return this.createApiResponse<Note>(false, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  // Cache invalidation helpers
  private invalidateNotesCache(tenantId: string): void {
    for (const key of notesCache.keys()) {
      if (key.includes(`notes_${tenantId}`)) {
        notesCache.delete(key);
      }
    }
  }
  
  private invalidateMetricsCache(tenantId: string): void {
    notesCache.delete(`metrics_${tenantId}`);
  }
  
  class AIBOSPlatformProvider implements SearchProvider {
    private logger = new EnterpriseLogger();
    
    // Replace all logging calls:
    // logInfo('message') → this.logger.info('message', { component: 'AibosPlatform', action: 'actionName' })
    // logWarn('message') → this.logger.warn('message', { component: 'AibosPlatform', action: 'actionName' })
    // logError('message') → this.logger.error('message', { component: 'AibosPlatform', action: 'actionName' })
    // logSuccess('message') → this.logger.info('message', { component: 'AibosPlatform', action: 'actionName', metadata: { status: 'success' } })
  
  async getTenantMetrics(tenantId: string) {
    const operation = await lazyOperations.getTenantMetrics();
    return operation(tenantId);
  }
  
  async getAdvancedAnalytics(tenantId: string) {
    const operation = await lazyOperations.getAdvancedAnalytics();
    return operation(tenantId);
  }
}