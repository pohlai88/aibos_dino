#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env

/**
 * AIBOS Migration Script: In-Memory to Supabase
 * 
 * This script helps migrate your existing in-memory file system data to Supabase.
 * It will:
 * 1. Read your existing file system data
 * 2. Create the Supabase schema
 * 3. Migrate all files and folders
 * 4. Preserve file content and metadata
 * 5. Verify the migration
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size: number;
  path: string;
  created: string;
  modified: string;
  content?: string;
  mimeType?: string;
}

interface MigrationConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey?: string;
  sourceDataPath?: string;
  dryRun?: boolean;
}

class MigrationService {
  private config: MigrationConfig;
  private supabase: any;
  private migratedItems = 0;
  private errors: string[] = [];

  constructor(config: MigrationConfig) {
    this.config = config;
    this.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
  }

  async migrate() {
    console.log('🚀 Starting AIBOS File System Migration to Supabase...\n');

    try {
      await this.checkConnection();
      await this.createSchema();
      await this.migrateData();
      await this.verifyMigration();
      await this.generateReport();
      
      console.log('\n✅ Migration completed successfully!');
      console.log(`📊 Migrated ${this.migratedItems} items`);
      
      if (this.errors.length > 0) {
        console.log(`⚠️  ${this.errors.length} errors encountered`);
        this.errors.forEach(error => console.log(`   - ${error}`));
      }
    } catch (error) {
      console.error('\n❌ Migration failed:', error);
      Deno.exit(1);
    }
  }

  private async checkConnection() {
    console.log('🔍 Checking Supabase connection...');
    
    try {
      const { data, error } = await this.supabase.from('file_system_items').select('count').limit(1);
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      console.log('✅ Connection successful');
    } catch (error) {
      console.error('❌ Connection failed:', error);
      throw new Error('Failed to connect to Supabase. Please check your credentials.');
    }
  }

  private async createSchema() {
    console.log('\n📋 Creating database schema...');
    
    try {
      const schemaSQL = await this.readSchemaFile();
      
      if (!this.config.supabaseServiceKey) {
        console.log('⚠️  Service role key not provided. Please run the schema manually.');
        console.log('📝 Copy the contents of supabase/file-system-schema.sql to your Supabase SQL editor.');
        return;
      }

      const serviceSupabase = createClient(this.config.supabaseUrl, this.config.supabaseServiceKey);
      
      // Split SQL into individual statements
      const statements = schemaSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          const { error } = await serviceSupabase.rpc('exec_sql', { sql: statement });
          if (error) {
            console.warn('⚠️  Statement failed (this might be expected):', error.message);
          }
        }
      }
      
      console.log('✅ Schema creation completed');
    } catch (error) {
      console.log('⚠️  Schema creation failed. Please run the schema manually in Supabase SQL editor.');
    }
  }

  private async migrateData() {
    console.log('\n📦 Migrating file system data...');
    
    const sourceData = await this.loadSourceData();
    
    if (!sourceData || Object.keys(sourceData).length === 0) {
      console.log('ℹ️  No source data found. Starting with empty file system.');
      return;
    }

    console.log(`📁 Found ${Object.keys(sourceData).length} directories to migrate`);

    // Create a test user for migration (in production, you'd use real user IDs)
    const testUserId = await this.createTestUser();

    for (const [path, items] of Object.entries(sourceData)) {
      console.log(`📂 Migrating directory: ${path || 'root'}`);
      
      for (const item of items) {
        try {
          await this.migrateItem(item, path, testUserId);
          this.migratedItems++;
        } catch (error) {
          const errorMsg = `Failed to migrate ${item.name}: ${error}`;
          this.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }
    }
  }

  private async migrateItem(item: FileItem, path: string, userId: string) {
    if (this.config.dryRun) {
      console.log(`  [DRY RUN] Would migrate: ${item.name} (${item.type})`);
      return;
    }

    // Create or get default tenant for migration
    const tenantId = await this.getOrCreateDefaultTenant(userId);

    const itemData = {
      tenant_id: tenantId,
      path: path,
      name: item.name,
      type: item.type,
      size: item.size || 0,
      content: item.content,
      created_by: userId,
      created_at: item.created,
      updated_at: item.modified
    };

    const { error } = await this.supabase
      .from('file_system_items')
      .insert(itemData);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    console.log(`  ✅ Migrated: ${item.name} (${item.type})`);
  }

  private async getOrCreateDefaultTenant(userId: string): Promise<string> {
    // Try to find existing default tenant
    const { data: existingTenant } = await this.supabase
      .from('tenants')
      .select('id')
      .eq('name', 'Default Migration Tenant')
      .single();

    if (existingTenant) {
      return existingTenant.id;
    }

    // Create new default tenant
    const tenantData = {
      id: crypto.randomUUID(),
      name: 'Default Migration Tenant',
      subscription_tier: 'free',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newTenant, error: tenantError } = await this.supabase
      .from('tenants')
      .insert([tenantData])
      .select()
      .single();

    if (tenantError) {
      throw new Error(`Failed to create tenant: ${tenantError.message}`);
    }

    // Add user as tenant owner
    const memberData = {
      tenant_id: newTenant.id,
      user_id: userId,
      role: 'owner',
      joined_at: new Date().toISOString()
    };

    const { error: memberError } = await this.supabase
      .from('tenant_members')
      .insert([memberData]);

    if (memberError) {
      console.warn(`⚠️  Failed to add user as tenant member: ${memberError.message}`);
    }

    return newTenant.id;
  }

  private async createTestUser(): Promise<string> {
    // In a real migration, you'd use actual user IDs
    // For this demo, we'll create a test user or use a default
    const testUserId = '00000000-0000-0000-0000-000000000000';
    
    try {
      // Try to create a test user in the auth.users table
      if (this.config.supabaseServiceKey) {
        const serviceSupabase = createClient(this.config.supabaseUrl, this.config.supabaseServiceKey);
        
        const { data, error } = await serviceSupabase.auth.admin.createUser({
          email: 'migration@aibos.local',
          password: 'migration-temp-password-123',
          email_confirm: true
        });

        if (!error && data.user) {
          return data.user.id;
        }
      }
    } catch (error) {
      console.log('⚠️  Could not create test user, using default ID');
    }

    return testUserId;
  }

  private async loadSourceData(): Promise<Record<string, FileItem[]> | null> {
    console.log('📖 Loading source data...');
    
    try {
      // Try to load from the old in-memory file system
      const sourcePath = this.config.sourceDataPath || 'api/files.ts';
      const sourceContent = await Deno.readTextFile(sourcePath);
      
      // Extract the fileSystem object from the source file
      const fileSystemMatch = sourceContent.match(/const fileSystem = ({[\s\S]*?});/);
      
      if (fileSystemMatch) {
        const fileSystemStr = fileSystemMatch[1];
        // Convert the object string to actual object
        const fileSystem = eval(`(${fileSystemStr})`);
        return fileSystem;
      }
      
      console.log('ℹ️  No file system data found in source file');
      return null;
    } catch (error) {
      console.log('ℹ️  Could not load source data:', error.message);
      return null;
    }
  }

  private async verifyMigration() {
    console.log('\n🔍 Verifying migration...');
    
    try {
      const { data, error } = await this.supabase
        .from('file_system_items')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      console.log(`✅ Verification complete: ${data?.length || 0} items found in database`);
      
      if (data && data.length > 0) {
        console.log('📋 Sample migrated items:');
        data.slice(0, 5).forEach(item => {
          console.log(`   - ${item.name} (${item.type}) in ${item.path}`);
        });
      }
    } catch (error) {
      console.error('❌ Verification failed:', error);
    }
  }

  private async generateReport() {
    console.log('\n📊 Generating migration report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      migratedItems: this.migratedItems,
      errors: this.errors,
      config: {
        supabaseUrl: this.config.supabaseUrl,
        dryRun: this.config.dryRun
      }
    };

    try {
      await Deno.writeTextFile('migration-report.json', JSON.stringify(report, null, 2));
      console.log('✅ Migration report saved: migration-report.json');
    } catch (error) {
      console.log('⚠️  Failed to save migration report:', error);
    }
  }

  private async readSchemaFile(): Promise<string> {
    try {
      return await Deno.readTextFile('supabase/file-system-schema.sql');
    } catch (error) {
      console.log('⚠️  Schema file not found. Please create supabase/file-system-schema.sql');
      return '';
    }
  }
}

// Main execution
async function main() {
  console.log('🎯 AIBOS File System Migration to Supabase');
  console.log('==========================================\n');

  // Parse command line arguments
  const args = Deno.args;
  const dryRun = args.includes('--dry-run');
  const sourceDataPath = args.find(arg => arg.startsWith('--source='))?.split('=')[1];

  // Get configuration from environment or prompt user
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || prompt('Enter your Supabase URL:');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || prompt('Enter your Supabase anon key:');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || prompt('Enter your Supabase service role key (optional):');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase URL and anon key are required');
    Deno.exit(1);
  }

  const config: MigrationConfig = {
    supabaseUrl: supabaseUrl!,
    supabaseAnonKey: supabaseAnonKey!,
    supabaseServiceKey: supabaseServiceKey || undefined,
    sourceDataPath,
    dryRun
  };

  if (dryRun) {
    console.log('🧪 DRY RUN MODE - No actual data will be migrated\n');
  }

  const migration = new MigrationService(config);
  await migration.migrate();
}

// Run the migration
if (import.meta.main) {
  main().catch(console.error);
} 