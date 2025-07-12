/**
 * Simple metrics tracking for performance monitoring and debugging
 */
export interface MetricsOptions {
  /** Prevent negative values (useful for counts that should never go below 0) */
  preventNegative?: boolean;
  /** Enable detailed logging */
  verbose?: boolean;
}

export class Metrics {
  private counters = new Map<string, number>();
  private readonly preventNegative: boolean;
  private readonly verbose: boolean;

  constructor(options: MetricsOptions = {}) {
    this.preventNegative = options.preventNegative ?? false;
    this.verbose = options.verbose ?? false;
  }

  /**
   * Increment a metric counter
   */
  increment(name: string, value = 1) {
    if (!name || typeof name !== 'string') {
      throw new Error('Metric name must be a non-empty string');
    }

    const currentValue = this.counters.get(name) || 0;
    let newValue = currentValue + value;
    
    if (this.preventNegative) {
      newValue = Math.max(0, newValue);
    }
    
    this.counters.set(name, newValue);
    
    if (this.verbose) {
      console.log(`📊 Metric "${name}" incremented by ${value} (total: ${newValue})`);
    }
  }

  /**
   * Decrement a metric counter (more readable than increment with negative value)
   */
  decrement(name: string, value = 1) {
    this.increment(name, -value);
  }

  /**
   * Get the current value of a metric
   */
  get(name: string): number {
    return this.counters.get(name) ?? 0;
  }

  /**
   * Delete a specific metric
   */
  delete(name: string): boolean {
    const deleted = this.counters.delete(name);
    if (this.verbose && deleted) {
      console.log(`🗑️ Metric "${name}" deleted`);
    }
    return deleted;
  }

  /**
   * Reset all metrics
   */
  reset() {
    const count = this.counters.size;
    this.counters.clear();
    if (this.verbose) {
      console.log(`🔄 Reset ${count} metrics`);
    }
  }

  /**
   * Get all metrics as a plain object (useful for APIs, dashboards, etc.)
   */
  all(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [key, value] of this.counters.entries()) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Get metrics statistics
   */
  getStats(): { totalMetrics: number; totalValue: number; metrics: Record<string, number> } {
    const metrics = this.all();
    const totalValue = Object.values(metrics).reduce((sum, value) => sum + value, 0);
    
    return {
      totalMetrics: this.counters.size,
      totalValue,
      metrics
    };
  }

  /**
   * Log all metrics to console
   */
  logAll() {
    if (this.counters.size === 0) {
      console.log('📊 No metrics recorded');
      return;
    }

    console.log('📊 Metrics Summary:');
    for (const [key, value] of this.counters.entries()) {
      console.log(`  ${key}: ${value}`);
    }
  }
}
