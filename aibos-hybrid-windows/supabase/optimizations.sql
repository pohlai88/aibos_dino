-- Performance Indexes for Critical Queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenants_status_created 
  ON tenants(status, created_at DESC) 
  WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notes_tenant_updated 
  ON notes(tenant_id, updated_at DESC) 
  WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_members_tenant_role 
  ON tenant_members(tenant_id, role);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_system_tenant_path 
  ON file_system_items(tenant_id, path) 
  WHERE is_deleted = false;

-- Optimized RPC Function for Tenant Metrics
CREATE OR REPLACE FUNCTION get_tenant_metrics_optimized(
  p_tenant_id UUID,
  p_include_details BOOLEAN DEFAULT false
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  member_count INTEGER;
  note_count INTEGER;
  storage_used BIGINT;
  last_activity TIMESTAMP;
BEGIN
  -- Fast aggregation queries with proper indexes
  SELECT COUNT(*) INTO member_count 
  FROM tenant_members 
  WHERE tenant_id = p_tenant_id;
  
  SELECT COUNT(*), MAX(updated_at) INTO note_count, last_activity
  FROM notes 
  WHERE tenant_id = p_tenant_id AND is_deleted = false;
  
  SELECT COALESCE(SUM(size), 0) INTO storage_used 
  FROM file_system_items 
  WHERE tenant_id = p_tenant_id AND is_deleted = false;
  
  -- Build optimized result with minimal payload
  result := json_build_object(
    'member_count', member_count,
    'note_count', note_count,
    'storage_used', storage_used,
    'last_activity', last_activity,
    'generated_at', NOW()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Materialized View for Heavy Analytics (Refreshed every 5 minutes)
CREATE MATERIALIZED VIEW IF NOT EXISTS tenant_analytics AS
SELECT 
  t.id as tenant_id,
  t.name,
  t.plan_type,
  COUNT(DISTINCT tm.id) as member_count,
  COUNT(DISTINCT n.id) as note_count,
  COALESCE(SUM(fsi.size), 0) as storage_used,
  MAX(n.updated_at) as last_activity,
  t.created_at
FROM tenants t
LEFT JOIN tenant_members tm ON t.id = tm.tenant_id
LEFT JOIN notes n ON t.id = n.tenant_id AND n.is_deleted = false
LEFT JOIN file_system_items fsi ON t.id = fsi.tenant_id AND fsi.is_deleted = false
WHERE t.status = 'active'
GROUP BY t.id, t.name, t.plan_type, t.created_at;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS tenant_analytics_tenant_id_idx 
  ON tenant_analytics(tenant_id);

-- Function to refresh analytics (called by cron or trigger)
CREATE OR REPLACE FUNCTION refresh_tenant_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY tenant_analytics;
END;
$$ LANGUAGE plpgsql;

-- Optimized function for fast tenant list with pagination
CREATE OR REPLACE FUNCTION get_tenants_paginated(
  p_page INTEGER DEFAULT 0,
  p_limit INTEGER DEFAULT 20,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  slug TEXT,
  status TEXT,
  plan_type TEXT,
  member_count BIGINT,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.slug,
    t.status,
    t.plan_type,
    ta.member_count,
    t.created_at
  FROM tenants t
  LEFT JOIN tenant_analytics ta ON t.id = ta.tenant_id
  WHERE t.status = 'active'
    AND (p_user_id IS NULL OR EXISTS (
      SELECT 1 FROM tenant_members tm 
      WHERE tm.tenant_id = t.id AND tm.user_id = p_user_id
    ))
  ORDER BY t.created_at DESC
  LIMIT p_limit OFFSET (p_page * p_limit);
END;
$$ LANGUAGE plpgsql STABLE;