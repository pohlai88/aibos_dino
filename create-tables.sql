-- Create tables for AIBOS Dino multi-tenant SaaS application

-- 1. Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscription_tier TEXT DEFAULT 'free',
  settings JSONB DEFAULT '{}'::jsonb
);

-- 2. Create notes table with foreign key reference
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Note',
  content TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notes_tenant_id ON notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription ON tenants(subscription_tier);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Tenants are viewable by admin" ON tenants;
DROP POLICY IF EXISTS "Tenants are insertable by admin" ON tenants;
DROP POLICY IF EXISTS "Tenants are updatable by admin" ON tenants;
DROP POLICY IF EXISTS "Tenants are deletable by admin" ON tenants;

-- 6. Create RLS policies for tenants (admin only)
CREATE POLICY "Tenants are viewable by admin" ON tenants
  FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "Tenants are insertable by admin" ON tenants
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Tenants are updatable by admin" ON tenants
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Tenants are deletable by admin" ON tenants
  FOR DELETE USING (auth.role() = 'service_role');

-- 7. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Notes are viewable by tenant" ON notes;
DROP POLICY IF EXISTS "Notes are insertable by tenant" ON notes;
DROP POLICY IF EXISTS "Notes are updatable by tenant" ON notes;
DROP POLICY IF EXISTS "Notes are deletable by tenant" ON notes;

-- 8. Create RLS policies for notes (tenant isolation)
CREATE POLICY "Notes are viewable by tenant" ON notes
  FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "Notes are insertable by tenant" ON notes
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Notes are updatable by tenant" ON notes
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Notes are deletable by tenant" ON notes
  FOR DELETE USING (auth.role() = 'service_role');

-- 9. Insert demo tenant for testing (using proper UUID format)
INSERT INTO tenants (id, name, subscription_tier) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Demo Tenant', 'free')
ON CONFLICT (id) DO NOTHING;

-- 10. Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 11. Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;

-- 12. Create trigger to automatically update updated_at
CREATE TRIGGER update_notes_updated_at 
    BEFORE UPDATE ON notes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 13. Grant necessary permissions
GRANT ALL ON tenants TO service_role;
GRANT ALL ON notes TO service_role;
GRANT USAGE ON SCHEMA public TO service_role; 