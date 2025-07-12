#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-env

import * as path from "https://deno.land/std@0.220.1/path/mod.ts";
import * as colors from "https://deno.land/std@0.220.1/fmt/colors.ts";

/**
 * AIBOS Canonical Workspace Cleanup Script
 * 
 * This is the SINGLE SOURCE OF TRUTH for workspace cleanup.
 * All cleanup functionality is consolidated here with different modes:
 * 
 * USAGE:
 *   deno run --allow-read --allow-write --allow-run --allow-env scripts/cleanup-workspace.ts [OPTIONS]
 * 
 * OPTIONS:
 *   --dry-run     Show what would be cleaned, but don't actually clean
 *   --quick       Only remove fast targets (node_modules, dist, etc.)
 *   --full        Full cleanup including documentation organization (default)
 *   --safe        Safe mode - preserve essential files like tailwind.config.js
 *   --verbose     Show detailed output
 * 
 * EXAMPLES:
 *   deno run scripts/cleanup-workspace.ts --dry-run --full
 *   deno run scripts/cleanup-workspace.ts --quick
 *   deno run scripts/cleanup-workspace.ts --safe --verbose
 */

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
    duration: 0
  };
  
  private dryRun: boolean;
  private verbose: boolean;
  private mode: CleanupMode;
  private workspaceRoot: string;

  constructor() {
    this.dryRun = Deno.args.includes('--dry-run');
    this.verbose = Deno.args.includes('--verbose');
    
    // Allow override via ENV for flexible deployment scenarios
    const customRoot = Deno.env.get("AIBOS_WORKSPACE_ROOT");
    this.workspaceRoot = customRoot || path.dirname(Deno.cwd());
    
    this.mode = this.determineMode();
  }

  private determineMode(): CleanupMode {
    const args = new Set(Deno.args);
    
    if (args.has('--quick')) {
      return {
        name: 'Quick Cleanup',
        description: 'Fast cleanup of build artifacts and node_modules',
        targets: ['node_modules', 'dist', 'build', '.turbo', 'coverage'],
        preserveEssential: true,
        organizeDocs: false,
        createStructure: false
      };
    }
    
    if (args.has('--safe')) {
      return {
        name: 'Safe Cleanup',
        description: 'Cleanup while preserving essential files',
        targets: [
          'node_modules', 'dist', 'build', '.turbo', 'coverage',
          'test-*.ts', 'create-tables.sql', 'setup-database.ts',
          'aibos-requirement.md', '10min-challenge.md', 'ai-agent-preferences-and-requirements.md',
          'os-metadata.json', 'config.ts', 'main.ts', 'index.css', 'deno.json', 'deno.lock',
          'package.json', 'package-lock.json', 'turbo.json'
        ],
        preserveEssential: true,
        organizeDocs: true,
        createStructure: false
      };
    }
    
    // Default: Full cleanup
    return {
      name: 'Full Cleanup',
      description: 'Complete workspace cleanup and organization',
      targets: [
        'node_modules', 'dist', 'build', '.turbo', 'coverage',
        'test-*.ts', 'create-tables.sql', 'setup-database.ts',
        'aibos-requirement.md', '10min-challenge.md', 'ai-agent-preferences-and-requirements.md',
        'os-metadata.json', 'config.ts', 'main.ts', 'index.css', 'deno.json', 'deno.lock',
        'package.json', 'package-lock.json', 'turbo.json'
      ],
      preserveEssential: false,
      organizeDocs: true,
      createStructure: true
    };
  }

  async run() {
    const start = performance.now();
    
    console.log(colors.bold(colors.cyan('🧹 AIBOS Canonical Workspace Cleanup')));
    console.log(colors.cyan('='.repeat(60)) + '\n');
    console.log(colors.cyan(`📋 Mode: ${this.mode.name}`));
    console.log(colors.cyan(`📝 Description: ${this.mode.description}`));
    console.log(colors.cyan(`📁 Workspace root: ${this.workspaceRoot}`));
    console.log(colors.cyan(`📁 Current directory: ${Deno.cwd()}\n`));

    if (this.dryRun) {
      console.log(colors.magenta('\n🧪 DRY-RUN MODE ENABLED - No files will be modified.\n'));
    }

    await this.cleanupRootDirectory();
    await this.cleanupCurrentDirectory();
    
    if (this.mode.organizeDocs) {
      await this.organizeDocumentation();
    }
    
    if (this.mode.createStructure) {
      await this.createProductionStructure();
    }
    
    await this.updateGitignore();
    await this.runArchitectureCheck();
    await this.generateReport();
    
    this.result.duration = (performance.now() - start) / 1000;
  }

  private async cleanupRootDirectory() {
    console.log(colors.yellow(`🔄 Cleaning root directory (${this.mode.name})...`));
    
    for (const target of this.mode.targets) {
      if (target.includes('*')) {
        // Handle glob patterns
        await this.handleGlobPattern(target);
      } else {
        const targetPath = path.join(this.workspaceRoot, target);
        await this.safeRemove(targetPath, target === 'node_modules');
      }
    }

    // Preserve essential files if in safe mode
    if (this.mode.preserveEssential) {
      const essentialFiles = [
        'tailwind.config.js'  // Required for AIBOS styling
      ];
      
      for (const file of essentialFiles) {
        const filePath = path.join(this.workspaceRoot, file);
        await this.preserveFile(filePath, 'Required for AIBOS operation');
      }
    }
  }

  private async cleanupCurrentDirectory() {
    console.log(colors.yellow('\n🔄 Cleaning current directory...'));
    
    // Remove test files
    const testFiles = ['test-ssot.ts'];
    for (const file of testFiles) {
      await this.safeRemove(file);
    }

    // Remove duplicate schema files (keep only canonical)
    for await (const entry of Deno.readDir('.')) {
      if (entry.isFile && entry.name.includes('schema') && entry.name !== 'aibos-platform-schema.sql') {
        await this.safeRemove(entry.name);
      }
    }
  }

  private async handleGlobPattern(pattern: string) {
    if (pattern === 'test-*.ts') {
      for await (const entry of Deno.readDir(this.workspaceRoot)) {
        if (entry.isFile && entry.name.startsWith('test-') && entry.name.endsWith('.ts')) {
          const filePath = path.join(this.workspaceRoot, entry.name);
          await this.safeRemove(filePath);
        }
      }
    }
  }

  private async organizeDocumentation() {
    console.log(colors.yellow('\n📚 Organizing documentation...'));
    
    const docsDir = path.join(this.workspaceRoot, 'docs');
    try {
      await Deno.mkdir(docsDir);
      console.log(colors.gray(`   Created directory: ${docsDir}`));
    } catch (error) {
      if (error instanceof Deno.errors.AlreadyExists) {
        if (this.verbose) {
          console.log(colors.gray(`   Skipped: ${docsDir} (already exists)`));
        }
      } else {
        throw error;
      }
    }

    const docsToMove = [
      { from: path.join(this.workspaceRoot, 'aibos-requirement.md'), to: path.join(docsDir, 'aibos-requirements.md') },
      { from: path.join(this.workspaceRoot, '10min-challenge.md'), to: path.join(docsDir, '10min-challenge.md') },
      { from: path.join(this.workspaceRoot, 'ai-agent-preferences-and-requirements.md'), to: path.join(docsDir, 'ai-agent-requirements.md') },
      { from: 'SUPABASE_INTEGRATION.md', to: path.join(docsDir, 'supabase-integration.md') },
      { from: 'SUPABASE_SUMMARY.md', to: path.join(docsDir, 'supabase-summary.md') },
      { from: 'PERFORMANCE_OPTIMIZATION_COMPLETE.md', to: path.join(docsDir, 'performance-optimization.md') },
      { from: 'OPTIMIZATION_SUMMARY.md', to: path.join(docsDir, 'optimization-summary.md') },
      { from: 'SPOTLIGHT_ENHANCEMENT_ROADMAP.md', to: path.join(docsDir, 'spotlight-roadmap.md') },
      { from: 'SHORTCUT_MANAGEMENT.md', to: path.join(docsDir, 'shortcut-management.md') },
      { from: 'FAVICON_SETUP.md', to: path.join(docsDir, 'favicon-setup.md') }
    ];

    for (const doc of docsToMove) {
      try {
        await Deno.stat(doc.from);
        if (this.dryRun) {
          this.result.warnings.push(`[dry-run] Would move: ${doc.from} → ${doc.to}`);
          console.log(colors.magenta(`   [dry-run] Would move: ${doc.from} → ${doc.to}`));
          continue;
        }
        await Deno.rename(doc.from, doc.to);
        console.log(colors.gray(`   Moved: ${doc.from} → ${doc.to}`));
      } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
          console.log(colors.gray(`   Skipped: ${doc.from} (not found)`));
        } else {
          this.result.warnings.push(`Warning: Could not move ${doc.from}: ${error}`);
          console.log(colors.yellow(`   Warning: Could not move ${doc.from}: ${error}`));
        }
      }
    }
  }

  private async createProductionStructure() {
    console.log(colors.yellow('\n🏗️ Creating production structure...'));
    
    const dirs = [
      'apps',
      'docs',
      'scripts',
      path.join('src', 'config'),
      path.join('src', 'services'),
      path.join('src', 'components'),
      path.join('src', 'utils')
    ];
    
    for (const dir of dirs) {
      const fullPath = path.join(this.workspaceRoot, dir);
      try {
        await Deno.mkdir(fullPath, { recursive: true });
        console.log(colors.gray(`   Created directory: ${dir}`));
      } catch (error) {
        if (error instanceof Deno.errors.AlreadyExists) {
          if (this.verbose) {
            console.log(colors.gray(`   Skipped: ${dir} (already exists)`));
          }
        } else {
          throw error;
        }
      }
    }
  }

  private async updateGitignore() {
    console.log(colors.yellow('\n📝 Updating .gitignore...'));
    
    const gitignorePath = path.join(this.workspaceRoot, '.gitignore');
    const gitignoreContent = `# AIBOS Platform - Generated .gitignore

# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Build outputs
dist/
build/
out/
.next/
.nuxt/
.vuepress/dist/

# Cache directories
.turbo/
.cache/
.parcel-cache/
.eslintcache

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# Deno
deno.lock

# Temporary files
tmp/
temp/
*.tmp
*.temp

# AIBOS specific
supabase/.temp/
supabase/.env.local
`;

    if (this.dryRun) {
      this.result.warnings.push(`[dry-run] Would update: ${gitignorePath}`);
      console.log(colors.magenta(`   [dry-run] Would update: ${gitignorePath}`));
    } else {
      try {
        await Deno.writeTextFile(gitignorePath, gitignoreContent);
        console.log(colors.gray(`   Updated: ${gitignorePath}`));
      } catch (error) {
        this.result.errors.push(`Failed to update .gitignore: ${error}`);
        console.log(colors.red(`   Error updating .gitignore: ${error}`));
      }
    }
  }

  private async runArchitectureCheck() {
    console.log(colors.yellow('\n🔍 Running architecture validation...'));
    
    try {
      const process = new Deno.Command('deno', {
        args: ['run', '--allow-read', 'scripts/validate-ssot.ts'],
        cwd: Deno.cwd(),
        stdout: 'piped',
        stderr: 'piped'
      });
      
      const { code, stdout, stderr } = await process.output();
      
      if (code === 0) {
        console.log(colors.green('   ✅ Architecture validation passed'));
        if (this.verbose) {
          console.log(colors.gray(`   Output: ${new TextDecoder().decode(stdout)}`));
        }
      } else {
        const errorOutput = new TextDecoder().decode(stderr);
        this.result.warnings.push(`Architecture validation failed: ${errorOutput}`);
        console.log(colors.yellow(`   ⚠️ Architecture validation failed: ${errorOutput}`));
      }
    } catch (error) {
      this.result.warnings.push(`Could not run architecture check: ${error}`);
      console.log(colors.yellow(`   ⚠️ Could not run architecture check: ${error}`));
    }
  }

  private async safeRemove(filePath: string, isDir = false) {
    try {
      await Deno.stat(filePath);
      if (this.dryRun) {
        this.result.warnings.push(`[dry-run] Would remove: ${filePath}`);
        console.log(colors.magenta(`   [dry-run] Would remove: ${filePath}`));
        return;
      }
      await Deno.remove(filePath, isDir ? { recursive: true } : undefined);
      if (isDir) {
        this.result.removedDirs.push(filePath);
      } else {
        this.result.removedFiles.push(filePath);
      }
      console.log(colors.gray(`   Removed: ${filePath}`));
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        console.log(colors.gray(`   Skipped: ${filePath} (not found)`));
      } else {
        this.result.errors.push(`Failed to remove ${filePath}: ${error}`);
        console.log(colors.red(`   Error: ${filePath} - ${error}`));
      }
    }
  }

  private async preserveFile(filePath: string, reason: string) {
    try {
      await Deno.stat(filePath);
      this.result.preservedFiles.push(`${filePath} (${reason})`);
      console.log(colors.green(`   Preserved: ${filePath} - ${reason}`));
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        console.log(colors.yellow(`   Warning: ${filePath} not found (expected to preserve)`));
      }
    }
  }

  private async generateReport() {
    console.log('\n' + colors.cyan('='.repeat(60)));
    console.log(colors.bold('📊 CANONICAL CLEANUP REPORT'));
    console.log(colors.cyan('='.repeat(60)));

    console.log(colors.cyan('\n📈 SUMMARY:'));
    console.log(`   Mode: ${this.mode.name}`);
    console.log(`   Duration: ${this.result.duration.toFixed(2)} seconds`);
    console.log(`   Removed Files: ${this.result.removedFiles.length}`);
    console.log(`   Removed Directories: ${this.result.removedDirs.length}`);
    console.log(`   Preserved Files: ${this.result.preservedFiles.length}`);
    console.log(`   Warnings: ${this.result.warnings.length}`);
    console.log(`   Errors: ${this.result.errors.length}`);

    if (this.result.removedFiles.length > 0) {
      console.log(`\n🗑️ Removed Files (${this.result.removedFiles.length}):`);
      this.result.removedFiles.forEach(file => {
        console.log(`   • ${file}`);
      });
    }

    if (this.result.removedDirs.length > 0) {
      console.log(`\n📁 Removed Directories (${this.result.removedDirs.length}):`);
      this.result.removedDirs.forEach(dir => {
        console.log(`   • ${dir}`);
      });
    }

    if (this.result.preservedFiles.length > 0) {
      console.log(`\n🛡️ Preserved Files (${this.result.preservedFiles.length}):`);
      this.result.preservedFiles.forEach(file => {
        console.log(`   • ${file}`);
      });
    }

    if (this.result.warnings.length > 0) {
      console.log(`\n⚠️ Warnings (${this.result.warnings.length}):`);
      this.result.warnings.forEach(w => console.log(`   • ${w}`));
    }

    if (this.result.errors.length > 0) {
      console.log(`\n❌ Errors (${this.result.errors.length}):`);
      this.result.errors.forEach(error => {
        console.log(`   • ${error}`);
      });
    }

    console.log('\n' + colors.cyan('='.repeat(60)));
    if (this.result.errors.length === 0) {
      console.log(colors.green('🎉 Canonical cleanup completed successfully!'));
      console.log(colors.green('Your AIBOS workspace is now SSOT-compliant.'));
    } else {
      console.log(colors.yellow('⚠️ Cleanup completed with some errors.'));
      console.log(colors.yellow('Please review the errors above.'));
    }
    console.log(colors.cyan('='.repeat(60)));
  }
}

