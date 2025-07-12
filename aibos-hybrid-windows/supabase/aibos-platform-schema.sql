-- AIBOS Platform Schema for Supabase
-- This schema provides a complete platform for app store, tenant management, and app integration

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TENANT MANAGEMENT
-- ============================================================================

-- Tenants/Organizations table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    website_url TEXT,
    contact_email TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending', 'cancelled')),
    plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'basic', 'pro', 'enterprise')),
    max_users INTEGER DEFAULT 5,
    max_storage_gb INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Tenant members/users
CREATE TABLE IF NOT EXISTS tenant_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    permissions JSONB DEFAULT '{}',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(tenant_id, user_id)
);

-- Tenant settings
CREATE TABLE IF NOT EXISTS tenant_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
    language TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'UTC',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    auto_backup_enabled BOOLEAN DEFAULT TRUE,
    security_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- APP STORE SYSTEM
-- ============================================================================

-- App categories
CREATE TABLE IF NOT EXISTS app_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT DEFAULT '#3B82F6',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- App store applications
CREATE TABLE IF NOT EXISTS apps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    long_description TEXT,
    version TEXT NOT NULL,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    category_id UUID REFERENCES app_categories(id) ON DELETE SET NULL,
    icon_url TEXT,
    screenshots JSONB DEFAULT '[]',
    download_url TEXT,
    repository_url TEXT,
    website_url TEXT,
    price DECIMAL(10,2) DEFAULT 0.00,
    is_free BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived', 'rejected')),
    downloads_count INTEGER DEFAULT 0,
    rating_average DECIMAL(3,2) DEFAULT 0.00,
    rating_count INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    requirements JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- App versions
CREATE TABLE IF NOT EXISTS app_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    changelog TEXT,
    download_url TEXT,
    file_size BIGINT,
    checksum TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    release_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(app_id, version)
);

-- App installations per tenant
CREATE TABLE IF NOT EXISTS app_installations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
    version_id UUID REFERENCES app_versions(id) ON DELETE SET NULL,
    installed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'installed' CHECK (status IN ('installing', 'installed', 'failed', 'uninstalled')),
    config JSONB DEFAULT '{}',
    permissions JSONB DEFAULT '{}',
    installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, app_id)
);

-- App reviews and ratings
CREATE TABLE IF NOT EXISTS app_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(app_id, user_id, tenant_id)
);

-- ============================================================================
-- APP INTEGRATION SYSTEM
-- ============================================================================

-- App integration configurations
CREATE TABLE IF NOT EXISTS app_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    integration_type TEXT NOT NULL CHECK (integration_type IN ('api', 'webhook', 'database', 'file_system', 'auth', 'storage')),
    config JSONB NOT NULL DEFAULT '{}',
    credentials JSONB DEFAULT '{}',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(app_id, tenant_id, integration_type)
);

-- App data schemas
CREATE TABLE IF NOT EXISTS app_data_schemas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    schema_name TEXT NOT NULL,
    schema_definition JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(app_id, tenant_id, schema_name)
);

-- App data storage
CREATE TABLE IF NOT EXISTS app_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    schema_id UUID REFERENCES app_data_schemas(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- FILE SYSTEM INTEGRATION
-- ============================================================================

-- Enhanced file system items with app integration
CREATE TABLE IF NOT EXISTS file_system_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    app_id UUID REFERENCES apps(id) ON DELETE SET NULL,
    path TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('file', 'folder')),
    size BIGINT DEFAULT 0,
    content TEXT,
    mime_type TEXT DEFAULT 'text/plain',
    metadata JSONB DEFAULT '{}',
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    parent_id UUID REFERENCES file_system_items(id) ON DELETE CASCADE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    UNIQUE(tenant_id, path, name)
);

