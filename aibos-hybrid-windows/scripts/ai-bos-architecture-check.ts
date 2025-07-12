#!/usr/bin/env -S deno run --allow-net --allow-env

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { SUPABASE_CONFIG } from "../../config.ts";
import * as path from "https://deno.land/std@0.220.1/path/mod.ts";

const supabase = createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.serviceRoleKey
);

// Load canonical registry
async function loadCanonicalRegistry(): Promise<any> {
  try {
    const registryPath = path.join(Deno.cwd(), "workspace-canonical.json");
    const registryContent = await Deno.readTextFile(registryPath);
    return JSON.parse(registryContent);
  } catch (error) {
    console.error("❌ Failed to load workspace-canonical.json:", error);
    throw new Error("Canonical registry not found. SSOT validation cannot proceed.");
  }
}

// SSOT Validation Functions
async function validateSSOT(): Promise<{ violations: string[]; warnings: string[] }> {
  const registry = await loadCanonicalRegistry();
  const violations: string[] = [];
  const warnings: string[] = [];

  console.log("🔍 Validating Single Source of Truth...");

  // Check for forbidden files
  for (const pattern of registry.forbidden.patterns) {
    const forbiddenFiles = await findFilesByPattern(pattern);
    for (const file of forbiddenFiles) {
      violations.push(`Forbidden file found: ${file}`);
    }
  }

  // Check for duplicate schema files
  const schemaFiles = await findFilesByPattern("**/*-schema.sql");
  if (schemaFiles.length > 1) {
    violations.push(`Multiple schema files found: ${schemaFiles.join(", ")}`);
  }

  // Check for test files in production
  const testFiles = await findFilesByPattern("**/test-*.ts");
  if (testFiles.length > 0) {
    violations.push(`Test files found in production workspace: ${testFiles.join(", ")}`);
  }

  // Validate canonical files exist
  for (const category of Object.keys(registry)) {
    if (category === "forbidden" || category === "aiAgentBoundaries") continue;
    
    const categoryData = registry[category];
    if (categoryData.files) {
      for (const file of categoryData.files) {
        try {
          await Deno.stat(file);
        } catch {
          warnings.push(`Canonical file missing: ${file}`);
        }
      }
    }
  }

  return { violations, warnings };
}

async function findFilesByPattern(pattern: string): Promise<string[]> {
  const files: string[] = [];
  
  // Simple pattern matching for common cases
  if (pattern.includes("test-*.ts")) {
    for await (const entry of Deno.readDir(".")) {
      if (entry.isFile && entry.name.startsWith("test-") && entry.name.endsWith(".ts")) {
        files.push(entry.name);
      }
    }
  }
  
  if (pattern.includes("*-schema.sql")) {
    for await (const entry of Deno.readDir(".")) {
      if (entry.isFile && entry.name.includes("schema") && entry.name.endsWith(".sql")) {
        files.push(entry.name);
      }
    }
  }

  // Check subdirectories
  for await (const entry of Deno.readDir(".")) {
    if (entry.isDirectory && !entry.name.startsWith(".")) {
      try {
        for await (const subEntry of Deno.readDir(entry.name)) {
          if (subEntry.isFile) {
            const fullPath = `${entry.name}/${subEntry.name}`;
            
            if (pattern.includes("test-*.ts") && subEntry.name.startsWith("test-") && subEntry.name.endsWith(".ts")) {
              files.push(fullPath);
            }
            
            if (pattern.includes("*-schema.sql") && subEntry.name.includes("schema") && subEntry.name.endsWith(".sql")) {
              files.push(fullPath);
            }
          }
        }
      } catch {
        // Skip directories we can't read
      }
    }
  }

  return files;
}

