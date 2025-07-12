#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import * as colors from "https://deno.land/std@0.220.1/fmt/colors.ts";
import { SUPABASE_CONFIG } from "../config.ts";

const supabase = createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.serviceRoleKey
);

interface ScaffoldConfig {
  appsRoot: string;
  dryRun: boolean;
}

async function promptInput(message: string, required = true): Promise<string> {
  let value = "";
  do {
    value = prompt(colors.cyan(`${message} `)) || "";
  } while (required && !value.trim());
  return value.trim();
}

function logSuccess(message: string) {
  console.log(colors.green(`✅ ${message}`));
}

function logError(message: string) {
  console.error(colors.red(`❌ ${message}`));
}

function logWarn(message: string) {
  console.warn(colors.yellow(`⚠️ ${message}`));
}

async function exitWithError(message: string) {
  logError(message);
  Deno.exit(1);
}

async function main() {
  const start = Date.now();

  const config: ScaffoldConfig = {
    appsRoot: "apps",
    dryRun: Deno.args.includes("--dry-run")
  };

  console.log(colors.bold(colors.cyan("🚀 AIBOS App Integration Generator\n")));

  // Gather app details
  const name = await promptInput("App Name:");
  const slug = await promptInput("App Slug (unique, lowercase, hyphens):");
  const description = await promptInput("Short Description:");
  const categorySlug = await promptInput("Category slug (e.g. productivity, utilities):");
  const authorEmail = await promptInput("Author Email (optional):", false);

  // Check for duplicate slugs
  const { data: existing, error: slugError } = await supabase
    .from("apps")
    .select("id")
    .eq("slug", slug)
    .single();

  if (slugError && slugError.code !== "PGRST116") {
    await exitWithError(`Supabase error checking slug: ${slugError.message}`);
  }

  if (existing) {
    await exitWithError(`App with slug "${slug}" already exists.`);
  }

  // Find category
  const { data: category, error: categoryError } = await supabase
    .from("app_categories")
    .select("id")
    .eq("slug", categorySlug)
    .single();

  if (categoryError || !category) {
    await exitWithError(`Category "${categorySlug}" not found.`);
  }

  // Lookup author
  let authorId = null;
  if (authorEmail) {
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", authorEmail)
      .single();

    if (user) {
      authorId = user.id;
      logSuccess(`Found author: ${authorEmail}`);
    } else {
      logWarn(`Author "${authorEmail}" not found. Proceeding without author_id.`);
    }
  }

  // Register app
  let app;
  if (!config.dryRun) {
    const { data, error } = await supabase
      .from("apps")
      .insert({
        name,
        slug,
        description,
        category_id: category.id,
        author_id: authorId,
        status: "draft",
        is_free: true,
        is_featured: false,
        is_verified: false
      })
      .select()
      .single();

    if (error) {
      await exitWithError(`Failed to register app: ${error.message}`);
    }

    app = data;
    logSuccess(`App registered in Supabase: ID ${app.id}`);
  } else {
    logWarn("Dry-run mode: skipping Supabase insertion.");
    app = { id: "dry-run-id" };
  }

  const appDir = `${config.appsRoot}/${slug}`;

  if (!config.dryRun) {
    await Deno.mkdir(appDir, { recursive: true });
    logSuccess(`Created app directory: ${appDir}`);
  }

  // Supabase service file
  const serviceCode = `
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!
);

export async function getAppData(tenantId: string) {
  const { data, error } = await supabase
    .from("app_data")
    .select("*")
    .eq("app_id", "${app.id}")
    .eq("tenant_id", tenantId);
  if (error) throw error;
  return data;
}
`;

  const typeDefs = `
export interface AppData {
  id: string;
  tenant_id: string;
  key: string;
  value: any;
  created_at: string;
}
`;

  const readme = `
# ${name}

${description}

## Supabase Integration

- App ID: ${app.id}
- Slug: ${slug}
- Category: ${categorySlug}

This app is scaffolded for direct integration with the AIBOS platform.

### Row-Level Security

Ensure this policy exists:

\`\`\`sql
CREATE POLICY "Tenant can access own app data"
  ON app_data
  FOR SELECT
  USING (tenant_id = auth.uid());
\`\`\`
`;

  if (!config.dryRun) {
    await Deno.writeTextFile(`${appDir}/supabase-service.ts`, serviceCode);
    await Deno.writeTextFile(`${appDir}/index.ts`, `export * from "./supabase-service.ts";`);
    await Deno.writeTextFile(`${appDir}/types.ts`, typeDefs);
    await Deno.writeTextFile(`${appDir}/README.md`, readme);
    logSuccess("Scaffold files written.");
  } else {
    logWarn("Dry-run mode: skipping file creation.");
  }

  const duration = ((Date.now() - start) / 1000).toFixed(2);
  console.log(colors.bold(colors.green(`\n🎉 App "${name}" scaffolded in ${duration}s.`)));
}

if (import.meta.main) {
  await main();
}
