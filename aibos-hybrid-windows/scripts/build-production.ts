#!/usr/bin/env -S deno run --allow-all

/**
 * Enterprise Production Builder for AIBOS
 *
 * This script performs:
 * - Console removal
 * - Code minification
 * - Static asset copying
 * - Production-ready build report
 */

import { walk } from "https://deno.land/std@0.208.0/fs/mod.ts";
import { join, extname, relative, dirname } from "https://deno.land/std@0.208.0/path/mod.ts";
import * as colors from "https://deno.land/std@0.208.0/fmt/colors.ts";

interface BuildConfig {
  inputDir: string;
  outputDir: string;
  removeConsoleLogs: boolean;
  minify: boolean;
  sourceMaps: boolean;
}

interface BuildStats {
  filesProcessed: number;
  logsRemoved: number;
  totalSize: number;
  startTime: number;
  endTime: number;
}

class ProductionBuilder {
  private config: BuildConfig;
  private stats: BuildStats = {
    filesProcessed: 0,
    logsRemoved: 0,
    totalSize: 0,
    startTime: 0,
    endTime: 0,
  };

  private readonly staticExtensions = [
    ".html", ".css", ".js", ".json",
    ".png", ".jpg", ".jpeg", ".gif",
    ".svg", ".ico", ".woff", ".woff2",
    ".ttf", ".eot"
  ];

  constructor(config: BuildConfig) {
    this.config = config;
  }

  async build(): Promise<void> {
    this.stats.startTime = Date.now();

    console.log(colors.bold(colors.cyan("\n🚀 Starting AIBOS Production Build...")));

    try {
      await this.ensureOutputDir();
      await this.processSourceFiles();
      await this.copyStaticAssets();
      this.stats.endTime = Date.now();
      this.generateBuildReport();
    } catch (error) {
      console.error(colors.red(`❌ Build failed: ${error.message}`));
      Deno.exit(1);
    }
  }

  private async ensureOutputDir(): Promise<void> {
    try {
      await Deno.mkdir(this.config.outputDir, { recursive: true });
      console.log(colors.green(`📁 Created output directory: ${this.config.outputDir}`));
    } catch (error) {
      if (error instanceof Deno.errors.AlreadyExists) {
        console.log(colors.yellow(`📁 Output directory exists: ${this.config.outputDir}`));
      } else {
        throw error;
      }
    }
  }

  private async processSourceFiles(): Promise<void> {
    console.log(colors.yellow("\n🔧 Processing TypeScript and TSX files..."));

    for await (const entry of walk(this.config.inputDir, {
      exts: [".ts", ".tsx"],
      skip: [/node_modules/, /\.git/, /dist/, /build/, /scripts/]
    })) {
      if (entry.isFile) {
        await this.processFile(entry.path);
      }
    }
  }

  private async processFile(filePath: string): Promise<void> {
    const content = await Deno.readTextFile(filePath);
    let modified = content;

    // Remove console logs
    if (this.config.removeConsoleLogs) {
      const [cleaned, logsRemoved] = this.removeConsoleStatements(modified);
      modified = cleaned;
      this.stats.logsRemoved += logsRemoved;
    }

    // Minify if enabled
    if (this.config.minify) {
      modified = this.minifyCode(modified);
    }

    // Determine output path
    const relativePath = relative(this.config.inputDir, filePath);
    const outputPath = join(this.config.outputDir, relativePath);

    // Ensure output subdirectory exists
    await Deno.mkdir(dirname(outputPath), { recursive: true });

    await Deno.writeTextFile(outputPath, modified);

    const fileSize = (await Deno.stat(outputPath)).size;
    this.stats.totalSize += fileSize;
    this.stats.filesProcessed++;

    console.log(colors.gray(`✅ Processed: ${relativePath}`));
  }

  private removeConsoleStatements(content: string): [string, number] {
    let logsRemoved = 0;
    const original = content;

    const patterns = [
      /console\.log\([^;]*\);?/g,
      /console\.info\([^;]*\);?/g,
      /console\.warn\([^;]*\);?/g,
      /console\.debug\([^;]*\);?/g,
      // Uncomment if you wish to remove errors in production:
      // /console\.error\([^;]*\);?/g,
    ];

    patterns.forEach((pattern) => {
      content = content.replace(pattern, () => {
        logsRemoved++;
        return "";
      });
    });

    return [content, logsRemoved];
  }

  private minifyCode(content: string): string {
    return content
      // Remove single-line comments (avoid removing JSX comments)
      .replace(/\/\/.*$/gm, "")
      // Remove multi-line comments
      .replace(/\/\*[\s\S]*?\*\//g, "")
      // Remove extra spaces
      .replace(/\s+/g, " ")
      // Trim trailing whitespace
      .trim();
  }

  private async copyStaticAssets(): Promise<void> {
    console.log(colors.yellow("\n📁 Copying static assets..."));

    for await (const entry of walk(this.config.inputDir, {
      skip: [/node_modules/, /\.git/, /dist/, /build/, /scripts/]
    })) {
      if (entry.isFile && this.isStaticAsset(entry.path)) {
        const relativePath = relative(this.config.inputDir, entry.path);
        const outputPath = join(this.config.outputDir, relativePath);

        await Deno.mkdir(dirname(outputPath), { recursive: true });
        await Deno.copyFile(entry.path, outputPath);

        const fileSize = (await Deno.stat(outputPath)).size;
        this.stats.totalSize += fileSize;

        console.log(colors.gray(`📄 Copied: ${relativePath}`));
      }
    }
  }

  private isStaticAsset(filePath: string): boolean {
    return this.staticExtensions.includes(extname(filePath));
  }

  private generateBuildReport(): void {
    const duration = (this.stats.endTime - this.stats.startTime) / 1000;

    console.log(colors.cyan("\n📊 BUILD REPORT"));
    console.log(colors.cyan("=".repeat(50)));
    console.log(`Files processed: ${this.stats.filesProcessed}`);
    console.log(`Console logs removed: ${this.stats.logsRemoved}`);
    console.log(`Total output size: ${this.formatBytes(this.stats.totalSize)}`);
    console.log(`Minification: ${this.config.minify ? "Enabled" : "Disabled"}`);
    console.log(`Source maps: ${this.config.sourceMaps ? "Enabled" : "Disabled"}`);
    console.log(`Duration: ${duration.toFixed(2)}s`);
    console.log(colors.cyan("=".repeat(50)));
    console.log(colors.green("🎉 Production build completed successfully!\n"));
  }

  private formatBytes(bytes: number): string {
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }
}

// Load CLI args (basic example)
const buildConfig: BuildConfig = {
  inputDir: ".",
  outputDir: "./dist",
  removeConsoleLogs: true,
  minify: true,
  sourceMaps: false,
};

// Run the build
if (import.meta.main) {
  const builder = new ProductionBuilder(buildConfig);
  await builder.build();
}
