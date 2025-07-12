/**
 * Advanced cache implementation with TTL, LRU eviction, and type safety
 */
export interface CacheOptions {
  /** Maximum number of items in cache */
  maxSize?: number;
  /** Default TTL in milliseconds */
  defaultTTL?: number;
  /** Enable LRU eviction when maxSize is reached */
  enableLRU?: boolean;
}

export interface CacheEntry<T> {
  value: T;
  expiresAt?: number;
  lastAccessed: number;
}

export class Cache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private readonly maxSize: number;
  private readonly defaultTTL: number;
  private readonly enableLRU: boolean;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize ?? 1000;
    this.defaultTTL = options.defaultTTL ?? 5 * 60 * 1000; // 5 minutes default
    this.enableLRU = options.enableLRU ?? true;
  }

  /**
   * Set a value in the cache with optional TTL
   */
  set(key: string, value: T, ttl?: number): void {
    if (!key || typeof key !== 'string') {
      throw new Error('Cache key must be a non-empty string');
    }

    const expiresAt = ttl ? Date.now() + ttl : 
                     this.defaultTTL ? Date.now() + this.defaultTTL : undefined;

    const entry: CacheEntry<T> = {
      value,
      expiresAt,
      lastAccessed: Date.now()
    };

    // Check if we need to evict due to size limit
    if (this.enableLRU && this.store.size >= this.maxSize && !this.store.has(key)) {
      this.evictLRU();
    }

    this.store.set(key, entry);
  }

  /**
   * Get a value from cache, returns undefined if not found or expired
   */
  get(key: string): T | undefined {
    if (!key || typeof key !== 'string') {
      return undefined;
    }

    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    // Update last accessed time for LRU
    if (this.enableLRU) {
      entry.lastAccessed = Date.now();
    }

    return entry.value;
  }

  /**
   * Get a value or return default if not found/expired
   */
  getOrDefault(key: string, defaultValue: T): T {
    const value = this.get(key);
    return value !== undefined ? value : defaultValue;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    if (!key || typeof key !== 'string') {
      return false;
    }

    const entry = this.store.get(key);
    if (!entry) {
      return false;
    }

    // Check if expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from cache
   */
  delete(key: string): boolean {
    if (!key || typeof key !== 'string') {
      return false;
    }
    return this.store.delete(key);
  }

  /**
   * Clear all entries from cache
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get current cache size (excluding expired entries)
   */
  get size(): number {
    this.cleanupExpired();
    return this.store.size;
  }

  /**
   * Get all entries as array of [key, value] pairs
   */
  entries(): [string, T][] {
    this.cleanupExpired();
    return Array.from(this.store.entries()).map(([key, entry]) => [key, entry.value]);
  }

  /**
   * Get all keys (excluding expired entries)
   */
  keys(): string[] {
    this.cleanupExpired();
    return Array.from(this.store.keys());
  }

  /**
   * Get all values (excluding expired entries)
   */
  values(): T[] {
    this.cleanupExpired();
    return Array.from(this.store.values()).map(entry => entry.value);
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; hitRate: number; avgTTL: number } {
    this.cleanupExpired();
    const entries = Array.from(this.store.values());
    const avgTTL = entries.length > 0 
      ? entries.reduce((sum, entry) => sum + (entry.expiresAt ? entry.expiresAt - Date.now() : 0), 0) / entries.length
      : 0;

    return {
      size: this.store.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need to track hits/misses to calculate
      avgTTL
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.store.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.store.delete(oldestKey);
    }
  }

  /**
   * Set multiple values at once
   */
  setMultiple(entries: Array<{ key: string; value: T; ttl?: number }>): void {
    for (const { key, value, ttl } of entries) {
      this.set(key, value, ttl);
    }
  }

  /**
   * Get multiple values at once
   */
  getMultiple(keys: string[]): Map<string, T | undefined> {
    const result = new Map<string, T | undefined>();
    for (const key of keys) {
      result.set(key, this.get(key));
    }
    return result;
  }

  /**
   * Delete multiple keys at once
   */
  deleteMultiple(keys: string[]): number {
    let deletedCount = 0;
    for (const key of keys) {
      if (this.delete(key)) {
        deletedCount++;
      }
    }
    return deletedCount;
  }
}
