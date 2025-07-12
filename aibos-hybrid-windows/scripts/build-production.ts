#!/usr/bin/env -S deno run --allow-all

/**
 * Production Build Script for AIBOS
 * 
 * This script creates an optimized production build by:
 * 1. Removing console.log statements
 * 2. Minifying code
 * 3. Optimizing imports
 * 4. Creating a production-ready bundle
 */

import { walk } from "https://deno.land/std@0.208.0/fs/mod.ts";
import { join, extname } from "https://deno.land/std@0.208.0/path/mod.ts";

interface BuildConfig {
  inputDir: string;
  outputDir: string;
  removeConsoleLogs: boolean;
  minify: boolean;
  sourceMaps: boolean;
}

class ProductionBuilder {
  private config: BuildConfig;
  private processedFiles = 0;
  private removedLogs = 0;

  constructor(config: BuildConfig) {
    this.config = config;
  }

  async build(): Promise<void> {
    console.log('🚀 Starting production build...\n');
    
    try {
      // Create output directory
      await this.ensureOutputDir();
      
      // Process all TypeScript and TSX files
      await this.processFiles();
      
      // Copy static assets
      await this.copyStaticAssets();
      
      // Generate build report
      this.generateBuildReport();
      
    } catch (error) {
      console.error('❌ Build failed:', error);
      Deno.exit(1);
    }
  }

  private async ensureOutputDir(): Promise<void> {
    try {
      await Deno.mkdir(this.config.outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${this.config.outputDir}`);
    } catch (error) {
      if (error instanceof Deno.errors.AlreadyExists) {
        console.log(`📁 Output directory exists: ${this.config.outputDir}`);
      } else {
        throw error;
      }
    }
  }

  private async processFiles(): Promise<void> {
    console.log('🔧 Processing TypeScript files...');
    
    for await (const entry of walk(this.config.inputDir, {
      exts: ['.ts', '.tsx'],
      skip: [/node_modules/, /\.git/, /dist/, /build/, /scripts/]
    })) {
      try {
        await this.processFile(entry.path);
        this.processedFiles++;
      } catch (error) {
        console.error(`❌ Failed to process ${entry.path}:`, error);
      }
    }
  }

  private async processFile(filePath: string): Promise<void> {
    const content = await Deno.readTextFile(filePath);
    let processedContent = content;

    // Remove console.log statements in production
    if (this.config.removeConsoleLogs) {
      const originalLength = processedContent.length;
      processedContent = this.removeConsoleLogs(processedContent);
      const removedLength = originalLength - processedContent.length;
      if (removedLength > 0) {
        this.removedLogs++;
      }
    }

    // Basic minification (remove comments and extra whitespace)
    if (this.config.minify) {
      processedContent = this.minifyCode(processedContent);
    }

    // Create output path
    const relativePath = filePath.replace(this.config.inputDir, '');
    const outputPath = join(this.config.outputDir, relativePath);

    // Ensure output directory exists
    const outputDir = outputPath.substring(0, outputPath.lastIndexOf('/'));
    await Deno.mkdir(outputDir, { recursive: true });

    // Write processed file
    await Deno.writeTextFile(outputPath, processedContent);
    
    console.log(`✅ Processed: ${relativePath}`);
  }

  private removeConsoleLogs(content: string): string {
    // Remove console.log statements
    content = content.replace(/console\.log\([^)]*\);?\s*/g, '');
    
    // Remove console.warn statements
    content = content.replace(/console\.warn\([^)]*\);?\s*/g, '');
    
    // Remove console.error statements (keep these for production debugging)
    // content = content.replace(/console\.error\([^)]*\);?\s*/g, '');
    
    // Remove console.info statements
    content = content.replace(/console\.info\([^)]*\);?\s*/g, '');
    
    // Remove console.debug statements
    content = content.replace(/console\.debug\([^)]*\);?\s*/g, '');
    
    return content;
  }

  private minifyCode(content: string): string {
    // Remove single-line comments (but keep JSX comments)
    content = content.replace(/\/\/.*$/gm, '');
    
    // Remove multi-line comments (but keep JSX comments)
    content = content.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Remove extra whitespace and newlines
    content = content.replace(/\s+/g, ' ');
    
    // Remove trailing whitespace
    content = content.replace(/\s+$/gm, '');
    
    return content.trim();
  }

  private async copyStaticAssets(): Promise<void> {
    console.log('\n📁 Copying static assets...');
    
    const staticExtensions = ['.html', '.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'];
    
    for await (const entry of walk(this.config.inputDir, {
      skip: [/node_modules/, /\.git/, /dist/, /build/, /scripts/, /\.ts$/, /\.tsx$/]
    })) {
      const ext = extname(entry.path);
      if (staticExtensions.includes(ext) || entry.isDirectory) {
        try {
          const relativePath = entry.path.replace(this.config.inputDir, '');
          const outputPath = join(this.config.outputDir, relativePath);
          
          if (entry.isDirectory) {
            await Deno.mkdir(outputPath, { recursive: true });
          } else {
            const outputDir = outputPath.substring(0, outputPath.lastIndexOf('/'));
            await Deno.mkdir(outputDir, { recursive: true });
            await Deno.copyFile(entry.path, outputPath);
          }
          
          console.log(`📄 Copied: ${relativePath}`);
        } catch (error) {
          console.error(`❌ Failed to copy ${entry.path}:`, error);
        }
      }
    }
  }

  private generateBuildReport(): void {
    console.log('\n📊 Build Report');
    console.log('='.repeat(50));
    console.log(`📁 Files processed: ${this.processedFiles}`);
    console.log(`🗑️  Console.log statements removed: ${this.removedLogs}`);
    console.log(`📦 Output directory: ${this.config.outputDir}`);
    console.log(`⚡ Minification: ${this.config.minify ? 'Enabled' : 'Disabled'}`);
    console.log(`🗺️  Source maps: ${this.config.sourceMaps ? 'Enabled' : 'Disabled'}`);
    console.log('='.repeat(50));
    console.log('🎉 Production build completed successfully!');
  }
}

// Build configuration
const buildConfig: BuildConfig = {
  inputDir: '.',
  outputDir: './dist',
  removeConsoleLogs: true,
  minify: true,
  sourceMaps: false
};

// Run the build
if (import.meta.main) {
  const builder = new ProductionBuilder(buildConfig);
  await builder.build();
} 