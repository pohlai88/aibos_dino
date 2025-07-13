import React from 'react';

// Performance monitoring utilities
export interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  renderTime: number;
  timestamp: number;
}

export interface PerformanceStats {
  averageFPS: number;
  averageMemoryUsage: number;
  averageRenderTime: number;
  totalRenders: number;
  slowRenders: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private frameCount = 0;
  private lastTime = performance.now();
  private isMonitoring = false;
  private animationFrameId: number | null = null;
  private renderStartTime = 0;

  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.metrics = [];
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.monitorFrame();
  }

  stopMonitoring() {
    this.isMonitoring = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private monitorFrame() {
    if (!this.isMonitoring) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    
    if (deltaTime >= 1000) { // Every second
      const fps = (this.frameCount * 1000) / deltaTime;
      const memoryUsage = this.getMemoryUsage();
      
      this.metrics.push({
        fps,
        memoryUsage,
        renderTime: 0, // Will be set by measureRender
        timestamp: currentTime
      });

      // Keep only last 100 metrics
      if (this.metrics.length > 100) {
        this.metrics.shift();
      }

      this.frameCount = 0;
      this.lastTime = currentTime;
    }

    this.frameCount++;
    this.animationFrameId = requestAnimationFrame(() => this.monitorFrame());
  }

  measureRender<T>(fn: () => T): T {
    this.renderStartTime = performance.now();
    const result = fn();
    const renderTime = performance.now() - this.renderStartTime;
    
    // Update the latest metric with render time
    if (this.metrics.length > 0) {
      const latestMetric = this.metrics[this.metrics.length - 1];
      if (latestMetric) {
        latestMetric.renderTime = renderTime;
      }
    }

    return result;
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0;
    }
    return 0;
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  getStats(): PerformanceStats {
    if (this.metrics.length === 0) {
      return {
        averageFPS: 0,
        averageMemoryUsage: 0,
        averageRenderTime: 0,
        totalRenders: 0,
        slowRenders: 0
      };
    }

    const totalFPS = this.metrics.reduce((sum, m) => sum + m.fps, 0);
    const totalMemory = this.metrics.reduce((sum, m) => sum + m.memoryUsage, 0);
    const totalRenderTime = this.metrics.reduce((sum, m) => sum + m.renderTime, 0);
    const slowRenders = this.metrics.filter(m => m.renderTime > 16).length; // > 16ms = slow

    return {
      averageFPS: totalFPS / this.metrics.length,
      averageMemoryUsage: totalMemory / this.metrics.length,
      averageRenderTime: totalRenderTime / this.metrics.length,
      totalRenders: this.metrics.length,
      slowRenders
    };
  }

  clearMetrics() {
    this.metrics = [];
  }

  isMonitoringActive(): boolean {
    return this.isMonitoring;
  }
}

export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = React.useState<PerformanceMetrics[]>([]);
  const [stats, setStats] = React.useState<PerformanceStats>({
    averageFPS: 0,
    averageMemoryUsage: 0,
    averageRenderTime: 0,
    totalRenders: 0,
    slowRenders: 0
  });

  React.useEffect(() => {
    const updateMetrics = () => {
      setMetrics(performanceMonitor.getMetrics());
      setStats(performanceMonitor.getStats());
    };

    const interval = setInterval(updateMetrics, 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    metrics,
    stats,
    startMonitoring: () => performanceMonitor.startMonitoring(),
    stopMonitoring: () => performanceMonitor.stopMonitoring(),
    isMonitoring: performanceMonitor.isMonitoringActive(),
    clearMetrics: () => performanceMonitor.clearMetrics()
  };
}

// HOC for measuring component render performance
export function withPerformanceMeasurement<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return React.memo((props: P) => {
    const renderStart = React.useRef(performance.now());
    
    React.useEffect(() => {
      const renderTime = performance.now() - renderStart.current;
      if (renderTime > 16) {
        console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
    });

    return React.createElement(Component, props);
  });
} 