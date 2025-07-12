#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import * as colors from "https://deno.land/std@0.220.1/fmt/colors.ts";

interface SetupConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey?: string;
  jsonReportPath?: string;
}

interface SetupReport {
  timestamp: string;
  status: "success" | "failed";
  errors: string[];
  warnings: string[];
  actionsPerformed: string[];
}

class SupabaseSetup {
  private config: SetupConfig;
  private supabase: SupabaseClient;
  private report: SetupReport;

  constructor(config: SetupConfig) {
    this.config = config;
    this.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
    this.report = {
      timestamp: new Date().toISOString(),
      status: "success",
      errors: [],
      warnings: [],
      actionsPerformed: [],
    };
  }

  async run() {
    logSection("🚀 AIBOS Supabase Setup Started");

    try {
      await this.checkConnection();
      await this.createSchema();
      await this.setupStorage();
      await this.testOperations();
      await this.generateConfig();

      this.report.actionsPerformed.push("Supabase configuration completed successfully");
      this.finish(true);
    } catch (error) {
      this.report.status = "failed";
      this.report.errors.push(error instanceof Error ? error.message : String(error));
      this.finish(false);
    }
  }

  private async checkConnection() {
    logStep("Checking Supabase connection...");

    const { error } = await this.supabase.from("file_system_items").select("count").limit(1);

    if (error && error.code !== "PGRST116") {
      throw new Error(`Connection failed: ${error.message}`);
    }

    logSuccess("Connection successful");
    this.report.actionsPerformed.push("Checked Supabase connection");
  }

  private async createSchema() {
    logStep("Creating database schema...");

    const schemaSQL = await this.readSchemaFile();

    if (!schemaSQL) {
      this.report.warnings.push("Schema file missing. Manual schema setup required.");
      logWarn("No schema file found. Please create the schema manually in Supabase.");
      return;
    }

    if (!this.config.supabaseServiceKey) {
      this.report.warnings.push("No service role key provided. Cannot execute schema automatically.");
      logWarn("Service role key not provided. Please run SQL manually.");
      return;
    }

    const serviceSupabase = createClient(this.config.supabaseUrl, this.config.supabaseServiceKey);

    const statements = schemaSQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("--"));

    for (const statement of statements) {
      const { error } = await serviceSupabase.rpc("exec_sql", { sql: statement });
      if (error) {
        logWarn(`Statement failed: ${error.message}`);
        this.report.warnings.push(`Schema statement failed: ${error.message}`);
      }
    }

