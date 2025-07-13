import { EnterpriseLogger } from './core/logger.ts';
import { supabase } from '../../modules/supabase-client.ts';
import { ApiResponse } from '../../modules/types.ts';



// Tenant interface for bulk operations
interface TenantData {
  name: string;
  slug: string;
  description?: string;
  plan_type: 'free' | 'basic' | 'pro' | 'enterprise';
  max_users: number;
  max_storage_gb: number;
  created_by?: string;
}

// Member update interface
interface MemberUpdate {
  id: string;
  data: {
    role?: 'owner' | 'admin' | 'member' | 'viewer';
    permissions?: Record<string, unknown>;
  };
}

// Bulk operations (lazy loaded)
export async function bulkCreateTenants(tenants: TenantData[]): Promise<ApiResponse<TenantData[]>> {
  const logger = new EnterpriseLogger();
  
  try {
    logger.info(`Creating ${tenants.length} tenants`, {
      component: 'BulkOperations',
      action: 'bulkCreateTenants',
      metadata: { count: tenants.length }
    });
    
    const { data, error } = await supabase
      .from('tenants')
      .insert(tenants)
      .select();

    if (error) {
      logger.error('Bulk tenant creation failed', {
        component: 'BulkOperations',
        action: 'bulkCreateTenants',
        metadata: { error: error.message }
      });
      return { success: false, error: error.message, timestamp: new Date() };
    }

    return { success: true, data: data || [], timestamp: new Date() };
  } catch (error) {
    logger.error('Unexpected error in bulk tenant creation', {
      component: 'BulkOperations',
      action: 'bulkCreateTenants',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date() };
  }
}

export async function bulkUpdateMembers(updates: MemberUpdate[]): Promise<ApiResponse<Record<string, unknown>[]>> {
  const logger = new EnterpriseLogger();
  
  try {
    const results = [];
    
    for (const update of updates) {
      const { data, error } = await supabase
        .from('tenant_members')
        .update(update.data)
        .eq('id', update.id)
        .select();
        
      if (error) {
        logger.error(`Failed to update member ${update.id}: ${error.message}`, { component: 'BulkOperations', action: 'updateMembers', metadata: { memberId: update.id } });
        continue;
      }
      
      results.push(data?.[0]);
    }

    return { success: true, data: results, timestamp: new Date() };
  } catch (error) {
    logger.error(`Bulk update error: ${error instanceof Error ? error.message : String(error)}`, { component: 'BulkOperations', action: 'bulkUpdateMembers' });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date() };
  }
}