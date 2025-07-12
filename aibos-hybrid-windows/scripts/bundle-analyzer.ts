#!/usr/bin/env -S deno run --allow-all

/**
 * Bundle Analyzer for AIBOS
 * 
 * This script analyzes bundle sizes and provides performance insights
 */

import { walk } from "https://deno.land/std@0.208.0/fs/mod.ts";
import { join, extname } from "https://deno.land/std@0.208.0/path/mod.ts";

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
  private stats: BundleStats = {
    totalSize: 0,
    fileCount: 0,
    fileTypes: {},
    largestFiles: [],
    performanceMetrics: {
      estimatedLoadTime: 0,
      compressionRatio: 0.7, // Assume 70% compression
      cacheEfficiency: 0.8   // Assume 80% cache hit rate
    }
  };

  async analyzeBundle(bundlePath: string): Promise<BundleStats> {
    console.log('📊 Analyzing bundle...\n');
    
    try {
      await this.scanDirectory(bundlePath);
      this.calculatePerformanceMetrics();
      this.generateReport();
      
      return this.stats;
    } catch (error) {
      console.error('❌ Bundle analysis failed:', error);
      throw error;
    }
  }

  private async scanDirectory(dirPath: string): Promise<void> {
    const fileExtensions = ['.js', '.ts', '.tsx', '.css', '.html', '.json'];
    
    for await (const entry of walk(dirPath, {
      skip: [/node_modules/, /\.git/, /dist/, /build/, /scripts/]
    })) {
      if (entry.isFile) {
        const ext = extname(entry.path);
        if (fileExtensions.includes(ext)) {
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
      
      // Update stats
      this.stats.totalSize += size;
      this.stats.fileCount++;
      
      // Update file type stats
      if (!this.stats.fileTypes[ext]) {
        this.stats.fileTypes[ext] = { count: 0, size: 0 };
      }
      this.stats.fileTypes[ext].count++;
      this.stats.fileTypes[ext].size += size;
      
      // Track largest files
      this.stats.largestFiles.push({ path: filePath, size });
      this.stats.largestFiles.sort((a, b) => b.size - a.size);
      this.stats.largestFiles = this.stats.largestFiles.slice(0, 10); // Keep top 10
      
    } catch (error) {
      console.warn(`⚠️  Could not analyze ${filePath}:`, error);
    }
  }

  private calculatePerformanceMetrics(): void {
    const { totalSize, performanceMetrics } = this.stats;
    
    // Estimate load time based on file size and network conditions
    // Assuming average 3G connection (1.5 Mbps)
    const networkSpeed = 1.5 * 1024 * 1024; // bytes per second
    const compressedSize = totalSize * performanceMetrics.compressionRatio;
    performanceMetrics.estimatedLoadTime = compressedSize / networkSpeed;
  }

  private generateReport(): void {
    console.log('📊 Bundle Analysis Report');
    console.log('='.repeat(60));
    
    // Overall stats
    console.log(`📦 Total Bundle Size: ${this.formatBytes(this.stats.totalSize)}`);
    console.log(`📁 Total Files: ${this.stats.fileCount}`);
    console.log(`⏱️  Estimated Load Time: ${this.stats.performanceMetrics.estimatedLoadTime.toFixed(2)}s`);
    console.log(`🗜️  Compressed Size: ${this.formatBytes(this.stats.totalSize * this.stats.performanceMetrics.compressionRatio)}`);
    
    // File type breakdown
    console.log('\n📋 File Type Breakdown:');
    Object.entries(this.stats.fileTypes)
      .sort(([, a], [, b]) => b.size - a.size)
      .forEach(([ext, stats]) => {
        console.log(`  ${ext}: ${stats.count} files, ${this.formatBytes(stats.size)}`);
      });
    
    // Largest files
    console.log('\n🔝 Largest Files:');
    this.stats.largestFiles.slice(0, 5).forEach((file, index) => {
      const relativePath = file.path.replace(Deno.cwd(), '');
      console.log(`  ${index + 1}. ${relativePath} (${this.formatBytes(file.size)})`);
    });
    
    // Performance recommendations
    this.generateRecommendations();
    
    console.log('='.repeat(60));
  }

  private generateRecommendations(): void {
    console.log('\n💡 Performance Recommendations:');
    
    const { totalSize, performanceMetrics } = this.stats;
    const compressedSize = totalSize * performanceMetrics.compressionRatio;
    
    if (compressedSize > 1024 * 1024) { // > 1MB
      console.log('  ⚠️  Bundle is large (>1MB). Consider:');
      console.log('     - Code splitting for large components');
      console.log('     - Lazy loading non-critical features');
      console.log('     - Tree shaking to remove unused code');
    }
    
    if (this.stats.fileCount > 50) {
      console.log('  ⚠️  Many small files detected. Consider:');
      console.log('     - Bundling related files together');
      console.log('     - Using a module bundler');
    }
    
    const jsFiles = this.stats.fileTypes['.js'] || { size: 0 };
    const tsFiles = this.stats.fileTypes['.ts'] || { size: 0 };
    const tsxFiles = this.stats.fileTypes['.tsx'] || { size: 0 };
    const totalJsSize = jsFiles.size + tsFiles.size + tsxFiles.size;
    
    if (totalJsSize > totalSize * 0.8) {
      console.log('  ⚠️  JavaScript dominates bundle. Consider:');
      console.log('     - Splitting vendor and application code');
      console.log('     - Using dynamic imports for routes');
      console.log('     - Implementing service workers for caching');
    }
    
    if (performanceMetrics.estimatedLoadTime > 3) {
      console.log('  ⚠️  Slow estimated load time. Consider:');
      console.log('     - Implementing progressive loading');
      console.log('     - Using CDN for static assets');
      console.log('     - Optimizing images and media');
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Generate a JSON report for CI/CD integration
  async generateJsonReport(outputPath: string): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      recommendations: this.getRecommendationsList()
    };
    
    await Deno.writeTextFile(outputPath, JSON.stringify(report, null, 2));
    console.log(`📄 JSON report saved to: ${outputPath}`);
  }

  private getRecommendationsList(): string[] {
    const recommendations: string[] = [];
    const { totalSize, performanceMetrics } = this.stats;
    const compressedSize = totalSize * performanceMetrics.compressionRatio;
    
    if (compressedSize > 1024 * 1024) {
      recommendations.push('Bundle size exceeds 1MB - implement code splitting');
    }
    
    if (this.stats.fileCount > 50) {
      recommendations.push('Too many small files - consider bundling');
    }
    
    if (performanceMetrics.estimatedLoadTime > 3) {
      recommendations.push('Load time exceeds 3 seconds - optimize assets');
    }
    
    return recommendations;
  }
}

// CLI interface
if (import.meta.main) {
  const args = Deno.args;
  const bundlePath = args[0] || './dist';
  const jsonOutput = args[1];
  
  const analyzer = new BundleAnalyzer();
  
  try {
    await analyzer.analyzeBundle(bundlePath);
    
    if (jsonOutput) {
      await analyzer.generateJsonReport(jsonOutput);
    }
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    Deno.exit(1);
  }
} 