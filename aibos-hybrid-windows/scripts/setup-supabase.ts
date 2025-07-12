#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env

/**
 * AIBOS Supabase Setup Script
 * 
 * This script helps you set up Supabase for the AIBOS hybrid Windows file system.
 * It will:
 * 1. Check your Supabase configuration
 * 2. Create the database schema
 * 3. Set up authentication
 * 4. Configure storage
 * 5. Test the connection
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

interface SetupConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey?: string;
}

class SupabaseSetup {
  private config: SetupConfig;
  private supabase: any;

  constructor(config: SetupConfig) {
    this.config = config;
    this.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
  }

  async run() {
    console.log('🚀 Starting AIBOS Supabase Setup...\n');

    try {
      await this.checkConnection();
      await this.createSchema();
      await this.setupStorage();
      await this.testOperations();
      await this.generateConfig();
      
      console.log('\n✅ Setup completed successfully!');
      console.log('🎉 Your AIBOS file system is ready to use with Supabase.');
    } catch (error) {
      console.error('\n❌ Setup failed:', error);
      Deno.exit(1);
    }
  }

  private async checkConnection() {
    console.log('🔍 Checking Supabase connection...');
    
    try {
      const { data, error } = await this.supabase.from('file_system_items').select('count').limit(1);
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist (expected)
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
    
    const schemaSQL = await this.readSchemaFile();
    
    try {
      // Note: This requires the service role key for schema creation
      if (!this.config.supabaseServiceKey) {
        console.log('⚠️  Service role key not provided. Please run the schema manually in Supabase SQL editor.');
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
      console.log('📝 Copy the contents of supabase/file-system-schema.sql to your Supabase SQL editor.');
    }
  }

  private async setupStorage() {
    console.log('\n📦 Setting up storage buckets...');
    
    try {
      // Create storage bucket for file uploads
      const { data, error } = await this.supabase.storage.createBucket('aibos-files', {
        public: false,
        allowedMimeTypes: [
          'text/plain',
          'text/html',
          'text/css',
          'text/javascript',
          'application/json',
          'image/png',
          'image/jpeg',
          'image/gif',
          'application/pdf'
        ],
        fileSizeLimit: 10485760 // 10MB
      });

      if (error && error.message !== 'Bucket already exists') {
        throw error;
      }
      
      console.log('✅ Storage bucket created');
    } catch (error) {
      console.log('⚠️  Storage setup failed. You can create the bucket manually in Supabase dashboard.');
    }
  }

  private async testOperations() {
    console.log('\n🧪 Testing file system operations...');
    
    try {
      // Test creating a folder
      const { data: folderData, error: folderError } = await this.supabase
        .rpc('create_folder', { p_path: '', p_name: 'test-folder' });
      
      if (folderError) {
        console.log('⚠️  Folder creation test failed. Make sure the schema is created.');
        return;
      }

      // Test listing items
      const { data: listData, error: listError } = await this.supabase
        .rpc('get_file_system_tree', { p_path: '' });
      
      if (listError) {
        console.log('⚠️  List operation test failed.');
        return;
      }

      // Clean up test data
      if (folderData?.success && folderData.data?.id) {
        await this.supabase.rpc('delete_item', { p_item_id: folderData.data.id });
      }
      
      console.log('✅ Operations test completed');
    } catch (error) {
      console.log('⚠️  Operations test failed. This is expected if the schema is not created yet.');
    }
  }

  private async generateConfig() {
    console.log('\n⚙️  Generating configuration files...');
    
    const configContent = `// AIBOS Supabase Configuration
// Generated on ${new Date().toISOString()}

export const SUPABASE_CONFIG = {
  url: '${this.config.supabaseUrl}',
  anonKey: '${this.config.supabaseAnonKey}',
  serviceKey: '${this.config.supabaseServiceKey || ''}',
  options: {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
};

export const STORAGE_CONFIG = {
  bucket: 'aibos-files',
  allowedMimeTypes: [
    'text/plain',
    'text/html', 
    'text/css',
    'text/javascript',
    'application/json',
    'image/png',
    'image/jpeg',
    'image/gif',
    'application/pdf'
  ],
  maxFileSize: 10485760 // 10MB
};

export const API_CONFIG = {
  baseUrl: '${this.config.supabaseUrl}/rest/v1',
  headers: {
    'apikey': '${this.config.supabaseAnonKey}',
    'Authorization': 'Bearer ${this.config.supabaseAnonKey}',
    'Content-Type': 'application/json'
  }
};
`;

    try {
      await Deno.writeTextFile('src/config/supabase-config.ts', configContent);
      console.log('✅ Configuration file generated: src/config/supabase-config.ts');
    } catch (error) {
      console.log('⚠️  Failed to generate config file:', error);
    }

    // Generate .env template
    const envTemplate = `# AIBOS Supabase Configuration
SUPABASE_URL=${this.config.supabaseUrl}
SUPABASE_ANON_KEY=${this.config.supabaseAnonKey}
SUPABASE_SERVICE_ROLE_KEY=${this.config.supabaseServiceKey || 'your-service-role-key'}

# Development Settings
NODE_ENV=development
PORT=8000

# Optional Settings
SUPABASE_STORAGE_BUCKET=aibos-files
SUPABASE_REALTIME_ENABLED=true
ENABLE_PATH_VALIDATION=true
MAX_FILE_SIZE=10485760
`;

    try {
      await Deno.writeTextFile('.env.template', envTemplate);
      console.log('✅ Environment template generated: .env.template');
    } catch (error) {
      console.log('⚠️  Failed to generate env template:', error);
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
  console.log('🎯 AIBOS Supabase Setup');
  console.log('========================\n');

  // Get configuration from environment or prompt user
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || prompt('Enter your Supabase URL:');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || prompt('Enter your Supabase anon key:');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || prompt('Enter your Supabase service role key (optional):');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase URL and anon key are required');
    Deno.exit(1);
  }

  const config: SetupConfig = {
    supabaseUrl: supabaseUrl!,
    supabaseAnonKey: supabaseAnonKey!,
    supabaseServiceKey: supabaseServiceKey || undefined
  };

  const setup = new SupabaseSetup(config);
  await setup.run();
}

// Run the setup
if (import.meta.main) {
  main().catch(console.error);
} 