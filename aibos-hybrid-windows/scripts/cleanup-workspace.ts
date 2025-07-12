#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-env

import * as colors from "https://deno.land/std@0.220.1/fmt/colors.ts";
import * as path from "https://deno.land/std@0.220.1/path/mod.ts";
import { globToRegExp } from "https://deno.land/std@0.220.1/path/glob.ts";

interface CleanupResult {
  removedFiles: string[];
  removedDirs: string[];
  preservedFiles: string[];
  warnings: string[];
  errors: string[];
  duration: number;
}

interface CleanupMode {
  name: string;
  description: string;
  targets: string[];
  preserveEssential: boolean;
  organizeDocs: boolean;
  createStructure: boolean;
}

class CanonicalCleanup {
  private result: CleanupResult = {
    removedFiles: [],
    removedDirs: [],
    preservedFiles: [],
    warnings: [],
    errors: [],
    duration: 0,
  };

  private dryRun: boolean;
  private verbose: boolean;
  private mode: CleanupMode;
  private workspaceRoot: string;

  constructor(private args: string[]) {
    this.dryRun = args.includes("--dry-run");
    this.verbose = args.includes("--verbose");
    this.workspaceRoot = Deno.env.get("AIBOS_WORKSPACE_ROOT") || path.dirname(Deno.cwd());
    this.mode = this.determineMode(args);
  }

  private determineMode(args: string[]): CleanupMode {
    const argsSet = new Set(args);
    if (argsSet.has("--quick")) {
      return {
        name: "Quick Cleanup",
        description: "Fast cleanup of build artifacts and node_modules",
        targets: ["node_modules", "dist", "build", ".turbo", "coverage"],
        preserveEssential: true,
        organizeDocs: false,
        createStructure: false,
      };
    }

    if (argsSet.has("--safe")) {
      return {
        name: "Safe Cleanup",
        description: "Cleanup while preserving essential files",
        targets: [
          "node_modules", "dist", "build", ".turbo", "coverage",
          "test-*.ts", "*.lock", "*.json", "*.md", "*.sql", "*.ts", "*.css"
        ],
        preserveEssential: true,
        organizeDocs: true,
        createStructure: false,
      };
    }

    return {
      name: "Full Cleanup",
      description: "Complete workspace cleanup and organization",
      targets: [
        "node_modules", "dist", "build", ".turbo", "coverage",
        "test-*.ts", "*.lock", "*.json", "*.md", "*.sql", "*.ts", "*.css"
      ],
      preserveEssential: false,
      organizeDocs: true,
      createStructure: true,
    };
  }

  async run() {
    const start = performance.now();

    this.logHeader("🧹 AIBOS Canonical Workspace Cleanup");
    this.log(colors.cyan(`Mode: ${this.mode.name}`));
    this.log(colors.cyan(`Description: ${this.mode.description}`));
    this.log(colors.cyan(`Workspace root: ${this.workspaceRoot}`));
    this.log(colors.cyan(`Current directory: ${Deno.cwd()}`));
    if (this.dryRun) {
      this.log(colors.magenta("🧪 DRY-RUN MODE ENABLED - No files will be modified.\n"));
    }

    await this.performCleanup();

    if (this.mode.organizeDocs) {
      await this.organizeDocs();
    }
    if (this.mode.createStructure) {
      await this.createDirs();
    }

    await this.updateGitignore();
    await this.runSSOTCheck();

    this.result.duration = (performance.now() - start) / 1000;
    await this.report();
  }

  private async performCleanup() {
    for (const pattern of this.mode.targets) {
      await this.removeByPattern(pattern);
    }
    if (this.mode.preserveEssential) {
      await this.preserveEssentialFiles();
    }
  }

  private async removeByPattern(pattern: string) {
    const regex = globToRegExp(pattern, { extended: true, globstar: true });
    for await (const entry of Deno.readDir(this.workspaceRoot)) {
      if (regex.test(entry.name)) {
        const targetPath = path.join(this.workspaceRoot, entry.name);
        await this.safeRemove(targetPath, entry.isDirectory);
      }
    }
  }

