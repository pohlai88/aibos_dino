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
} #!/usr/bin/env -S deno run --allow-read --allow-write

import {
  walk,
} from "https://deno.land/std@0.220.1/fs/walk.ts";
import {
  globToRegExp,
} from "https://deno.land/std@0.220.1/path/glob.ts";
import * as colors from "https://deno.land/std@0.220.1/fmt/colors.ts";

interface ValidationResult {
  violations: string[];
  warnings: string[];
  passed: boolean;
}

/**
 * Entry point
 */
async function main() {
  console.log(colors.bold(colors.cyan("\n🔍 AIBOS ENTERPRISE SSOT VALIDATION")));
  console.log(colors.cyan("=".repeat(60)) + "\n");

  const registryPath = parseCliArg("--registry") || "workspace-canonical.json";
  const jsonReportPath = parseCliArg("--json-report");

  const result = await validateSSOT(registryPath);

  if (result.violations.length > 0) {
    console.log(colors.red("\n❌ SSOT VIOLATIONS:"));
    result.violations.forEach(v => console.log(colors.red(`   • ${v}`)));
  }

  if (result.warnings.length > 0) {
    console.log(colors.yellow("\n⚠️  SSOT WARNINGS:"));
    result.warnings.forEach(w => console.log(colors.yellow(`   • ${w}`)));
  }

  if (result.violations.length === 0 && result.warnings.length === 0) {
    console.log(colors.green("\n✅ SSOT validation passed - No issues found!"));
  }

  console.log("\n" + colors.cyan("=".repeat(60)));
  console.log(
    result.passed
      ? colors.green("🎉 SSOT VALIDATION: PASSED")
      : colors.red("❌ SSOT VALIDATION: FAILED"),
  );
  console.log(colors.cyan("=".repeat(60)) + "\n");

  if (jsonReportPath) {
    await writeJsonReport(jsonReportPath, result);
  }

  Deno.exit(result.passed ? 0 : 1);
}

/**
 * Main validation logic
 */
async function validateSSOT(
  registryPath: string,
): Promise<ValidationResult> {
  const violations: string[] = [];
  const warnings: string[] = [];

  // Check if canonical registry exists
  const registryExists = await fileExists(registryPath);
  if (!registryExists) {
    violations.push(`${registryPath} not found`);
    return { violations, warnings, passed: false };
  }

  // Load canonical registry
  const registryContent = await Deno.readTextFile(registryPath);
  const registry = JSON.parse(registryContent);
  console.log(colors.green("✅ Canonical registry loaded successfully\n"));

  // Check forbidden patterns
  if (registry.forbidden?.patterns) {
    for (const pattern of registry.forbidden.patterns) {
      const files = await findFilesByGlob(pattern);
      for (const f of files) {
        violations.push(`Forbidden file found matching pattern "${pattern}": ${f}`);
      }
    }
  }

  // Check test files
  const testFiles = await findFilesByGlob("**/test-*.ts");
  if (testFiles.length > 0) {
    violations.push(`Test files found: ${testFiles.join(", ")}`);
  }

  // Check for duplicate schema files
  const schemaFiles = await findFilesByGlob("**/*schema*.sql");
  if (schemaFiles.length > 1) {
    violations.push(`Multiple schema files found: ${schemaFiles.join(", ")}`);
  }

  // Check for build artifacts
  const buildDirs = [".turbo", "dist", "build", "node_modules"];
  await Promise.all(
    buildDirs.map(async (dir) => {
      const exists = await fileExists(dir);
      if (exists) {
        violations.push(`Build artifact found: ${dir}`);
      }
    }),
  );

  // Validate canonical files exist
  for (const category of Object.keys(registry)) {
    if (category === "forbidden" || category === "aiAgentBoundaries") continue;

    const categoryData = registry[category];
    if (categoryData.files) {
      await Promise.all(
        categoryData.files.map(async (file: string) => {
          const exists = await fileExists(file);
          if (!exists) {
            warnings.push(`Canonical file missing: ${file}`);
          }
        }),
      );
    }
  }

  return {
    violations,
    warnings,
    passed: violations.length === 0,
  };
}

/**
 * Check whether a file or directory exists
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Find files matching a glob pattern
 */
async function findFilesByGlob(pattern: string): Promise<string[]> {
  const regex = globToRegExp(pattern);
  const matches: string[] = [];

  for await (const entry of walk(".", {
    includeDirs: false,
    followSymlinks: false,
  })) {
    const relativePath = entry.path.replace(Deno.cwd() + "/", "");
    if (regex.test(relativePath)) {
      matches.push(relativePath);
    }
  }

  return matches;
}

/**
 * Parse CLI argument value
 */
function parseCliArg(name: string): string | undefined {
  const arg = Deno.args.find((a) => a.startsWith(name + "="));
  return arg ? arg.split("=")[1] : undefined;
}

/**
 * Write JSON report
 */
async function writeJsonReport(path: string, result: ValidationResult) {
  const output = {
    timestamp: new Date().toISOString(),
    violations: result.violations,
    warnings: result.warnings,
    passed: result.passed,
  };

  await Deno.writeTextFile(path, JSON.stringify(output, null, 2));
  console.log(colors.green(`✅ JSON report written: ${path}\n`));
}

// Run script
if (import.meta.main) {
  await main();
}
