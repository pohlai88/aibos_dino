import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { SUPABASE_CONFIG } from '../../config.ts';

// Types for AIBOS Platform
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
  permissions: Record<string, any>;
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
  requirements: Record<string, any>;
  metadata: Record<string, any>;
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
  config: Record<string, any>;
  permissions: Record<string, any>;
  installed_at: string;
  updated_at: string;
}

export interface AppIntegration {
  id: string;
  app_id: string;
  tenant_id: string;
  integration_type: 'api' | 'webhook' | 'database' | 'file_system' | 'auth' | 'storage';
  config: Record<string, any>;
  credentials: Record<string, any>;
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
  data: Record<string, any>;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// AIBOS Platform Service Class
export class AIBOSPlatformService {
  private supabase;

  constructor() {
    this.supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  }

  // ============================================================================
  // TENANT MANAGEMENT
  // ============================================================================

  // Get current user
  async getCurrentUser() {
    const { data: { user }, error } = await this.supabase.auth.getUser();
    if (error) throw error;
    return user;
  }

  // Create a new tenant
  async createTenant(name: string, slug: string, description?: string): Promise<ApiResponse<Tenant>> {
    try {
      const { data, error } = await this.supabase
        .rpc('create_tenant', { p_name: name, p_slug: slug, p_description: description });

      if (error) {
        return {
          success: false,
          error: error.message,
          code: 'TENANT_CREATION_FAILED'
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  // Get user's tenants
  async getUserTenants(): Promise<ApiResponse<Tenant[]>> {
    try {
      const { data, error } = await this.supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return {
          success: false,
          error: error.message,
          code: 'FETCH_TENANTS_FAILED'
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  // Get tenant by ID
  async getTenant(tenantId: string): Promise<ApiResponse<Tenant>> {
    try {
      const { data, error } = await this.supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
          code: 'TENANT_NOT_FOUND'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  // Get tenant members
  async getTenantMembers(tenantId: string): Promise<ApiResponse<TenantMember[]>> {
    try {
      const { data, error } = await this.supabase
        .from('tenant_members')
        .select(`
          *,
          users:user_id(id, email, user_metadata)
        `)
        .eq('tenant_id', tenantId)
        .order('joined_at', { ascending: false });

      if (error) {
        return {
          success: false,
          error: error.message,
          code: 'FETCH_MEMBERS_FAILED'
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  // Invite user to tenant
  async inviteUserToTenant(tenantId: string, email: string, role: TenantMember['role'] = 'member'): Promise<ApiResponse> {
    try {
      // First, create or get the user
      const { data: userData, error: userError } = await this.supabase.auth.admin.inviteUserByEmail(email);
      
      if (userError) {
        return {
          success: false,
          error: userError.message,
          code: 'USER_INVITATION_FAILED'
        };
      }

      // Add user to tenant
      const { error } = await this.supabase
        .from('tenant_members')
        .insert({
          tenant_id: tenantId,
          user_id: userData.user?.id,
          role,
          invited_by: (await this.getCurrentUser())?.id
        });

      if (error) {
        return {
          success: false,
          error: error.message,
          code: 'TENANT_MEMBER_ADDITION_FAILED'
        };
      }

      return {
        success: true,
        data: { user_id: userData.user?.id }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  // ============================================================================
  // APP STORE MANAGEMENT
  // ============================================================================

  // Get all published apps
  async getPublishedApps(categoryId?: string): Promise<ApiResponse<App[]>> {
    try {
      let query = this.supabase
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
        return {
          success: false,
          error: error.message,
          code: 'FETCH_APPS_FAILED'
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  // Get app categories
  async getAppCategories(): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await this.supabase
        .from('app_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        return {
          success: false,
          error: error.message,
          code: 'FETCH_CATEGORIES_FAILED'
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  // Get app by slug
  async getAppBySlug(slug: string): Promise<ApiResponse<App>> {
    try {
      const { data, error } = await this.supabase
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
        return {
          success: false,
          error: error.message,
          code: 'APP_NOT_FOUND'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  // ============================================================================
  // APP INSTALLATION MANAGEMENT
  // ============================================================================

  // Install app for tenant
  async installApp(appId: string, tenantId: string): Promise<ApiResponse<AppInstallation>> {
    try {
      const { data, error } = await this.supabase
        .rpc('install_app', { p_app_id: appId, p_tenant_id: tenantId });

      if (error) {
        return {
          success: false,
          error: error.message,
          code: 'APP_INSTALLATION_FAILED'
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  // Get tenant's installed apps
  async getTenantApps(tenantId: string): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_tenant_apps', { p_tenant_id: tenantId });

      if (error) {
        return {
          success: false,
          error: error.message,
          code: 'FETCH_TENANT_APPS_FAILED'
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  // Uninstall app
  async uninstallApp(installationId: string): Promise<ApiResponse> {
    try {
      const { error } = await this.supabase
        .from('app_installations')
        .update({ status: 'uninstalled' })
        .eq('id', installationId);

      if (error) {
        return {
          success: false,
          error: error.message,
          code: 'APP_UNINSTALLATION_FAILED'
        };
      }

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR'
      };
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
    config: Record<string, any>,
    credentials?: Record<string, any>
  ): Promise<ApiResponse<AppIntegration>> {
    try {
      const { data, error } = await this.supabase
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
        return {
          success: false,
          error: error.message,
          code: 'INTEGRATION_CREATION_FAILED'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  // Get app integrations for tenant
  async getAppIntegrations(tenantId: string, appId?: string): Promise<ApiResponse<AppIntegration[]>> {
    try {
      let query = this.supabase
        .from('app_integrations')
        .select('*')
        .eq('tenant_id', tenantId);

      if (appId) {
        query = query.eq('app_id', appId);
      }

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: error.message,
          code: 'FETCH_INTEGRATIONS_FAILED'
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  // Update app integration
  async updateAppIntegration(
    integrationId: string,
    updates: Partial<AppIntegration>
  ): Promise<ApiResponse<AppIntegration>> {
    try {
      const { data, error } = await this.supabase
        .from('app_integrations')
        .update(updates)
        .eq('id', integrationId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
          code: 'INTEGRATION_UPDATE_FAILED'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR'
      };
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
    data?: Record<string, any>
  ): Promise<ApiResponse<Notification>> {
    try {
      const { data: notification, error } = await this.supabase
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
        return {
          success: false,
          error: error.message,
          code: 'NOTIFICATION_CREATION_FAILED'
        };
      }

      return {
        success: true,
        data: notification
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  // Get user notifications
  async getUserNotifications(limit: number = 50): Promise<ApiResponse<Notification[]>> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', (await this.getCurrentUser())?.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return {
          success: false,
          error: error.message,
          code: 'FETCH_NOTIFICATIONS_FAILED'
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: string): Promise<ApiResponse> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        return {
          success: false,
          error: error.message,
          code: 'NOTIFICATION_UPDATE_FAILED'
        };
      }

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  // ============================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ============================================================================

  // Subscribe to tenant changes
  subscribeToTenantChanges(callback: (payload: any) => void) {
    return this.supabase
      .channel('tenant_changes')
      .on(
        'postgres_changes',
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
  subscribeToAppInstallations(callback: (payload: any) => void) {
    return this.supabase
      .channel('app_installations')
      .on(
        'postgres_changes',
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
  subscribeToNotifications(callback: (payload: any) => void) {
    return this.supabase
      .channel('notifications')
      .on(
        'postgres_changes',
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
      const { data, error } = await this.supabase
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
      return false;
    }
  }

  // Get user's role in tenant
  async getUserTenantRole(tenantId: string): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('tenant_members')
        .select('role')
        .eq('tenant_id', tenantId)
        .eq('user_id', (await this.getCurrentUser())?.id)
        .single();

      if (error || !data) return null;

      return data.role;
    } catch (error) {
      return null;
    }
  }

  // Log audit event
  async logAuditEvent(
    tenantId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>
  ): Promise<void> {
    try {
      await this.supabase
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
      console.error('Failed to log audit event:', error);
    }
  }
}

// Export singleton instance
export const aibosPlatformService = new AIBOSPlatformService(); 