// Expected table structure for AI-BOS platform
const expectedTables = {
  // Core platform tables
  tenants: [
    "id",
    "name", 
    "slug",
    "description",
    "logo_url",
    "website_url",
    "contact_email",
    "status",
    "plan_type",
    "max_users",
    "max_storage_gb",
    "created_at",
    "updated_at",
    "created_by"
  ],
  tenant_members: [
    "id",
    "tenant_id",
    "user_id", 
    "role",
    "permissions",
    "joined_at",
    "invited_by"
  ],
  tenant_settings: [
    "id",
    "tenant_id",
    "theme",
    "language",
    "timezone",
    "notifications_enabled",
    "auto_backup_enabled",
    "security_settings",
    "created_at",
    "updated_at"
  ],

  // App store system
  app_categories: [
    "id",
    "name",
    "slug", 
    "description",
    "icon",
    "color",
    "sort_order",
    "is_active",
    "created_at"
  ],
  apps: [
    "id",
    "name",
    "slug",
    "description", 
    "long_description",
    "version",
    "author_id",
    "category_id",
    "icon_url",
    "screenshots",
    "download_url",
    "repository_url",
    "website_url",
    "price",
    "is_free",
    "is_featured",
    "is_verified",
    "status",
    "downloads_count",
    "rating_average",
    "rating_count",
    "tags",
    "requirements",
    "metadata",
    "created_at",
    "updated_at"
  ],
  app_versions: [
    "id",
    "app_id",
    "version",
    "changelog",
    "download_url",
    "file_size",
    "checksum",
    "is_active",
    "release_date",
    "created_at"
  ],
  app_installations: [
    "id",
    "tenant_id",
    "app_id",
    "version_id",
    "installed_by",
    "status",
    "config",
    "permissions",
    "installed_at",
    "updated_at"
  ],
  app_reviews: [
    "id",
    "app_id",
    "user_id",
    "tenant_id",
    "rating",
    "review",
    "is_verified_purchase",
    "created_at",
    "updated_at"
  ],

  // App integration system
  app_integrations: [
    "id",
    "app_id",
    "tenant_id",
    "integration_type",
    "config",
    "credentials",
    "status",
    "last_sync_at",
    "error_message",
    "created_at",
    "updated_at"
  ],
  app_data_schemas: [
    "id",
    "app_id",
    "tenant_id",
    "schema_name",
    "schema_definition",
    "is_active",
    "created_at",
    "updated_at"
  ],
  app_data: [
    "id",
    "app_id",
    "tenant_id",
    "schema_id",
    "data",
    "metadata",
    "created_at",
    "updated_at"
  ],

  // File system integration
  file_system_items: [
    "id",
    "tenant_id",
    "app_id",
    "path",
    "name",
    "type",
    "size",
    "content",
    "mime_type",
    "metadata",
    "permissions",
    "created_at",
    "updated_at",
    "created_by",
    "parent_id",
    "is_deleted"
  ],

  // Notification system
  notifications: [
    "id",
    "tenant_id",
    "user_id",
    "app_id",
    "type",
    "title",
    "message",
    "data",
    "is_read",
    "read_at",
    "created_at"
  ],

  // Audit and analytics
  audit_logs: [
    "id",
    "tenant_id",
    "user_id",
    "app_id",
    "action",
    "resource_type",
    "resource_id",
    "old_values",
    "new_values",
    "ip_address",
    "user_agent",
    "created_at"
  ],
  usage_analytics: [
    "id",
    "tenant_id",
    "app_id",
    "user_id",
    "event_type",
    "event_data",
    "session_id",
    "created_at"
  ]
};

// Required RLS policies for security
const requiredRlsPolicies = {
  tenants: ["Users can view their own tenants", "Tenant owners can update their tenants"],
  tenant_members: ["Users can view tenant members", "Admins can manage tenant members"],
  apps: ["Anyone can view published apps", "App authors can manage their apps"],
  app_installations: ["Users can view their tenant's app installations", "Admins can manage app installations"],
  file_system_items: ["Users can access their tenant's files"],
  notifications: ["Users can view their own notifications"],
  app_data: ["Users can access their tenant's app data"],
  audit_logs: ["Users can view their tenant's audit logs"],
  usage_analytics: ["Users can view their tenant's analytics"]
};

interface CheckResult {
  table: string;
  exists: boolean;
  columnsOk: boolean;
  rlsOk: boolean;
  missingColumns: string[];
  missingPolicies: string[];
}

async function tableExists(tableName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .single();

    if (error) {
      console.error(`❌ Error checking table "${tableName}":`, error.message);
      return false;
    }
    return !!data;
  } catch (error) {
    return false;
  }
}