// Show help if requested
if (Deno.args.includes('--help') || Deno.args.includes('-h')) {
  console.log(colors.bold(colors.cyan('AIBOS Canonical Workspace Cleanup')));
  console.log(colors.cyan('='.repeat(60)));
  console.log('\nUsage:');
  console.log('  deno run --allow-read --allow-write --allow-run --allow-env scripts/cleanup-workspace.ts [OPTIONS]');
  console.log('\nOptions:');
  console.log('  --dry-run     Show what would be cleaned, but don\'t actually clean');
  console.log('  --quick       Only remove fast targets (node_modules, dist, etc.)');
  console.log('  --full        Full cleanup including documentation organization (default)');
  console.log('  --safe        Safe mode - preserve essential files like tailwind.config.js');
  console.log('  --verbose     Show detailed output');
  console.log('  --help, -h    Show this help message');
  console.log('\nEnvironment Variables:');
  console.log('  AIBOS_WORKSPACE_ROOT  Override workspace root path (default: parent of current directory)');
  console.log('\nWorkspace Root:');
  console.log('  By default, the workspace root is assumed to be the parent of the current directory.');
  console.log('  This works for the typical AIBOS structure where you run the script from aibos-hybrid-windows/.');
  console.log('  Use AIBOS_WORKSPACE_ROOT environment variable to override this behavior.');
  console.log('\nExamples:');
  console.log('  # Run from aibos-hybrid-windows/ directory (default behavior)');
  console.log('  cd aibos-hybrid-windows');
  console.log('  deno run scripts/cleanup-workspace.ts --dry-run --full');
  console.log('\n  # Run from project root with explicit workspace root');
  console.log('  cd /my-project-root');
  console.log('  AIBOS_WORKSPACE_ROOT=/my-project-root deno run aibos-hybrid-windows/scripts/cleanup-workspace.ts --quick');
  console.log('\n  # Safe cleanup preserving essential files');
  console.log('  deno run scripts/cleanup-workspace.ts --safe --verbose');
  Deno.exit(0);
}

// Run cleanup
if (import.meta.main) {
  const cleanup = new CanonicalCleanup();
  await cleanup.run();
} 