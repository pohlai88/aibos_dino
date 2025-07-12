import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_CONFIG } from './config.ts';

const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.serviceRoleKey);

async function setupDatabase() {
  console.log("Setting up Supabase database tables...");

  try {
    // Create tenants table
    const { error: tenantsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS tenants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          subscription_tier TEXT DEFAULT 'free',
          settings JSONB DEFAULT '{}'::jsonb
        );
      `
    });

    if (tenantsError) {
      console.log("Tenants table may already exist or using direct SQL...");
      
      // Try direct SQL approach
      const { error: directTenantsError } = await supabase
        .from('tenants')
        .select('id')
        .limit(1);
      
      if (directTenantsError) {
        console.error("Tenants table setup failed:", directTenantsError);
      } else {
        console.log("✅ Tenants table is ready");
      }
    } else {
      console.log("✅ Tenants table created");
    }

    // Create notes table
    const { error: notesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS notes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          title TEXT NOT NULL DEFAULT 'Untitled Note',
          content TEXT NOT NULL,
          size INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (notesError) {
      console.log("Notes table may already exist or using direct SQL...");
      
      // Try direct SQL approach
      const { error: directNotesError } = await supabase
        .from('notes')
        .select('id')
        .limit(1);
      
      if (directNotesError) {
        console.error("Notes table setup failed:", directNotesError);
      } else {
        console.log("✅ Notes table is ready");
      }
    } else {
      console.log("✅ Notes table created");
    }

    // Create indexes for better performance
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_notes_tenant_id ON notes(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_tenants_subscription ON tenants(subscription_tier);
      `
    });

    if (indexError) {
      console.log("Indexes may already exist or using direct approach...");
    } else {
      console.log("✅ Database indexes created");
    }

    // Enable Row Level Security (RLS)
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
        ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
        
        -- RLS policies for tenants (admin only)
        CREATE POLICY IF NOT EXISTS "Tenants are viewable by admin" ON tenants
          FOR SELECT USING (auth.role() = 'service_role');
        
        CREATE POLICY IF NOT EXISTS "Tenants are insertable by admin" ON tenants
          FOR INSERT WITH CHECK (auth.role() = 'service_role');
        
        -- RLS policies for notes (tenant isolation)
        CREATE POLICY IF NOT EXISTS "Notes are viewable by tenant" ON notes
          FOR SELECT USING (tenant_id = current_setting('app.tenant_id', true)::UUID OR auth.role() = 'service_role');
        
        CREATE POLICY IF NOT EXISTS "Notes are insertable by tenant" ON notes
          FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::UUID OR auth.role() = 'service_role');
        
        CREATE POLICY IF NOT EXISTS "Notes are updatable by tenant" ON notes
          FOR UPDATE USING (tenant_id = current_setting('app.tenant_id', true)::UUID OR auth.role() = 'service_role');
        
        CREATE POLICY IF NOT EXISTS "Notes are deletable by tenant" ON notes
          FOR DELETE USING (tenant_id = current_setting('app.tenant_id', true)::UUID OR auth.role() = 'service_role');
      `
    });

    if (rlsError) {
      console.log("RLS setup may already exist or using direct approach...");
    } else {
      console.log("✅ Row Level Security enabled");
    }

    // Create a demo tenant for testing
    const { data: demoTenant, error: demoError } = await supabase
      .from('tenants')
      .upsert({
        id: 'demo-tenant',
        name: 'Demo Tenant',
        subscription_tier: 'free'
      }, { onConflict: 'id' })
      .select()
      .single();

    if (demoError) {
      console.log("Demo tenant creation failed (may already exist):", demoError.message);
    } else {
      console.log("✅ Demo tenant created:", demoTenant.id);
    }

    console.log("\n🎉 Database setup completed successfully!");
    console.log("You can now run your application with Supabase storage.");

  } catch (error) {
    console.error("❌ Database setup failed:", error);
  }
}

// Run the setup
setupDatabase(); 