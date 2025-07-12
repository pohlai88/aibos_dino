#!/usr/bin/env -S deno run --allow-all

/**
 * Bundle Analyzer for AIBOS (Refactored)
 *
 * Analyzes bundle sizes and provides performance insights.
 */

import { walk } from "https://deno.land/std@0.208.0/fs/mod.ts";
import { join, extname, relative } from "https://deno.land/std@0.208.0/path/mod.ts";
import * as colors from "https://deno.land/std@0.208.0/fmt/colors.ts";

interface BundleStats {
  totalSize: number;
  fileCount: number;
  fileTypes: Record<string, { count: number; size: number }>;
  largestFiles: Array<{ path: string; size: number }>;
  performanceMetrics: {
    estimatedLoadTime: number;
    compressionRatio: number;
    cacheEfficiency: number;
  };
}

class BundleAnalyzer {
  // Constants
  private readonly FILE_EXTENSIONS = [".js", ".ts", ".tsx", ".css", ".html", ".json"];
  private readonly DEFAULT_COMPRESSION_RATIO = 0.7;
  private readonly DEFAULT_CACHE_EFFICIENCY = 0.8;
  private readonly NETWORK_SPEED_3G = 1.5 * 1024 * 1024; // bytes/sec

  // Internal state
  private stats: BundleStats = {
    totalSize: 0,
    fileCount: 0,
    fileTypes: {},
    largestFiles: [],
    performanceMetrics: {
      estimatedLoadTime: 0,
      compressionRatio: this.DEFAULT_COMPRESSION_RATIO,
      cacheEfficiency: this.DEFAULT_CACHE_EFFICIENCY,
    },
  };

  private recommendations: string[] = [];

  async analyzeBundle(bundlePath: string): Promise<BundleStats> {
    this.log(`Starting analysis for bundle: ${bundlePath}`, "info");

    try {
      await this.scanDirectory(bundlePath);
      this.calculatePerformanceMetrics();
      this.generateRecommendations();
      this.generateReport();

      return this.stats;
    } catch (error) {
      this.log(`Bundle analysis failed: ${error}`, "error");
      throw error;
    }
  }

  private async scanDirectory(dirPath: string): Promise<void> {
    for await (const entry of walk(dirPath, {
      skip: [/node_modules/, /\.git/, /dist/, /build/, /scripts/],
    })) {
      if (entry.isFile) {
        const ext = extname(entry.path);
        if (this.FILE_EXTENSIONS.includes(ext)) {
          await this.analyzeFile(entry.path);
        }
      }
    }
  }

  private async analyzeFile(filePath: string): Promise<void> {
    try {
      const fileInfo = await Deno.stat(filePath);
      const size = fileInfo.size;
      const ext = extname(filePath);

      this.stats.totalSize += size;
      this.stats.fileCount++;

      if (!this.stats.fileTypes[ext]) {
        this.stats.fileTypes[ext] = { count: 0, size: 0 };
      }
      this.stats.fileTypes[ext].count++;
      this.stats.fileTypes[ext].size += size;

      this.stats.largestFiles.push({ path: filePath, size });
      this.stats.largestFiles.sort((a, b) => b.size - a.size);
      this.stats.largestFiles = this.stats.largestFiles.slice(0, 10);

      this.log(`Analyzed: ${filePath}`, "debug");
    } catch (error) {
      this.log(`Could not analyze ${filePath}: ${error}`, "warn");
    }
  }

  private calculatePerformanceMetrics(): void {
    const compressedSize = this.stats.totalSize * this.stats.performanceMetrics.compressionRatio;
    this.stats.performanceMetrics.estimatedLoadTime =
      compressedSize / this.NETWORK_SPEED_3G;
  }