-- ============================================================================
-- NOTIFICATION SYSTEM
-- ============================================================================

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    app_id UUID REFERENCES apps(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- AUDIT AND ANALYTICS
-- ============================================================================

-- Audit trail for all operations
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    app_id UUID REFERENCES apps(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage analytics
CREATE TABLE IF NOT EXISTS usage_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    app_id UUID REFERENCES apps(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Tenant indexes
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan_type);

-- Tenant members indexes
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant ON tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user ON tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_role ON tenant_members(role);

-- App indexes
CREATE INDEX IF NOT EXISTS idx_apps_slug ON apps(slug);
CREATE INDEX IF NOT EXISTS idx_apps_category ON apps(category_id);
CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status);
CREATE INDEX IF NOT EXISTS idx_apps_featured ON apps(is_featured);
CREATE INDEX IF NOT EXISTS idx_apps_verified ON apps(is_verified);
CREATE INDEX IF NOT EXISTS idx_apps_tags ON apps USING GIN(tags);

-- App installations indexes
CREATE INDEX IF NOT EXISTS idx_app_installations_tenant ON app_installations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_app_installations_app ON app_installations(app_id);
CREATE INDEX IF NOT EXISTS idx_app_installations_status ON app_installations(status);

-- File system indexes
CREATE INDEX IF NOT EXISTS idx_file_system_tenant_path ON file_system_items(tenant_id, path);
CREATE INDEX IF NOT EXISTS idx_file_system_app ON file_system_items(app_id);
CREATE INDEX IF NOT EXISTS idx_file_system_type ON file_system_items(type);
CREATE INDEX IF NOT EXISTS idx_file_system_created ON file_system_items(created_at);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- Audit indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_usage_analytics_tenant ON usage_analytics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_app ON usage_analytics(app_id);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_event ON usage_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_created ON usage_analytics(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_data_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_system_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;

-- Tenant policies
CREATE POLICY "Users can view their own tenants" ON tenants
    FOR SELECT USING (id IN (
        SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Tenant owners can update their tenants" ON tenants
    FOR UPDATE USING (id IN (
        SELECT tenant_id FROM tenant_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- Tenant members policies
CREATE POLICY "Users can view tenant members" ON tenant_members
    FOR SELECT USING (tenant_id IN (
        SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Admins can manage tenant members" ON tenant_members
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM tenant_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- App policies (public read, authenticated write)
CREATE POLICY "Anyone can view published apps" ON apps
    FOR SELECT USING (status = 'published');

CREATE POLICY "App authors can manage their apps" ON apps
    FOR ALL USING (author_id = auth.uid());

-- App installations policies
CREATE POLICY "Users can view their tenant's app installations" ON app_installations
    FOR SELECT USING (tenant_id IN (
        SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Admins can manage app installations" ON app_installations
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM tenant_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- File system policies
CREATE POLICY "Users can access their tenant's files" ON file_system_items
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    ));

-- Notification policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- ============================================================================

-- Function to create a new tenant
CREATE OR REPLACE FUNCTION create_tenant(
    p_name TEXT,
    p_slug TEXT,
    p_description TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_tenant_id UUID;
    v_user_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not authenticated',
            'code', 'UNAUTHENTICATED'
        );
    END IF;

    -- Create tenant
    INSERT INTO tenants (name, slug, description, created_by)
    VALUES (p_name, p_slug, p_description, v_user_id)
    RETURNING id INTO v_tenant_id;

    -- Add user as owner
    INSERT INTO tenant_members (tenant_id, user_id, role)
    VALUES (v_tenant_id, v_user_id, 'owner');

    -- Create default settings
    INSERT INTO tenant_settings (tenant_id)
    VALUES (v_tenant_id);

    RETURN json_build_object(
        'success', true,
        'data', json_build_object(
            'id', v_tenant_id,
            'name', p_name,
            'slug', p_slug
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to install an app for a tenant
CREATE OR REPLACE FUNCTION install_app(
    p_app_id UUID,
    p_tenant_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_installation_id UUID;
    v_latest_version_id UUID;
BEGIN
    -- Check if user has permission
    IF NOT EXISTS (
        SELECT 1 FROM tenant_members 
        WHERE tenant_id = p_tenant_id 
          AND user_id = auth.uid() 
          AND role IN ('owner', 'admin')
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Insufficient permissions',
            'code', 'INSUFFICIENT_PERMISSIONS'
        );
    END IF;

    -- Get latest version
    SELECT id INTO v_latest_version_id
    FROM app_versions
    WHERE app_id = p_app_id AND is_active = TRUE
    ORDER BY release_date DESC
    LIMIT 1;

    -- Create installation
    INSERT INTO app_installations (tenant_id, app_id, version_id, installed_by)
    VALUES (p_tenant_id, p_app_id, v_latest_version_id, auth.uid())
    RETURNING id INTO v_installation_id;

    -- Increment download count
    UPDATE apps 
    SET downloads_count = downloads_count + 1
    WHERE id = p_app_id;

    RETURN json_build_object(
        'success', true,
        'data', json_build_object(
            'installation_id', v_installation_id,
            'app_id', p_app_id,
            'tenant_id', p_tenant_id
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get tenant apps
CREATE OR REPLACE FUNCTION get_tenant_apps(p_tenant_id UUID)
RETURNS TABLE (
    app_id UUID,
    app_name TEXT,
    app_slug TEXT,
    app_description TEXT,
    app_icon TEXT,
    app_version TEXT,
    installation_status TEXT,
    installed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        a.slug,
        a.description,
        a.icon_url,
        av.version,
        ai.status,
        ai.installed_at
    FROM apps a
    LEFT JOIN app_installations ai ON a.id = ai.app_id AND ai.tenant_id = p_tenant_id
    LEFT JOIN app_versions av ON ai.version_id = av.id
    WHERE a.status = 'published'
    ORDER BY a.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS FOR AUTOMATION
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_apps_updated_at
    BEFORE UPDATE ON apps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_system_items_updated_at
    BEFORE UPDATE ON file_system_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to create default settings for new tenants
CREATE OR REPLACE FUNCTION handle_new_tenant()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO tenant_settings (tenant_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_tenant_created
    AFTER INSERT ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_tenant();

-- ============================================================================
-- SAMPLE DATA
-- ============================================================================

-- Insert default app categories
INSERT INTO app_categories (name, slug, description, icon, color, sort_order) VALUES
('Productivity', 'productivity', 'Tools to boost your productivity', '📊', '#10B981', 1),
('Development', 'development', 'Development and coding tools', '💻', '#3B82F6', 2),
('Communication', 'communication', 'Team communication tools', '💬', '#8B5CF6', 3),
('Design', 'design', 'Design and creative tools', '🎨', '#F59E0B', 4),
('Utilities', 'utilities', 'System utilities and tools', '🔧', '#6B7280', 5)
ON CONFLICT (slug) DO NOTHING;

-- Insert sample apps
INSERT INTO apps (name, slug, description, category_id, icon_url, is_free, status, author_id) VALUES
('File Manager', 'file-manager', 'Advanced file management system', 
 (SELECT id FROM app_categories WHERE slug = 'utilities'), 
 '📁', TRUE, 'published', NULL),
('Code Editor', 'code-editor', 'Powerful code editor with syntax highlighting',
 (SELECT id FROM app_categories WHERE slug = 'development'),
 '📝', TRUE, 'published', NULL),
('Task Manager', 'task-manager', 'Project and task management tool',
 (SELECT id FROM app_categories WHERE slug = 'productivity'),
 '✅', TRUE, 'published', NULL)
ON CONFLICT (slug) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE tenants IS 'Organizations/tenants using the AIBOS platform';
COMMENT ON TABLE tenant_members IS 'Users belonging to tenants with specific roles';
COMMENT ON TABLE apps IS 'Applications available in the app store';
COMMENT ON TABLE app_installations IS 'Apps installed by tenants';
COMMENT ON TABLE app_integrations IS 'Integration configurations for apps';
COMMENT ON TABLE file_system_items IS 'File system items with app integration';
COMMENT ON TABLE notifications IS 'User notifications from apps and system';
COMMENT ON TABLE audit_logs IS 'Audit trail for all platform operations';
COMMENT ON TABLE usage_analytics IS 'Usage analytics and metrics'; 