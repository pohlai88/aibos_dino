/// <reference lib="deno.ns" />

import { supabase } from '../../modules/supabase-client.ts';
import { EnterpriseLogger } from './core/logger.ts';
import { ApiResponse } from '../../modules/types.ts';
import { queryOptimizer as _queryOptimizer } from './query-optimizer.ts';
import { SearchProvider, SearchResult } from '../types/search.ts';
import { createSearchResult as _createSearchResult } from './searchRegistry.ts';
import { systemIntegration as _systemIntegration } from './systemIntegration.ts';

/* -------------------------------------------------------------
 * Additional Types and Caching Helpers
 * ------------------------------------------------------------ */

export interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
}

// Simple in-memory cache
const notesCache = new Map<string, Note[]>();
const metricsCache = new Map<string, Record<string, unknown>>();

export function getCachedNotes(key: string): Note[] | undefined {
  return notesCache.get(key);
}

export function setCachedNotes(key: string, data: Note[], ttlMs?: number): void {
  notesCache.set(key, data);
  if (ttlMs) {
    setTimeout(() => notesCache.delete(key), ttlMs);
  }
}

export function getCachedMetrics(key: string): Record<string, unknown> | undefined {
  return metricsCache.get(key);
}

export function setCachedMetrics(key: string, data: Record<string, unknown>, ttlMs?: number): void {
  metricsCache.set(key, data);
  if (ttlMs) {
    setTimeout(() => metricsCache.delete(key), ttlMs);
  }
}

/* -------------------------------------------------------------
 * Models
 * ------------------------------------------------------------ */

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

/* -------------------------------------------------------------
 * AIBOSPlatformService
 * ------------------------------------------------------------ */

export class AIBOSPlatformService {
  protected logger = new EnterpriseLogger();

