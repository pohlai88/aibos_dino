#!/usr/bin/env -S deno run --allow-read

/**
 * Simple SSOT Validation Script
 * Validates workspace against canonical registry without database connection
 */

interface ValidationResult {
  violations: string[];
  warnings: string[];
  passed: boolean;
}

async function validateSSOT(): Promise<ValidationResult> {
  const violations: string[] = [];
  const warnings: string[] = [];

  try {
    // Check if canonical registry exists
    const registryExists = await Deno.stat("workspace-canonical.json").then(() => true).catch(() => false);
    if (!registryExists) {
      violations.push("workspace-canonical.json not found");
      return { violations, warnings, passed: false };
    }

    // Load canonical registry
    const registryContent = await Deno.readTextFile("workspace-canonical.json");
    const registry = JSON.parse(registryContent);

    console.log("✅ Canonical registry loaded successfully");

    // Check for test files
    const testFiles = await findFilesByPattern("test-*.ts");
    if (testFiles.length > 0) {
      violations.push(`Test files found: ${testFiles.join(", ")}`);
    }

    // Check for schema files
    const schemaFiles = await findFilesByPattern("*schema*.sql");
    if (schemaFiles.length > 1) {
      violations.push(`Multiple schema files found: ${schemaFiles.join(", ")}`);
    }

    // Check for build artifacts
    const buildDirs = [".turbo", "dist", "build", "node_modules"];
    for (const dir of buildDirs) {
      const exists = await Deno.stat(dir).then(() => true).catch(() => false);
      if (exists) {
        violations.push(`Build artifact found: ${dir}`);
      }
    }

    // Validate canonical files exist
    if (registry.schemas?.files) {
      for (const file of registry.schemas.files) {
        const exists = await Deno.stat(file).then(() => true).catch(() => false);
        if (!exists) {
          warnings.push(`Canonical schema file missing: ${file}`);
        }
      }
    }

    if (registry.scripts?.files) {
      for (const file of registry.scripts.files) {
        const exists = await Deno.stat(file).then(() => true).catch(() => false);
        if (!exists) {
          warnings.push(`Canonical script missing: ${file}`);
        }
      }
    }

    const passed = violations.length === 0;
    return { violations, warnings, passed };

  } catch (error) {
    violations.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
    return { violations, warnings, passed: false };
  }
}

async function findFilesByPattern(pattern: string): Promise<string[]> {
  const files: string[] = [];
  
  try {
    for await (const entry of Deno.readDir(".")) {
      if (entry.isFile) {
        if (pattern.includes("test-*.ts") && entry.name.startsWith("test-") && entry.name.endsWith(".ts")) {
          files.push(entry.name);
        }
        if (pattern.includes("*schema*.sql") && entry.name.includes("schema") && entry.name.endsWith(".sql")) {
          files.push(entry.name);
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read directory: ${error instanceof Error ? error.message : String(error)}`);
  }

  return files;
}

async function main() {
  console.log("🔍 AIBOS SSOT Validation");
  console.log("=".repeat(50));

  const result = await validateSSOT();

  if (result.violations.length > 0) {
    console.log("\n❌ SSOT VIOLATIONS:");
    result.violations.forEach(v => console.log(`   • ${v}`));
  }

  if (result.warnings.length > 0) {
    console.log("\n⚠️ SSOT WARNINGS:");
    result.warnings.forEach(w => console.log(`   • ${w}`));
  }

  if (result.violations.length === 0 && result.warnings.length === 0) {
    console.log("\n✅ SSOT validation passed - No issues found!");
  }

  console.log("\n" + "=".repeat(50));
  if (result.passed) {
    console.log("🎉 SSOT VALIDATION: PASSED");
  } else {
    console.log("❌ SSOT VALIDATION: FAILED");
  }
  console.log("=".repeat(50));

  Deno.exit(result.passed ? 0 : 1);
}

if (import.meta.main) {
  await main();
} 