import { SearchProvider, SearchResult, SearchRegistry } from '../types/search.ts';

// Global search registry instance
class GlobalSearchRegistry implements SearchRegistry {
  providers = new Map<string, SearchProvider>();
  private cache = new Map<string, { timestamp: number; results: SearchResult[] }>();
  private cacheTTL = 10000; // 10 seconds
  private quickAccessCache: SearchResult[] | null = null;
  private quickAccessCacheTTL = 30000; // 30 seconds

  register(provider: SearchProvider): void {
    this.providers.set(provider.id, provider);
  }

  unregister(id: string): void {
    this.providers.delete(id);
  }

  private getCacheKey(providerId: string, query: string, limit?: number) {
    return `${providerId}:${query}:${limit || ''}`;
  }

  async search(query: string, limit?: number): Promise<SearchResult[]> {
    if (!query.trim()) return [];
    const now = Date.now();
    const searchPromises = Array.from(this.providers.values()).map(async (provider) => {
      const cacheKey = this.getCacheKey(provider.id, query, limit);
      const cached = this.cache.get(cacheKey);
      if (cached && (now - cached.timestamp < this.cacheTTL)) {
        return cached.results;
      }
      try {
        const results = await provider.search(query, limit);
        this.cache.set(cacheKey, { timestamp: now, results });
        return results;
      } catch (error) {
        console.warn(`Search provider ${provider.id} failed:`, error);
        return [];
      }
    });
    const results = await Promise.all(searchPromises);
    return this.sortResults(results.flat(), query);
  }

  async searchStream(query: string, onResult: (partialResults: SearchResult[]) => void, limit?: number): Promise<SearchResult[]> {
    if (!query.trim()) return [];
    const now = Date.now();
    const providerPromises = Array.from(this.providers.values()).map(async (provider) => {
      const cacheKey = this.getCacheKey(provider.id, query, limit);
      const cached = this.cache.get(cacheKey);
      if (cached && (now - cached.timestamp < this.cacheTTL)) {
        onResult(cached.results);
        return cached.results;
      }
      try {
        const results = await provider.search(query, limit);
        this.cache.set(cacheKey, { timestamp: now, results });
        onResult(results);
        return results;
      } catch (error) {
        console.warn(`Search provider ${provider.id} failed:`, error);
        return [];
      }
    });
    const allResults = await Promise.all(providerPromises);
    return this.sortResults(allResults.flat(), query);
  }

  async getQuickAccess(limit: number = 8): Promise<SearchResult[]> {
    const now = Date.now();
    
    // Check cache first
    if (this.quickAccessCache && (now - (this.quickAccessCache as any).timestamp < this.quickAccessCacheTTL)) {
      return this.quickAccessCache.slice(0, limit);
    }

    // Collect quick access items from all providers
    const quickAccessPromises = Array.from(this.providers.values()).map(async (provider) => {
      if (provider.getQuickAccess) {
        try {
          return await provider.getQuickAccess(limit);
        } catch (error) {
          console.warn(`Quick access from provider ${provider.id} failed:`, error);
          return [];
        }
      }
      return [];
    });

    const allQuickAccess = await Promise.all(quickAccessPromises);
    const combined = this.sortResults(allQuickAccess.flat(), '');
    
    // Cache the results with timestamp
    this.quickAccessCache = combined as any;
    (this.quickAccessCache as any).timestamp = now;
    
    return combined.slice(0, limit);
  }

  private sortResults(results: SearchResult[], query: string): SearchResult[] {
    const queryLower = query.toLowerCase();
    return results.sort((a, b) => {
      if (a.priority !== b.priority) {
        return (b.priority || 0) - (a.priority || 0);
      }
      const aExactMatch = a.title.toLowerCase() === queryLower;
      const bExactMatch = b.title.toLowerCase() === queryLower;
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;
      const aStartsWith = a.title.toLowerCase().startsWith(queryLower);
      const bStartsWith = b.title.toLowerCase().startsWith(queryLower);
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      const typePriority = { app: 5, command: 4, system: 3, file: 2, custom: 1 };
      const aTypePriority = typePriority[a.type] || 0;
      const bTypePriority = typePriority[b.type] || 0;
      if (aTypePriority !== bTypePriority) {
        return bTypePriority - aTypePriority;
      }
      return a.title.localeCompare(b.title);
    });
  }
}

// Export singleton instance
export const searchRegistry = new GlobalSearchRegistry();

// Utility function to create search results
export const createSearchResult = (
  id: string,
  type: SearchResult['type'],
  title: string,
  action: () => void | Promise<void>,
  options: Partial<SearchResult> = {}
): SearchResult => ({
  id,
  type,
  title,
  action,
  priority: 0,
  ...options,
});

// Utility function to create app search results
export const createAppSearchResult = (
  appId: string,
  title: string,
  icon: string,
  description: string,
  category: string,
  action: () => void | Promise<void>
): SearchResult => ({
  id: `app-${appId}`,
  type: 'app',
  title,
  icon,
  description,
  category,
  action,
  priority: 5, // Apps get high priority
  metadata: { appId, category },
});

// Utility function to create command search results
export const createCommandSearchResult = (
  id: string,
  title: string,
  command: string,
  action: () => void | Promise<void>,
  shortcut?: string
): SearchResult => ({
  id: `command-${id}`,
  type: 'command',
  title,
  action,
  priority: 4,
  metadata: { command, shortcut },
});

// Utility function to create system search results
export const createSystemSearchResult = (
  id: string,
  title: string,
  systemAction: string,
  action: () => void | Promise<void>,
  icon?: string
): SearchResult => ({
  id: `system-${id}`,
  type: 'system',
  title,
  icon,
  action,
  priority: 3,
  metadata: { systemAction },
}); 