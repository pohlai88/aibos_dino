#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { SUPABASE_CONFIG } from "../config.ts";

const supabase = createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.serviceRoleKey
);

async function promptInput(message: string, required = true): Promise<string> {
  let value = "";
  do {
    value = prompt(message) || "";
  } while (required && !value.trim());
  return value.trim();
}

async function main() {
  console.log("🚀 AIBOS App Integration Generator");

  // App details
  const name = await promptInput("App Name:");
  const slug = await promptInput("App Slug (unique, lowercase, hyphens):");
  const description = await promptInput("Short Description:");
  const categorySlug = await promptInput("Category slug (e.g. productivity, utilities):");
  const authorEmail = await promptInput("Author Email (optional):", false);

  // Check for duplicate slugs
  const { data: existing } = await supabase
    .from("apps")
    .select("id")
    .eq("slug", slug)
    .single();

  if (existing) {
    console.error(`❌ App with slug "${slug}" already exists.`);
    Deno.exit(1);
  }

  // Lookup category
  const { data: category } = await supabase
    .from("app_categories")
    .select("id")
    .eq("slug", categorySlug)
    .single();

  if (!category) {
    console.error(`❌ Category "${categorySlug}" not found.`);
    Deno.exit(1);
  }

  // Lookup author if provided
  let authorId = null;
  if (authorEmail) {
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", authorEmail)
      .single();

    if (user) {
      authorId = user.id;
    } else {
      console.warn(`⚠️ Author "${authorEmail}" not found. Leaving author_id null.`);
    }
  }

  // Register app
  const { data: app, error } = await supabase
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
      is_verified: false,
    })
    .select()
    .single();

  if (error) {
    console.error("❌ Failed to register app in Supabase:", error.message);
    Deno.exit(1);
  }

  const appDir = `apps/${slug}`;
  await Deno.mkdir(appDir, { recursive: true });

  // Supabase service
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

  await Deno.writeTextFile(`${appDir}/supabase-service.ts`, serviceCode);

  // index.ts
  await Deno.writeTextFile(`${appDir}/index.ts`, `export * from "./supabase-service.ts";`);

  // Type definitions
  const typeDefs = `
export interface AppData {
  id: string;
  tenant_id: string;
  key: string;
  value: any;
  created_at: string;
}
`;
  await Deno.writeTextFile(`${appDir}/types.ts`, typeDefs);

  // README
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

  await Deno.writeTextFile(`${appDir}/README.md`, readme);

  console.log(`✅ App "${name}" scaffolded at ${appDir}`);
}

if (import.meta.main) {
  await main();
} 