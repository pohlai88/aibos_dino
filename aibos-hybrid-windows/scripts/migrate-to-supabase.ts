#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env

import * as colors from "https://deno.land/std@0.220.1/fmt/colors.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

interface FileItem {
  id: string;
  name: string;
  type: "file" | "folder";
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

interface MigrationReport {
  timestamp: string;
  migratedItems: number;
  errors: string[];
  config: Partial<MigrationConfig>;
}

class MigrationService {
  private supabase: SupabaseClient;
  private serviceSupabase: SupabaseClient | null = null;
  private migratedItems = 0;
  private errors: string[] = [];

  constructor(private config: MigrationConfig) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
    if (config.supabaseServiceKey) {
      this.serviceSupabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
    }
  }

  async migrate() {
    this.logHeader("🚀 AIBOS File System Migration to Supabase");

    try {
      await this.checkConnection();
      await this.createSchema();
      await this.migrateData();
      await this.verifyMigration();
      await this.generateReport();

      this.log(colors.green("\n✅ Migration completed successfully!"));
      this.log(colors.green(`📊 Migrated ${this.migratedItems} items.`));

      if (this.errors.length > 0) {
        this.log(colors.yellow(`⚠️ ${this.errors.length} errors encountered:`));
        this.errors.forEach(e => this.log(`   - ${e}`));
      }
    } catch (error) {
      this.log(colors.red(`\n❌ Migration failed: ${error instanceof Error ? error.message : error}`));
      Deno.exit(1);
    }
  }

  private async checkConnection() {
    this.log(colors.yellow("🔍 Checking Supabase connection..."));

    const { error } = await this.supabase
      .from("file_system_items")
      .select("id")
      .limit(1);

    if (error && error.code !== "PGRST116") {
      throw new Error(`Supabase connection failed: ${error.message}`);
    }

    this.log(colors.green("✅ Connection successful."));
  }

  private async createSchema() {
    this.log(colors.yellow("\n📋 Creating database schema..."));

    if (!this.serviceSupabase) {
      this.log(colors.yellow("⚠️ Service key not provided. Please run schema manually in Supabase."));
      return;
    }

    const sql = await this.readSchemaFile();
    if (!sql) {
      this.log(colors.yellow("⚠️ No schema file found."));
      return;
    }

    const statements = sql
      .split(";")
      .map(s => s.trim())
      .filter(s => s && !s.startsWith("--"));

    for (const statement of statements) {
      const { error } = await this.serviceSupabase.rpc("exec_sql", { sql: statement });
      if (error) {
        this.log(colors.yellow(`⚠️ Schema statement failed: ${error.message}`));
      }
    }

    this.log(colors.green("✅ Schema creation completed."));
  }

  private async migrateData() {
    this.log(colors.yellow("\n📦 Migrating file system data..."));

    const sourceData = await this.loadSourceData();
    if (!sourceData || Object.keys(sourceData).length === 0) {
      this.log(colors.gray("ℹ️ No source data found. Nothing to migrate."));
      return;
    }

    this.log(colors.green(`📁 Found ${Object.keys(sourceData).length} directories.`));

    const testUserId = await this.createTestUser();

    for (const [dirPath, items] of Object.entries(sourceData)) {
      this.log(colors.cyan(`\n📂 Migrating directory: ${dirPath || "root"}`));

      for (const item of items) {
        try {
          await this.migrateItem(item, dirPath, testUserId);
          this.migratedItems++;
        } catch (error) {
          const message = `Failed to migrate ${item.name}: ${error instanceof Error ? error.message : error}`;
          this.errors.push(message);
          this.log(colors.red(`❌ ${message}`));
        }
      }
    }
  }

  private async migrateItem(item: FileItem, path: string, userId: string) {
    if (this.config.dryRun) {
      this.log(colors.gray(`[DRY RUN] Would migrate: ${item.name} (${item.type})`));
      return;
    }

    const tenantId = await this.getOrCreateDefaultTenant(userId);

    const data = {
      tenant_id: tenantId,
      path,
      name: item.name,
      type: item.type,
      size: item.size || 0,
      content: item.content,
      created_by: userId,
      created_at: item.created,
      updated_at: item.modified,
    };

    const { error } = await this.supabase
      .from("file_system_items")
      .insert(data);

    if (error) {
      throw new Error(`Database insert error: ${error.message}`);
    }

    this.log(colors.green(`  ✅ Migrated: ${item.name} (${item.type})`));
  }

