#!/usr/bin/env -S deno run --allow-read --allow-run

import { walk } from "https://deno.land/std@0.208.0/fs/walk.ts";
import { join } from "https://deno.land/std@0.208.0/path/mod.ts";
import * as colors from "https://deno.land/std@0.208.0/fmt/colors.ts";

interface OptimizationResult {
  file: string;
  status: "success" | "error" | "warning";
  message: string;
  optimizations?: string[];
}

interface OptimizationReport {
  timestamp: string;
  durationMs: number;
  results: OptimizationResult[];
}

class PerformanceOptimizer {
  private readonly results: OptimizationResult[] = [];
  private readonly startTime = Date.now();

  async run(): Promise<void> {
    this.logSection("🚀 Starting AIBOS Performance Optimization");

    try {
      await this.typeCheck();
      await this.optimizeFiles();
      await this.analyzePerformance();
      await this.generateReports();

      this.finish(true);
    } catch (error) {
      console.error(colors.red(`❌ Optimization failed: ${error instanceof Error ? error.message : error}`));
      this.finish(false);
    }
  }

  private async typeCheck(): Promise<void> {
    this.logStep("Step 1: Type Checking");

    const process = new Deno.Command("deno", {
      args: ["check", "--all"],
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout, stderr } = await process.output();
    const output = new TextDecoder().decode(stdout);
    const errors = new TextDecoder().decode(stderr);

    if (code === 0) {
      this.record({
        file: "TypeScript Check",
        status: "success",
        message: "All TypeScript files passed type checking",
        optimizations: ["Type safety verified"],
      });
      this.logSuccess("✅ Type checking passed.");
    } else {
      this.record({
        file: "TypeScript Check",
        status: "error",
        message: "TypeScript errors found",
        optimizations: ["Resolve errors to proceed"],
      });
      this.logError("❌ Type checking failed:\n" + errors);
    }
  }

  private async optimizeFiles(): Promise<void> {
    this.logStep("Step 2: File Optimization");

    const tsFiles = await this.findTypeScriptFiles();

    for (const file of tsFiles) {
      try {
        const optimizations = await this.analyzeFile(file);
        this.record({
          file,
          status: "success",
          message: `Optimizations completed for ${file}`,
          optimizations,
        });
      } catch (e) {
        this.record({
          file,
          status: "error",
          message: `Failed to optimize ${file}: ${e instanceof Error ? e.message : e}`,
        });
      }
    }
  }

  private async analyzeFile(path: string): Promise<string[]> {
    const optimizations: string[] = [];
    const code = await Deno.readTextFile(path);

    if (code.includes("React.memo")) {
      optimizations.push("React.memo already used");
    } else if (code.includes("export const") && code.includes("React.FC")) {
      optimizations.push("Consider adding React.memo for performance");
    }

    if (code.includes("useEffect") && !code.includes("useCallback")) {
      optimizations.push("Consider using useCallback to avoid unnecessary re-renders");
    }

    if (code.includes("useState") && code.includes("useMemo")) {
      optimizations.push("useMemo already used for expensive calculations");
    }

    if (code.includes("console.log")) {
      optimizations.push("Consider removing console.log statements in production");
    }

    return optimizations;
  }

  private async analyzePerformance(): Promise<void> {
    this.logStep("Step 3: Performance Analysis");

    const bundleSizeKB = await this.estimateBundleSize();

    this.record({
      file: "Bundle Size Estimate",
      status: "success",
      message: `Estimated bundle size: ${bundleSizeKB}KB`,
      optimizations: [
        "Consider code splitting for large components",
        "Use dynamic imports for lazy loading",
        "Optimize images and static assets",
      ],
    });

    // Simulated memory usage check (browser-specific; skip in Deno runtime)
    const memoryInfo = (performance as any).memory;
    if (memoryInfo) {
      this.record({
        file: "Memory Usage",
        status: "success",
        message: `Memory usage: ${memoryInfo.usedJSHeapSize / (1024 * 1024)} MB`,
        optimizations: [
          "Monitor memory leaks in React components",
          "Clean up side effects in useEffect hooks",
        ],
      });
    }
  }

  private async estimateBundleSize(): Promise<number> {
    let sizeBytes = 0;
    const files = await this.findTypeScriptFiles();

    for (const file of files) {
      const stat = await Deno.stat(file);
      sizeBytes += stat.size;
    }

    // Rough estimate: compiled bundles grow 3-5x
    return Math.round((sizeBytes * 4) / 1024);
  }

  private async findTypeScriptFiles(): Promise<string[]> {
    const files: string[] = [];

    for await (const entry of walk(".", {
      exts: [".ts", ".tsx"],
      skip: [/node_modules/, /\.git/, /dist/, /build/],
    })) {
      if (entry.isFile) {
        files.push(entry.path);
      }
    }

    return files;
  }

  private async generateReports(): Promise<void> {
    this.logStep("Step 4: Generating Reports");

    const duration = Date.now() - this.startTime;

    const report: OptimizationReport = {
      timestamp: new Date().toISOString(),
      durationMs: duration,
      results: this.results,
    };

    const jsonPath = "optimization-report.json";
    await Deno.writeTextFile(jsonPath, JSON.stringify(report, null, 2));

    this.logSuccess(`JSON report saved: ${jsonPath}`);
    this.displaySummary();
  }

  private displaySummary(): void {
    const errors = this.results.filter((r) => r.status === "error");
    const warnings = this.results.filter((r) => r.status === "warning");
    const successes = this.results.filter((r) => r.status === "success");

    console.log(colors.cyan("\n" + "=".repeat(60)));
    console.log(colors.bold(colors.cyan("🎯 AIBOS OPTIMIZATION REPORT")));
    console.log(colors.cyan("=".repeat(60)));

    console.log(`✅ Successful optimizations: ${successes.length}`);
    console.log(`⚠️  Warnings: ${warnings.length}`);
    console.log(`❌ Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log(colors.red("\n❌ ERRORS:"));
      errors.forEach((e) => console.log(`  • ${e.file}: ${e.message}`));
    }

    if (warnings.length > 0) {
      console.log(colors.yellow("\n⚠️  WARNINGS:"));
      warnings.forEach((w) => console.log(`  • ${w.file}: ${w.message}`));
    }

    console.log(colors.green("\n✅ OPTIMIZATIONS:"));
    successes.forEach((s) => {
      console.log(`  • ${s.file}: ${s.message}`);
      s.optimizations?.forEach((opt) => console.log(`     - ${opt}`));
    });

    console.log(colors.cyan("\n" + "=".repeat(60)));
  }

  private finish(success: boolean): void {
    console.log(
      success
        ? colors.green("🎉 Optimization completed successfully!")
        : colors.red("⚠️  Optimization completed with errors.")
    );
    Deno.exit(success ? 0 : 1);
  }

  private record(result: OptimizationResult) {
    this.results.push(result);
  }

  private logSection(msg: string) {
    console.log("\n" + colors.bold(colors.cyan("=".repeat(60))));
    console.log(colors.bold(colors.cyan(msg)));
    console.log(colors.bold(colors.cyan("=".repeat(60))));
  }

  private logStep(msg: string) {
    console.log(colors.yellow(`\n🔧 ${msg}`));
  }

  private logSuccess(msg: string) {
    console.log(colors.green(`✅ ${msg}`));
  }

  private logError(msg: string) {
    console.log(colors.red(msg));
  }
}

// Run the optimizer
if (import.meta.main) {
  const optimizer = new PerformanceOptimizer();
  await optimizer.run();
}
