/**
 * AIBOS Performance Monitoring
 * Tracks app performance, memory usage, and provides optimization insights
 */

export interface PerformanceMetrics {
  timestamp: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage?: number;
  renderTime: number;
  componentCount: number;
  windowCount: number;
  searchLatency?: number;
}

export interface PerformanceThresholds {
  memoryWarning: number; // percentage
  memoryCritical: number; // percentage
  renderTimeWarning: number; // milliseconds
  renderTimeCritical: number; // milliseconds
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private thresholds: PerformanceThresholds = {
    memoryWarning: 70,
    memoryCritical: 90,
    renderTimeWarning: 16, // 60fps = ~16ms
    renderTimeCritical: 33, // 30fps = ~33ms
  };
  private isMonitoring = false;
  private monitoringInterval?: number;

  /**
   * Start performance monitoring
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.recordMetrics();
    }, intervalMs);
    
    console.log('📊 Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    console.log('📊 Performance monitoring stopped');
  }

  /**
   * Record current performance metrics
   */
  recordMetrics(): void {
    const memory = this.getMemoryUsage();
    const metrics: PerformanceMetrics = {
      timestamp: Date.now(),
      memoryUsage: memory,
      renderTime: this.measureRenderTime(),
      componentCount: this.getComponentCount(),
      windowCount: this.getWindowCount(),
    };

    this.metrics.push(metrics);
    
    // Keep only last 100 metrics to prevent memory bloat
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // Check thresholds and warn if needed
    this.checkThresholds(metrics);
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): PerformanceMetrics['memoryUsage'] {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const used = memory.usedJSHeapSize;
      const total = memory.totalJSHeapSize;
      const percentage = (used / total) * 100;
      
      return {
        used: Math.round(used / 1024 / 1024), // MB
        total: Math.round(total / 1024 / 1024), // MB
        percentage: Math.round(percentage),
      };
    }
    
    // Fallback for browsers without memory API
    return {
      used: 0,
      total: 0,
      percentage: 0,
    };
  }

  /**
   * Measure render time using requestAnimationFrame
   */
  private measureRenderTime(): number {
    const start = performance.now();
    
    return new Promise<number>((resolve) => {
      requestAnimationFrame(() => {
        const end = performance.now();
        resolve(end - start);
      });
    }) as any; // Simplified for this example
  }

  /**
   * Get current component count (simplified)
   */
  private getComponentCount(): number {
    // This would need to be implemented with React DevTools or similar
    // For now, return a placeholder
    return document.querySelectorAll('[data-component]').length;
  }

  /**
   * Get current window count
   */
  private getWindowCount(): number {
    // This would need to be implemented with the UI state
    // For now, return a placeholder
    return document.querySelectorAll('.window').length;
  }

  /**
   * Check performance thresholds and warn if exceeded
   */
  private checkThresholds(metrics: PerformanceMetrics): void {
    const { memoryUsage, renderTime } = metrics;
    
    if (memoryUsage.percentage > this.thresholds.memoryCritical) {
      console.warn(`🚨 Critical memory usage: ${memoryUsage.percentage}%`);
      this.emitWarning('memory-critical', metrics);
    } else if (memoryUsage.percentage > this.thresholds.memoryWarning) {
      console.warn(`⚠️  High memory usage: ${memoryUsage.percentage}%`);
      this.emitWarning('memory-warning', metrics);
    }
    
    if (renderTime > this.thresholds.renderTimeCritical) {
      console.warn(`🚨 Critical render time: ${renderTime.toFixed(2)}ms`);
      this.emitWarning('render-critical', metrics);
    } else if (renderTime > this.thresholds.renderTimeWarning) {
      console.warn(`⚠️  Slow render time: ${renderTime.toFixed(2)}ms`);
      this.emitWarning('render-warning', metrics);
    }
  }

  /**
   * Emit performance warning
   */
  private emitWarning(type: string, metrics: PerformanceMetrics): void {
    const event = new CustomEvent('performance-warning', {
      detail: { type, metrics }
    });
    window.dispatchEvent(event);
  }

  /**
   * Get performance report
   */
  getReport(): {
    current: PerformanceMetrics | null;
    average: {
      memoryUsage?: { percentage: number };
      renderTime?: number;
    };
    trends: string[];
  } {
    if (this.metrics.length === 0) {
      return {
        current: null,
        average: {},
        trends: [],
      };
    }

    const current = this.metrics[this.metrics.length - 1];
    const recent = this.metrics.slice(-10);
    
    const average = {
      memoryUsage: {
        percentage: recent.reduce((sum, m) => sum + m.memoryUsage.percentage, 0) / recent.length,
      },
      renderTime: recent.reduce((sum, m) => sum + m.renderTime, 0) / recent.length,
    };

    const trends = this.analyzeTrends();

    return { current, average, trends };
  }

  /**
   * Analyze performance trends
   */
  private analyzeTrends(): string[] {
    if (this.metrics.length < 5) return [];
    
    const trends: string[] = [];
    const recent = this.metrics.slice(-5);
    const older = this.metrics.slice(-10, -5);
    
    if (older.length === 0) return trends;
    
    const recentAvgMemory = recent.reduce((sum, m) => sum + m.memoryUsage.percentage, 0) / recent.length;
    const olderAvgMemory = older.reduce((sum, m) => sum + m.memoryUsage.percentage, 0) / older.length;
    
    if (recentAvgMemory > olderAvgMemory + 10) {
      trends.push('Memory usage is increasing');
    } else if (recentAvgMemory < olderAvgMemory - 10) {
      trends.push('Memory usage is decreasing');
    }
    
    const recentAvgRender = recent.reduce((sum, m) => sum + m.renderTime, 0) / recent.length;
    const olderAvgRender = older.reduce((sum, m) => sum + m.renderTime, 0) / older.length;
    
    if (recentAvgRender > olderAvgRender + 5) {
      trends.push('Render time is increasing');
    } else if (recentAvgRender < olderAvgRender - 5) {
      trends.push('Render time is improving');
    }
    
    return trends;
  }

  /**
   * Set performance thresholds
   */
  setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-start monitoring in development
if (typeof window !== 'undefined') {
  performanceMonitor.startMonitoring();
} 