async function getTableColumns(tableName: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName);

    if (error) {
      console.error(`❌ Error fetching columns for "${tableName}":`, error.message);
      return [];
    }

    return data?.map(col => col.column_name) || [];
  } catch (error) {
    console.error(`❌ Error fetching columns for "${tableName}":`, error);
    return [];
  }
}

async function checkRlsPolicies(tableName: string): Promise<{ hasRls: boolean; policies: string[] }> {
  try {
    // Check if RLS is enabled
    const { data: rlsData, error: rlsError } = await supabase
      .from('pg_tables')
      .select('rowsecurity')
      .eq('tablename', tableName)
      .single();

    if (rlsError || !rlsData?.rowsecurity) {
      return { hasRls: false, policies: [] };
    }

    // Get existing policies
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('policyname')
      .eq('tablename', tableName);

    if (policiesError) {
      console.error(`❌ Error fetching RLS policies for "${tableName}":`, policiesError.message);
      return { hasRls: true, policies: [] };
    }

    const policyNames = policies?.map(p => p.policyname) || [];
    return { hasRls: true, policies: policyNames };
  } catch (error) {
    console.error(`❌ Error checking RLS for "${tableName}":`, error);
    return { hasRls: false, policies: [] };
  }
}

async function checkTable(tableName: string, expectedColumns: string[]): Promise<CheckResult> {
  console.log(`\n🔍 Checking table "${tableName}"...`);

  // Check if table exists
  const exists = await tableExists(tableName);
  if (!exists) {
    console.error(`❌ Table "${tableName}" does not exist`);
    return {
      table: tableName,
      exists: false,
      columnsOk: false,
      rlsOk: false,
      missingColumns: expectedColumns,
      missingPolicies: requiredRlsPolicies[tableName as keyof typeof requiredRlsPolicies] || []
    };
  }

  console.log(`✅ Table "${tableName}" exists`);

  // Check columns
  const existingColumns = await getTableColumns(tableName);
  const missingColumns = expectedColumns.filter(col => !existingColumns.includes(col));
  const columnsOk = missingColumns.length === 0;

  if (columnsOk) {
    console.log(`✅ All required columns exist (${expectedColumns.length} columns)`);
  } else {
    console.log(`⚠️ Missing columns: ${missingColumns.join(', ')}`);
  }

  // Check RLS policies
  const { hasRls, policies } = await checkRlsPolicies(tableName);
  const requiredPolicies = requiredRlsPolicies[tableName as keyof typeof requiredRlsPolicies] || [];
  const missingPolicies = requiredPolicies.filter(policy => !policies.includes(policy));
  const rlsOk = hasRls && missingPolicies.length === 0;

  if (hasRls) {
    if (rlsOk) {
      console.log(`✅ RLS enabled with required policies (${policies.length} policies)`);
    } else {
      console.log(`⚠️ RLS enabled but missing policies: ${missingPolicies.join(', ')}`);
    }
  } else {
    console.log(`⚠️ RLS not enabled for table "${tableName}"`);
  }

  return {
    table: tableName,
    exists: true,
    columnsOk,
    rlsOk,
    missingColumns,
    missingPolicies
  };
}

