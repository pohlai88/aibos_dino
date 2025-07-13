import { supabase } from '../../modules/supabase-client.ts';
// REMOVED: import { logInfo, logWarn, logError } from '../../modules/logging.ts';
import { EnterpriseLogger } from './core/logger';

interface QueryCache {
  data: any;
  timestamp: number;
  ttl: number;
}

class QueryOptimizer {
  private cache = new Map<string, QueryCache>();
  private readonly DEFAULT_TTL = 5000;
  private readonly FAST_TTL = 1000;
  private logger = new EnterpriseLogger();
  
  async getTenantsOptimized(page = 0, limit = 20): Promise<any> {
    const cacheKey = `tenants_${page}_${limit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    const startTime = performance.now();
    
    // Replace all logging calls:
    // logInfo('message') → this.logger.info('message', { component: 'QueryOptimizer', action: 'getTenantsOptimized' })
    // logWarn('message') → this.logger.warn('message', { component: 'QueryOptimizer', action: 'getTenantsOptimized' })
    // logError('message') → this.logger.error('message', { component: 'QueryOptimizer', action: 'getTenantsOptimized' })
    const { data, error } = await supabase
      .from('tenants')
      .select(`
        id, name, slug, status, plan_type, created_at,
        tenant_members!inner(role)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
    
    const duration = performance.now() - startTime;
    logInfo(`[Query] Tenants: ${duration.toFixed(2)}ms`);
    
    if (error) throw error;
    
    this.setCache(cacheKey, data, this.DEFAULT_TTL);
    return data;
  }
  
  // Optimized notes queries with intelligent caching
  async getNotesOptimized(tenantId: string, limit = 50): Promise<any> {
    const cacheKey = `notes_${tenantId}_${limit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    const startTime = performance.now();
    
    const { data, error } = await supabase
      .from('notes')
      .select('id, title, content, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .order('updated_at', { ascending: false })
      .limit(limit);
    
    const duration = performance.now() - startTime;
    logInfo(`[Query] Notes: ${duration.toFixed(2)}ms`);
    
    if (error) throw error;
    
    this.setCache(cacheKey, data, this.FAST_TTL);
    return data;
  }
  
  // Optimized RPC calls with result caching
  async getTenantMetricsOptimized(tenantId: string): Promise<any> {
    const cacheKey = `metrics_${tenantId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    const startTime = performance.now();
    
    const { data, error } = await supabase
      .rpc('get_tenant_metrics_optimized', { 
        p_tenant_id: tenantId,
        p_include_details: false // Reduce payload
      });
    
    const duration = performance.now() - startTime;
    logInfo(`[RPC] Tenant Metrics: ${duration.toFixed(2)}ms`);
    
    if (error) throw error;
    
    this.setCache(cacheKey, data, 10000); // 10 second cache for metrics
    return data;
  }
  
  // Cache management
  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < entry.ttl) {
      return entry.data;
    }
    if (entry) this.cache.delete(key);
    return null;
  }
  
  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  // Cache invalidation
  invalidateCache(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

export const queryOptimizer = new QueryOptimizer();