  private async safeRemove(target: string, isDir = false) {
    try {
      await Deno.stat(target);
      if (this.dryRun) {
        this.log(colors.magenta(`[dry-run] Would remove: ${target}`));
        return;
      }
      await Deno.remove(target, { recursive: isDir });
      if (isDir) {
        this.result.removedDirs.push(target);
      } else {
        this.result.removedFiles.push(target);
      }
      this.log(colors.gray(`Removed: ${target}`));
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        if (this.verbose) this.log(colors.gray(`Skipped: ${target} (not found)`));
      } else {
        this.result.errors.push(`Failed to remove ${target}: ${err}`);
        this.log(colors.red(`Error removing ${target}: ${err}`));
      }
    }
  }

  private async preserveEssentialFiles() {
    const essentials = ["tailwind.config.js"];
    for (const file of essentials) {
      const fullPath = path.join(this.workspaceRoot, file);
      try {
        await Deno.stat(fullPath);
        this.result.preservedFiles.push(fullPath);
        this.log(colors.green(`Preserved essential file: ${fullPath}`));
      } catch {
        this.log(colors.yellow(`Essential file missing: ${fullPath}`));
      }
    }
  }

  private async organizeDocs() {
    const docsDir = path.join(this.workspaceRoot, "docs");
    try {
      await Deno.mkdir(docsDir, { recursive: true });
      this.log(colors.gray(`Created directory: ${docsDir}`));
    } catch (e) {
      if (e instanceof Deno.errors.AlreadyExists && this.verbose) {
        this.log(colors.gray(`Skipped creating docs (already exists)`));
      }
    }

    const mappings = [
      ["aibos-requirement.md", "aibos-requirements.md"],
      ["10min-challenge.md", "10min-challenge.md"],
    ];

    for (const [from, to] of mappings) {
      const fromPath = path.join(this.workspaceRoot, from);
      const toPath = path.join(docsDir, to);
      try {
        await Deno.stat(fromPath);
        if (this.dryRun) {
          this.log(colors.magenta(`[dry-run] Would move: ${fromPath} → ${toPath}`));
          continue;
        }
        await Deno.rename(fromPath, toPath);
        this.log(colors.gray(`Moved: ${fromPath} → ${toPath}`));
      } catch (err) {
        if (err instanceof Deno.errors.NotFound) {
          this.log(colors.gray(`Skipped moving: ${fromPath} (not found)`));
        } else {
          this.result.warnings.push(`Could not move ${fromPath}: ${err}`);
          this.log(colors.yellow(`Warning moving ${fromPath}: ${err}`));
        }
      }
    }
  }

  private async createDirs() {
    const dirs = [
      "apps",
      "docs",
      "scripts",
      path.join("src", "config"),
      path.join("src", "services"),
      path.join("src", "components"),
      path.join("src", "utils"),
    ];

    for (const dir of dirs) {
      const fullPath = path.join(this.workspaceRoot, dir);
      try {
        await Deno.mkdir(fullPath, { recursive: true });
        this.log(colors.gray(`Created directory: ${dir}`));
      } catch (e) {
        if (e instanceof Deno.errors.AlreadyExists && this.verbose) {
          this.log(colors.gray(`Skipped creating: ${dir} (already exists)`));
        } else {
          this.result.errors.push(`Could not create dir ${dir}: ${e}`);
        }
      }
    }
  }

  private async updateGitignore() {
    const gitignorePath = path.join(this.workspaceRoot, ".gitignore");
    const content = `# AIBOS Workspace Generated
node_modules/
dist/
build/
.turbo/
coverage/
.env*
deno.lock
`;
    if (this.dryRun) {
      this.log(colors.magenta(`[dry-run] Would write .gitignore`));
      return;
    }
    await Deno.writeTextFile(gitignorePath, content);
    this.log(colors.gray(`Updated .gitignore`));
  }

  private async runSSOTCheck() {
    this.log(colors.yellow("\n🔍 Running SSOT validation..."));
    try {
      const cmd = new Deno.Command("deno", {
        args: ["run", "--allow-read", "scripts/validate-ssot.ts"],
        stdout: "piped",
        stderr: "piped",
      });

      const { code, stdout, stderr } = await cmd.output();

      if (code === 0) {
        this.log(colors.green("✅ SSOT validation passed."));
      } else {
        const output = new TextDecoder().decode(stderr);
        this.result.warnings.push(`SSOT check failed: ${output}`);
        this.log(colors.yellow(`⚠️ SSOT check failed: ${output}`));
      }
    } catch (err) {
      this.result.errors.push(`Failed to run SSOT check: ${err}`);
      this.log(colors.red(`Failed to run SSOT check: ${err}`));
    }
  }

  private async report() {
    console.log("\n" + colors.cyan("=".repeat(60)));
    console.log(colors.bold("📊 AIBOS CLEANUP REPORT"));
    console.log(colors.cyan("=".repeat(60)));

    console.log(`Duration: ${this.result.duration.toFixed(2)} seconds`);
    console.log(`Removed Files: ${this.result.removedFiles.length}`);
    console.log(`Removed Dirs: ${this.result.removedDirs.length}`);
    console.log(`Preserved Files: ${this.result.preservedFiles.length}`);
    console.log(`Warnings: ${this.result.warnings.length}`);
    console.log(`Errors: ${this.result.errors.length}`);

    if (this.result.errors.length === 0) {
      console.log(colors.green("\n🎉 Cleanup completed successfully."));
    } else {
      console.log(colors.yellow("\n⚠️ Cleanup completed with errors."));
    }

    await Deno.writeTextFile(
      "cleanup-report.json",
      JSON.stringify(this.result, null, 2)
    );
    console.log(colors.gray("Generated report: cleanup-report.json"));
  }

  private log(message: string) {
    console.log(message);
  }

  private logHeader(title: string) {
    console.log("\n" + colors.bold(colors.cyan("=".repeat(60))));
    console.log(colors.bold(colors.cyan(title)));
    console.log(colors.bold(colors.cyan("=".repeat(60))));
  }
}

if (Deno.args.includes("--help") || Deno.args.includes("-h")) {
  console.log(`
Usage:
  deno run --allow-read --allow-write --allow-run --allow-env scripts/cleanup-workspace.ts [OPTIONS]

Options:
  --dry-run     Show actions without modifying files
  --quick       Fast cleanup
  --safe        Preserve essential files
  --full        Complete cleanup (default)
  --verbose     Show detailed logs
  --help, -h    Show help

Examples:
  deno run scripts/cleanup-workspace.ts --dry-run --safe
  deno run scripts/cleanup-workspace.ts --quick
`);
  Deno.exit(0);
}

if (import.meta.main) {
  const cleanup = new CanonicalCleanup(Deno.args);
  await cleanup.run();
}
