import { EnterpriseLogger } from '../services/core/logger';

export class PerformanceMonitor {
  private logger = new EnterpriseLogger();
  private startTimes = new Map<string, number>();

  startTimer(label: string): void {
    this.startTimes.set(label, performance.now());
    this.logger.info('Performance timer started', {
      component: 'PerformanceMonitor',
      action: 'startTimer',
      metadata: { label }
    });
  }

  endTimer(label: string): number {
    const startTime = this.startTimes.get(label);
    if (!startTime) {
      this.logger.warn('Timer not found', {
        component: 'PerformanceMonitor',
        action: 'endTimer',
        metadata: { label }
      });
      return 0;
    }

    const duration = performance.now() - startTime;
    this.startTimes.delete(label);
    
    this.logger.info('Performance timer completed', {
      component: 'PerformanceMonitor',
      action: 'endTimer',
      metadata: { 
        label, 
        duration: `${duration.toFixed(2)}ms` 
      }
    });

    return duration;
  }

  measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    return new Promise(async (resolve, reject) => {
      this.startTimer(label);
      try {
        const result = await fn();
        this.endTimer(label);
        resolve(result);
      } catch (error) {
        this.endTimer(label);
        this.logger.error('Async operation failed', {
          component: 'PerformanceMonitor',
          action: 'measureAsync',
          metadata: { 
            label,
            error: error instanceof Error ? error.message : String(error)
          }
        });
        reject(error);
      }
    });
  }

  logMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.logger.info('Memory usage report', {
        component: 'PerformanceMonitor',
        action: 'logMemoryUsage',
        metadata: {
          usedJSHeapSize: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
          totalJSHeapSize: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
          jsHeapSizeLimit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
        }
      });
    } else {
      this.logger.warn('Memory API not available', {
        component: 'PerformanceMonitor',
        action: 'logMemoryUsage'
      });
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();