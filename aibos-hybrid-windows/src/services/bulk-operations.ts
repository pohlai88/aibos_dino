import { EnterpriseLogger } from './core/logger.ts';
import { supabase } from '../../modules/supabase-client.ts';
import { ApiResponse } from '../../modules/types.ts';

class BulkOperationsService {
  private logger = new EnterpriseLogger();
}

// Bulk operations (lazy loaded)
export async function bulkCreateTenants(tenants: any[]): Promise<ApiResponse<any[]>> {
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
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    logger.error('Unexpected error in bulk tenant creation', {
      component: 'BulkOperations',
      action: 'bulkCreateTenants',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function bulkUpdateMembers(updates: any[]): Promise<ApiResponse<any[]>> {
  try {
    const results = [];
    
    for (const update of updates) {
      const { data, error } = await supabase
        .from('tenant_members')
        .update(update.data)
        .eq('id', update.id)
        .select();
        
      if (error) {
        this.logger.error(`Failed to update member ${update.id}: ${error.message}`, { component: 'BulkOperations', action: 'updateMembers', metadata: { memberId: update.id } });
        continue;
      }
      
      results.push(data?.[0]);
    }

    return { success: true, data: results };
  } catch (error) {
    this.logger.error(`Bulk update error: ${error instanceof Error ? error.message : String(error)}`, { component: 'BulkOperations', action: 'bulkUpdateMembers' });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}