    logSuccess("Schema creation completed");
    this.report.actionsPerformed.push("Database schema created");
  }

  private async setupStorage() {
    logStep("Setting up storage buckets...");

    const { error } = await this.supabase.storage.createBucket("aibos-files", {
      public: false,
      allowedMimeTypes: [
        "text/plain",
        "text/html",
        "text/css",
        "text/javascript",
        "application/json",
        "image/png",
        "image/jpeg",
        "image/gif",
        "application/pdf",
      ],
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
    });

    if (error && error.message !== "Bucket already exists") {
      this.report.warnings.push(`Storage bucket creation failed: ${error.message}`);
      logWarn("Storage setup failed. Please create the bucket manually.");
    } else {
      logSuccess("Storage bucket ready");
      this.report.actionsPerformed.push("Storage bucket created or confirmed existing");
    }
  }

  private async testOperations() {
    logStep("Testing file system operations...");

    try {
      const { data: folderData, error: folderError } = await this.supabase
        .rpc("create_folder", { p_path: "", p_name: "test-folder" });

      if (folderError) {
        this.report.warnings.push("Folder creation test failed.");
        logWarn("Folder creation test failed. Possibly schema missing.");
        return;
      }

      const { data: listData, error: listError } = await this.supabase
        .rpc("get_file_system_tree", { p_path: "" });

      if (listError) {
        this.report.warnings.push("List operation test failed.");
        logWarn("List operation test failed.");
        return;
      }

      if (folderData?.success && folderData.data?.id) {
        await this.supabase.rpc("delete_item", { p_item_id: folderData.data.id });
      }

      logSuccess("Operations test passed");
      this.report.actionsPerformed.push("Performed basic Supabase RPC tests");
    } catch (error) {
      this.report.warnings.push("Operations test failed. This may be expected if schema is missing.");
      logWarn("Operations test failed. Possibly schema missing.");
    }
  }

  private async generateConfig() {
    logStep("Generating configuration files...");

    const configFile = `// AIBOS Supabase Configuration
// Generated on ${new Date().toISOString()}

export const SUPABASE_CONFIG = {
  url: '${this.config.supabaseUrl}',
  anonKey: '${this.config.supabaseAnonKey}',
  serviceKey: '${this.config.supabaseServiceKey || ""}',
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
  maxFileSize: 10485760
};

export const API_CONFIG = {
  baseUrl: '${this.config.supabaseUrl}/rest/v1',
  headers: {
    apikey: '${this.config.supabaseAnonKey}',
    Authorization: 'Bearer ${this.config.supabaseAnonKey}',
    'Content-Type': 'application/json'
  }
};
`;

    await safeWriteFile("src/config/supabase-config.ts", configFile);
    logSuccess("Configuration file generated: src/config/supabase-config.ts");

    const envTemplate = `# AIBOS Supabase Configuration
SUPABASE_URL=${this.config.supabaseUrl}
SUPABASE_ANON_KEY=${this.config.supabaseAnonKey}
SUPABASE_SERVICE_ROLE_KEY=${this.config.supabaseServiceKey || "your-service-role-key"}

NODE_ENV=development
PORT=8000

SUPABASE_STORAGE_BUCKET=aibos-files
SUPABASE_REALTIME_ENABLED=true
ENABLE_PATH_VALIDATION=true
MAX_FILE_SIZE=10485760
`;

    await safeWriteFile(".env.template", envTemplate);
    logSuccess("Environment template generated: .env.template");

    this.report.actionsPerformed.push("Generated config and env files");
  }

  private async readSchemaFile(): Promise<string | null> {
    try {
      return await Deno.readTextFile("supabase/file-system-schema.sql");
    } catch {
      return null;
    }
  }

  private async finish(success: boolean) {
    if (this.config.jsonReportPath) {
      await safeWriteFile(
        this.config.jsonReportPath,
        JSON.stringify(this.report, null, 2),
      );
      logSuccess(`JSON report saved to ${this.config.jsonReportPath}`);
    }

    if (success) {
      logSection("🎉 AIBOS Supabase Setup Completed Successfully");
      Deno.exit(0);
    } else {
      logSection("❌ AIBOS Supabase Setup Failed");
      Deno.exit(1);
    }
  }
}

// --- Utility Functions ---

function logSection(message: string) {
  console.log("\n" + colors.bold(colors.cyan("=".repeat(60))));
  console.log(colors.bold(colors.cyan(message)));
  console.log(colors.bold(colors.cyan("=".repeat(60))));
}

function logStep(message: string) {
  console.log(colors.yellow(`\n🔧 ${message}`));
}

function logSuccess(message: string) {
  console.log(colors.green(`✅ ${message}`));
}

function logWarn(message: string) {
  console.log(colors.yellow(`⚠️  ${message}`));
}

async function safeWriteFile(path: string, content: string) {
  try {
    await Deno.writeTextFile(path, content);
  } catch (error) {
    console.error(colors.red(`❌ Failed to write file ${path}: ${error}`));
  }
}

// --- Main Script ---

async function main() {
  const supabaseUrl =
    Deno.env.get("SUPABASE_URL") || prompt("Enter your Supabase URL:");
  const supabaseAnonKey =
    Deno.env.get("SUPABASE_ANON_KEY") ||
    prompt("Enter your Supabase anon key:");
  const supabaseServiceKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    prompt("Enter your Supabase service role key (optional):");

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(colors.red("❌ Supabase URL and anon key are required"));
    Deno.exit(1);
  }

  const jsonReportPath = Deno.args.find((arg) =>
    arg.startsWith("--json-report=")
  )?.split("=")[1];

  const config: SetupConfig = {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceKey: supabaseServiceKey || undefined,
    jsonReportPath,
  };

  const setup = new SupabaseSetup(config);
  await setup.run();
}

if (import.meta.main) {
  await main();
}