  private generateRecommendations(): void {
    const { totalSize, performanceMetrics, fileCount, fileTypes } = this.stats;
    const compressedSize = totalSize * performanceMetrics.compressionRatio;

    if (compressedSize > 1024 * 1024) {
      this.addRecommendation("Bundle size exceeds 1MB - implement code splitting.");
    }
    if (fileCount > 50) {
      this.addRecommendation("Too many small files - consider bundling.");
    }
    const jsTotalSize =
      (fileTypes[".js"]?.size || 0) +
      (fileTypes[".ts"]?.size || 0) +
      (fileTypes[".tsx"]?.size || 0);
    if (jsTotalSize > totalSize * 0.8) {
      this.addRecommendation("JavaScript dominates bundle. Consider splitting vendor and app code.");
    }
    if (performanceMetrics.estimatedLoadTime > 3) {
      this.addRecommendation("Load time exceeds 3 seconds - optimize assets and consider CDN.");
    }
  }

  private generateReport(): void {
    console.log(colors.cyan("\n📊 Bundle Analysis Report"));
    console.log(colors.cyan("=".repeat(60)));

    console.log(
      `📦 Total Bundle Size: ${this.formatBytes(this.stats.totalSize)}`
    );
    console.log(`📁 Total Files: ${this.stats.fileCount}`);
    console.log(
      `⏱️  Estimated Load Time: ${this.stats.performanceMetrics.estimatedLoadTime.toFixed(2)}s`
    );
    console.log(
      `🗜️  Compressed Size: ${this.formatBytes(this.stats.totalSize * this.stats.performanceMetrics.compressionRatio)}`
    );

    console.log(colors.yellow("\n📋 File Type Breakdown:"));
    Object.entries(this.stats.fileTypes)
      .sort(([, a], [, b]) => b.size - a.size)
      .forEach(([ext, stats]) => {
        console.log(`  ${ext}: ${stats.count} files, ${this.formatBytes(stats.size)}`);
      });

    console.log(colors.yellow("\n🔝 Largest Files:"));
    this.stats.largestFiles.slice(0, 5).forEach((file, index) => {
      const relativePath = relative(Deno.cwd(), file.path);
      console.log(
        `  ${index + 1}. ${relativePath} (${this.formatBytes(file.size)})`
      );
    });

    if (this.recommendations.length > 0) {
      console.log(colors.yellow("\n💡 Recommendations:"));
      this.recommendations.forEach((r) => {
        console.log(`  • ${r}`);
      });
    } else {
      console.log(colors.green("\n✅ No critical issues detected."));
    }

    console.log(colors.cyan("=".repeat(60)));
  }

  private addRecommendation(msg: string) {
    this.recommendations.push(msg);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  async generateJsonReport(outputPath: string): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      stats: {
        ...this.stats,
        largestFiles: this.stats.largestFiles.map((file) => ({
          path: relative(Deno.cwd(), file.path),
          size: file.size,
        })),
      },
      recommendations: this.recommendations,
    };

    try {
      await Deno.writeTextFile(outputPath, JSON.stringify(report, null, 2));
      this.log(`JSON report saved to: ${outputPath}`, "info");
    } catch (error) {
      this.log(`Failed to save JSON report: ${error}`, "error");
    }
  }

  private log(msg: string, level: "info" | "warn" | "error" | "debug" = "info") {
    const prefix = {
      info: colors.blue("ℹ️ "),
      warn: colors.yellow("⚠️ "),
      error: colors.red("❌ "),
      debug: colors.gray("🐛 "),
    }[level];
    if (level === "debug" && !Deno.args.includes("--debug")) return;
    console.log(prefix + msg);
  }
}

// CLI Interface
if (import.meta.main) {
  const args = Deno.args;
  const bundlePath = args[0] || "./dist";
  const jsonOutput = args.find((arg) => arg.startsWith("--json="))?.split("=")[1];

  const analyzer = new BundleAnalyzer();

  try {
    await analyzer.analyzeBundle(bundlePath);
    if (jsonOutput) {
      await analyzer.generateJsonReport(jsonOutput);
    }
  } catch (error) {
    console.error("❌ Analysis failed:", error);
    Deno.exit(1);
  }
}
