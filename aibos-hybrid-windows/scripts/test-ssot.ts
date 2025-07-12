#!/usr/bin/env -S deno run --allow-read

import * as path from "https://deno.land/std@0.220.1/path/mod.ts";

// Load canonical registry
async function loadCanonicalRegistry(): Promise<any> {
  try {
    const registryPath = "workspace-canonical.json";
    const registryContent = await Deno.readTextFile(registryPath);
    return JSON.parse(registryContent);
  } catch (error) {
    console.error("❌ Failed to load workspace-canonical.json:", error);
    console.error("Current directory:", Deno.cwd());
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

async function main() {
  console.log('🔍 AI-BOS SSOT Validation Test');
  console.log('Checking workspace for SSOT compliance...\n');

  try {
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

    // Overall status
    const allGood = violations.length === 0;
    
    console.log('\n' + '='.repeat(60));
    if (allGood) {
      console.log('🎉 AI-BOS SSOT VALIDATION: PASSED ✅');
      console.log('Your workspace follows SSOT principles!');
    } else {
      console.log('❌ AI-BOS SSOT VALIDATION: FAILED');
      console.log('Please fix the SSOT violations above.');
    }
    console.log('='.repeat(60));

    // Exit with appropriate code
    Deno.exit(allGood ? 0 : 1);

  } catch (error) {
    console.error('❌ SSOT validation failed with error:', error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
} 