  private createApiResponse<T>(success: boolean, data?: T, error?: string): ApiResponse<T> {
    const response: ApiResponse<T> = {
      success,
      timestamp: new Date()
    };
    
    if (data !== undefined) {
      response.data = data;
    }
    
    if (error !== undefined) {
      response.error = error;
    }
    
    return response;
  }

  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      this.logger.error(`Failed to get current user: ${error.message}`, {
        component: 'AibosPlatform',
        action: 'getCurrentUser'
      });
      throw error;
    }
    return user;
  }

  async getUserTenants(page: number = 0, limit: number = 20): Promise<ApiResponse<Tenant[]>> {
    try {
      const { data, error } = await supabase
        .rpc('get_tenants_paginated', {
          p_page: page,
          p_limit: limit,
          p_user_id: (await this.getCurrentUser())?.id
        });

      if (error) {
        this.logger.error(`Failed to fetch tenants: ${error.message}`, {
          component: 'AibosPlatform',
          action: 'getUserTenants'
        });
        return this.createApiResponse<Tenant[]>(false, undefined, error.message);
      }

      return this.createApiResponse<Tenant[]>(true, data || []);
    } catch (error) {
      this.logger.error(`Unexpected error in getUserTenants: ${error instanceof Error ? error.message : String(error)}`, {
        component: 'AibosPlatform',
        action: 'getUserTenants'
      });
      return this.createApiResponse<Tenant[]>(false, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

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
        this.logger.error(`Failed to fetch notes: ${error.message}`, {
          component: 'AibosPlatform',
          action: 'getNotes'
        });
        return this.createApiResponse<Note[]>(false, undefined, error.message);
      }

      setCachedNotes(cacheKey, data || []);
      return this.createApiResponse<Note[]>(true, data || []);
    } catch (error) {
      this.logger.error(`Unexpected error in getNotes: ${error instanceof Error ? error.message : String(error)}`, {
        component: 'AibosPlatform',
        action: 'getNotes'
      });
      return this.createApiResponse<Note[]>(false, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private invalidateNotesCache(tenantId: string): void {
    for (const key of notesCache.keys()) {
      if (key.includes(`notes_${tenantId}`)) {
        notesCache.delete(key);
      }
    }
  }

  private invalidateMetricsCache(tenantId: string): void {
    metricsCache.delete(`metrics_${tenantId}`);
  }

  async getTenantMetrics(tenantId: string): Promise<ApiResponse<Record<string, unknown>>> {
    try {
      const cacheKey = `metrics_${tenantId}`;
      const cached = getCachedMetrics(cacheKey);
      if (cached) {
        return this.createApiResponse<Record<string, unknown>>(true, cached);
      }

      const { data, error } = await supabase.rpc('get_tenant_metrics_optimized', {
        p_tenant_id: tenantId,
        p_include_details: false
      });

      if (error) {
        this.logger.error(`Failed to fetch tenant metrics: ${error.message}`, {
          component: 'AibosPlatform',
          action: 'getTenantMetrics'
        });
        return this.createApiResponse<Record<string, unknown>>(false, undefined, error.message);
      }

      setCachedMetrics(cacheKey, data as Record<string, unknown>, 10000);
      return this.createApiResponse<Record<string, unknown>>(true, data as Record<string, unknown>);
    } catch (error) {
      this.logger.error(`Unexpected error in getTenantMetrics: ${error instanceof Error ? error.message : String(error)}`, {
        component: 'AibosPlatform',
        action: 'getTenantMetrics'
      });
      return this.createApiResponse<Record<string, unknown>>(false, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

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
        this.logger.error(`Failed to create note: ${error.message}`, {
          component: 'AibosPlatform',
          action: 'createNote'
        });
        return this.createApiResponse<Note>(false, undefined, error.message);
      }

      this.invalidateNotesCache(tenantId);
      this.invalidateMetricsCache(tenantId);

      return this.createApiResponse<Note>(true, data);
    } catch (error) {
      this.logger.error(`Unexpected error in createNote: ${error instanceof Error ? error.message : String(error)}`, {
        component: 'AibosPlatform',
        action: 'createNote'
      });
      return this.createApiResponse<Note>(false, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Fetch all app categories
  async getAppCategories(): Promise<ApiResponse<AppCategory[]>> {
    try {
      const { data, error } = await supabase.from('app_categories').select('*');
      if (error) return this.createApiResponse<AppCategory[]>(false, undefined, error.message);
      return this.createApiResponse<AppCategory[]>(true, data || []);
    } catch (error) {
      return this.createApiResponse<AppCategory[]>(false, undefined, String(error));
    }
  }

  // Fetch all published apps
  async getPublishedApps(): Promise<ApiResponse<App[]>> {
    try {
      const { data, error } = await supabase.from('apps').select('*').eq('status', 'published');
      if (error) return this.createApiResponse<App[]>(false, undefined, error.message);
      return this.createApiResponse<App[]>(true, data || []);
    } catch (error) {
      return this.createApiResponse<App[]>(false, undefined, String(error));
    }
  }

  // Fetch all apps for a tenant
  async getTenantApps(tenantId: string): Promise<ApiResponse<TenantApp[]>> {
    try {
      const { data, error } = await supabase.from('tenant_apps').select('*').eq('tenant_id', tenantId);
      if (error) return this.createApiResponse<TenantApp[]>(false, undefined, error.message);
      return this.createApiResponse<TenantApp[]>(true, data || []);
    } catch (error) {
      return this.createApiResponse<TenantApp[]>(false, undefined, String(error));
    }
  }

  // Install an app for a tenant
  async installApp(tenantId: string, appId: string): Promise<ApiResponse<AppInstallation>> {
    try {
      const { data, error } = await supabase.from('app_installations').insert({ tenant_id: tenantId, app_id: appId }).select().single();
      if (error) return this.createApiResponse<AppInstallation>(false, undefined, error.message);
      return this.createApiResponse<AppInstallation>(true, data);
    } catch (error) {
      return this.createApiResponse<AppInstallation>(false, undefined, String(error));
    }
  }

  // Uninstall an app for a tenant
  async uninstallApp(tenantId: string, appId: string): Promise<ApiResponse<AppInstallation>> {
    try {
      const { data, error } = await supabase.from('app_installations').delete().eq('tenant_id', tenantId).eq('app_id', appId).select().single();
      if (error) return this.createApiResponse<AppInstallation>(false, undefined, error.message);
      return this.createApiResponse<AppInstallation>(true, data);
    } catch (error) {
      return this.createApiResponse<AppInstallation>(false, undefined, String(error));
    }
  }

  // Create a notification
  async createNotification(notification: Partial<Notification>): Promise<ApiResponse<Notification>> {
    try {
      const { data, error } = await supabase.from('notifications').insert(notification).select().single();
      if (error) return this.createApiResponse<Notification>(false, undefined, error.message);
      return this.createApiResponse<Notification>(true, data);
    } catch (error) {
      return this.createApiResponse<Notification>(false, undefined, String(error));
    }
  }
}

/* -------------------------------------------------------------
 * Export Singleton
 * ------------------------------------------------------------ */

export const aibosPlatformService = new AIBOSPlatformService();

/* -------------------------------------------------------------
 * AIBOSPlatformProvider
 * ------------------------------------------------------------ */

export class AIBOSPlatformProvider implements SearchProvider {
  protected logger = new EnterpriseLogger();

  id = "aibos-platform";
  name = "AIBOS Platform Provider";

  search(query: string): Promise<SearchResult[]> {
    this.logger.info(`Searching for: ${query}`, {
      component: 'AibosPlatform',
      action: 'search'
    });
    return Promise.resolve([]);
  }

  async getTenantMetrics(tenantId: string) {
    const operation = await lazyOperations.getTenantMetrics();
    return operation(tenantId);
  }

  async getAdvancedAnalytics(tenantId: string) {
    const operation = await lazyOperations.getAdvancedAnalytics();
    return operation(tenantId);
  }
}

/* -------------------------------------------------------------
 * Lazy Operations
 * ------------------------------------------------------------ */

export const lazyOperations = {
  getTenantMetrics: () => import('./tenant-metrics.ts').then(m => m.getTenantMetrics),
  getAdvancedAnalytics: () => import('./tenant-metrics.ts').then(m => m.getAdvancedAnalytics),
  bulkCreateTenants: () => import('./bulk-operations.ts').then(m => m.bulkCreateTenants),
  bulkUpdateMembers: () => import('./bulk-operations.ts').then(m => m.bulkUpdateMembers)
};