  private async getOrCreateDefaultTenant(userId: string): Promise<string> {
    const { data, error } = await this.supabase
      .from("tenants")
      .select("id")
      .eq("name", "Default Migration Tenant")
      .single();

    if (data) return data.id;

    const tenantId = crypto.randomUUID();
    const now = new Date().toISOString();

    const tenant = {
      id: tenantId,
      name: "Default Migration Tenant",
      subscription_tier: "free",
      created_at: now,
      updated_at: now,
    };

    const { error: tenantError } = await this.supabase
      .from("tenants")
      .insert(tenant);

    if (tenantError) {
      throw new Error(`Failed to create tenant: ${tenantError.message}`);
    }

    await this.supabase.from("tenant_members").insert({
      tenant_id: tenantId,
      user_id: userId,
      role: "owner",
      joined_at: now,
    });

    return tenantId;
  }

  private async createTestUser(): Promise<string> {
    if (!this.serviceSupabase) {
      return "00000000-0000-0000-0000-000000000000";
    }

    try {
      const { data, error } = await this.serviceSupabase.auth.admin.createUser({
        email: "migration@aibos.local",
        password: "temporary-password",
        email_confirm: true,
      });

      if (data?.user?.id) {
        return data.user.id;
      }
    } catch (e) {
      this.log(colors.yellow("⚠️ Could not create test user, using default ID."));
    }

    return "00000000-0000-0000-0000-000000000000";
  }

  private async loadSourceData(): Promise<Record<string, FileItem[]> | null> {
    this.log(colors.yellow("📖 Loading source data..."));

    try {
      const filePath = this.config.sourceDataPath || "api/files.ts";
      const content = await Deno.readTextFile(filePath);

      const match = content.match(/const fileSystem = ({[\s\S]*?});/);
      if (match) {
        return eval(`(${match[1]})`);
      }

      this.log(colors.gray("ℹ️ No fileSystem object found in source file."));
      return null;
    } catch (error) {
      this.log(colors.gray(`ℹ️ Could not load source data: ${error instanceof Error ? error.message : error}`));
      return null;
    }
  }

  private async verifyMigration() {
    this.log(colors.yellow("\n🔍 Verifying migration..."));

    const { data, error } = await this.supabase
      .from("file_system_items")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      this.log(colors.red(`❌ Verification failed: ${error.message}`));
      return;
    }

    this.log(colors.green(`✅ Verification complete. Found ${data?.length || 0} items.`));
    data?.slice(0, 5).forEach(item =>
      this.log(`   - ${item.name} (${item.type}) in ${item.path}`)
    );
  }

  private async generateReport() {
    this.log(colors.yellow("\n📊 Generating migration report..."));

    const report: MigrationReport = {
      timestamp: new Date().toISOString(),
      migratedItems: this.migratedItems,
      errors: this.errors,
      config: {
        supabaseUrl: this.config.supabaseUrl,
        dryRun: this.config.dryRun,
      },
    };

    await Deno.writeTextFile(
      "migration-report.json",
      JSON.stringify(report, null, 2)
    );

    this.log(colors.green("✅ Migration report saved as migration-report.json"));
  }

  private async readSchemaFile(): Promise<string> {
    try {
      return await Deno.readTextFile("supabase/file-system-schema.sql");
    } catch {
      return "";
    }
  }

  private log(message: string) {
    console.log(message);
  }

  private logHeader(message: string) {
    console.log(colors.bold(colors.cyan("\n" + "=".repeat(60))));
    console.log(colors.bold(colors.cyan(message)));
    console.log(colors.bold(colors.cyan("=".repeat(60))));
  }
}

// Main execution
async function main() {
  const args = Deno.args;
  const dryRun = args.includes("--dry-run");
  const sourceDataPath = args.find((a) => a.startsWith("--source="))?.split("=")[1];

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || prompt("Enter your Supabase URL:");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || prompt("Enter your Supabase anon key:");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || prompt("Enter your Supabase service role key (optional):");

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Supabase URL and anon key are required.");
    Deno.exit(1);
  }

  const config: MigrationConfig = {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceKey: supabaseServiceKey || undefined,
    sourceDataPath,
    dryRun,
  };

  if (dryRun) {
    console.log(colors.magenta("\n🧪 DRY RUN MODE - No actual data will be migrated.\n"));
  }

  const migration = new MigrationService(config);
  await migration.migrate();
}

if (import.meta.main) {
  await main();
}