async function generateReport(results: CheckResult[]): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('📊 AI-BOS ARCHITECTURE VALIDATION REPORT');
  console.log('='.repeat(60));

  const totalTables = results.length;
  const existingTables = results.filter(r => r.exists).length;
  const tablesWithAllColumns = results.filter(r => r.columnsOk).length;
  const tablesWithRls = results.filter(r => r.rlsOk).length;

  console.log(`\n📈 SUMMARY:`);
  console.log(`   • Total tables checked: ${totalTables}`);
  console.log(`   • Tables exist: ${existingTables}/${totalTables}`);
  console.log(`   • Tables with all columns: ${tablesWithAllColumns}/${totalTables}`);
  console.log(`   • Tables with RLS: ${tablesWithRls}/${totalTables}`);

  // Tables that don't exist
  const missingTables = results.filter(r => !r.exists);
  if (missingTables.length > 0) {
    console.log(`\n❌ MISSING TABLES:`);
    missingTables.forEach(result => {
      console.log(`   • ${result.table}`);
    });
  }

  // Tables with missing columns
  const tablesWithMissingColumns = results.filter(r => r.exists && !r.columnsOk);
  if (tablesWithMissingColumns.length > 0) {
    console.log(`\n⚠️ TABLES WITH MISSING COLUMNS:`);
    tablesWithMissingColumns.forEach(result => {
      console.log(`   • ${result.table}: ${result.missingColumns.join(', ')}`);
    });
  }

  // Tables with missing RLS
  const tablesWithMissingRls = results.filter(r => r.exists && !r.rlsOk);
  if (tablesWithMissingRls.length > 0) {
    console.log(`\n⚠️ TABLES WITH MISSING RLS:`);
    tablesWithMissingRls.forEach(result => {
      if (result.missingPolicies.length > 0) {
        console.log(`   • ${result.table}: ${result.missingPolicies.join(', ')}`);
      } else {
        console.log(`   • ${result.table}: RLS not enabled`);
      }
    });
  }

  // All good tables
  const perfectTables = results.filter(r => r.exists && r.columnsOk && r.rlsOk);
  if (perfectTables.length > 0) {
    console.log(`\n✅ PERFECT TABLES:`);
    perfectTables.forEach(result => {
      console.log(`   • ${result.table}`);
    });
  }

  // Overall status
  const allGood = results.every(r => r.exists && r.columnsOk && r.rlsOk);
  
  console.log('\n' + '='.repeat(60));
  if (allGood) {
    console.log('🎉 AI-BOS ARCHITECTURE VALIDATION: PASSED ✅');
    console.log('Your platform is ready for production!');
  } else {
    console.log('❌ AI-BOS ARCHITECTURE VALIDATION: FAILED');
    console.log('Please fix the issues above before proceeding.');
  }
  console.log('='.repeat(60));
}

async function main() {
  console.log('🔎 AI-BOS Architecture Validation');
  console.log('Checking database schema, security policies, and SSOT compliance...\n');

  try {
    // Test connection first
    const { data, error } = await supabase.from('apps').select('count').limit(1);
    if (error && error.code !== 'PGRST116') {
      console.error('❌ Failed to connect to Supabase:', error.message);
      Deno.exit(1);
    }
    console.log('✅ Connected to Supabase successfully\n');

    // SSOT Validation
    console.log('🔍 STEP 1: Single Source of Truth Validation');
    const { violations, warnings } = await validateSSOT();
    
    if (violations.length > 0) {
      console.log('\n❌ SSOT VIOLATIONS FOUND:');
      violations.forEach(violation => console.log(`   • ${violation}`));
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️ SSOT WARNINGS:');
      warnings.forEach(warning => console.log(`   • ${warning}`));
    }
    
    if (violations.length === 0 && warnings.length === 0) {
      console.log('✅ SSOT validation passed');
    }

    // Database Schema Validation
    console.log('\n🔍 STEP 2: Database Schema Validation');
    const results: CheckResult[] = [];
    for (const [tableName, expectedColumns] of Object.entries(expectedTables)) {
      const result = await checkTable(tableName, expectedColumns);
      results.push(result);
    }

    // Generate comprehensive report
    await generateReport(results);

    // Overall status
    const dbAllGood = results.every(r => r.exists && r.columnsOk && r.rlsOk);
    const ssotAllGood = violations.length === 0;
    const allGood = dbAllGood && ssotAllGood;
    
    console.log('\n' + '='.repeat(60));
    if (allGood) {
      console.log('🎉 AI-BOS ARCHITECTURE VALIDATION: PASSED ✅');
      console.log('Your platform is ready for production!');
    } else {
      console.log('❌ AI-BOS ARCHITECTURE VALIDATION: FAILED');
      if (!ssotAllGood) {
        console.log('   • SSOT violations detected');
      }
      if (!dbAllGood) {
        console.log('   • Database schema issues detected');
      }
      console.log('Please fix the issues above before proceeding.');
    }
    console.log('='.repeat(60));

    // Exit with appropriate code
    Deno.exit(allGood ? 0 : 1);

  } catch (error) {
    console.error('❌ Validation failed with error:', error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
} 