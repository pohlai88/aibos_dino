import { EnterpriseLogger } from './core/logger.ts';
import { supabase } from '../../modules/supabase-client.ts';
import { ApiResponse } from '../../modules/types.ts';

class _TenantMetricsService {
  private logger = new EnterpriseLogger();
}

// Heavy tenant metrics operations (lazy loaded)
export async function getTenantMetrics(tenantId: string): Promise<ApiResponse<Record<string, unknown>>> {
  const logger = new EnterpriseLogger();
  
  try {
    logger.info('Loading tenant metrics', {
      component: 'TenantMetrics',
      action: 'getTenantMetrics',
      metadata: { tenantId }
    });
    
    const { data, error } = await supabase
      .rpc('get_tenant_metrics', { p_tenant_id: tenantId });

    if (error) {
      logger.error('Failed to fetch tenant metrics', {
        component: 'TenantMetrics',
        action: 'getTenantMetrics',
        metadata: { tenantId, error: error.message }
      });
      return { 
        success: false, 
        error: error.message,
        timestamp: new Date()
      };
    }

    return { 
      success: true, 
      data: data || {},
      timestamp: new Date()
    };
  } catch (error) {
    logger.error('Unexpected error in getTenantMetrics', {
      component: 'TenantMetrics',
      action: 'getTenantMetrics',
      metadata: { 
        tenantId,
        error: error instanceof Error ? error.message : String(error)
      }
    });
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
  }
}

export async function getAdvancedAnalytics(tenantId: string): Promise<ApiResponse<Record<string, unknown>>> {
  const logger = new EnterpriseLogger();
  
  try {
    const { data, error } = await supabase
      .rpc('get_advanced_analytics', { p_tenant_id: tenantId });

    if (error) {
      logger.error(`Failed to fetch analytics: ${error.message}`, { component: 'TenantMetrics', action: 'getAdvancedAnalytics' });
      return { 
        success: false, 
        error: error.message,
        timestamp: new Date()
      };
    }

    return { 
      success: true, 
      data: data || {},
      timestamp: new Date()
    };
  } catch (error) {
    logger.error(`Analytics error: ${error instanceof Error ? error.message : String(error)}`, { component: 'TenantMetrics', action: 'getAdvancedAnalytics' });
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
  }
}