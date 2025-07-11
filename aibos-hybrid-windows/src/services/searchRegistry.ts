import { SearchProvider, SearchResult, SearchRegistry } from '../types/search.ts';

// Global search registry instance
class GlobalSearchRegistry implements SearchRegistry {
  providers = new Map<string, SearchProvider>();

  register(provider: SearchProvider): void {
    this.providers.set(provider.id, provider);
  }

  unregister(id: string): void {
    this.providers.delete(id);
  }

  async search(query: string): Promise<SearchResult[]> {
    if (!query.trim()) return [];

    const searchPromises = Array.from(this.providers.values()).map(async (provider) => {
      try {
        return await provider.search(query);
      } catch (error) {
        console.warn(`Search provider ${provider.id} failed:`, error);
        return [];
      }
    });

    const results = await Promise.all(searchPromises);
    const flatResults = results.flat();

    // Sort by priority and relevance
    return this.sortResults(flatResults, query);
  }

  private sortResults(results: SearchResult[], query: string): SearchResult[] {
    const queryLower = query.toLowerCase();
    
    return results.sort((a, b) => {
      // Priority first (higher number = higher priority)
      if (a.priority !== b.priority) {
        return (b.priority || 0) - (a.priority || 0);
      }

      // Exact title match gets highest priority
      const aExactMatch = a.title.toLowerCase() === queryLower;
      const bExactMatch = b.title.toLowerCase() === queryLower;
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      // Starts with query gets higher priority
      const aStartsWith = a.title.toLowerCase().startsWith(queryLower);
      const bStartsWith = b.title.toLowerCase().startsWith(queryLower);
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;

      // Type priority: app > command > system > file > custom
      const typePriority = { app: 5, command: 4, system: 3, file: 2, custom: 1 };
      const aTypePriority = typePriority[a.type] || 0;
      const bTypePriority = typePriority[b.type] || 0;
      if (aTypePriority !== bTypePriority) {
        return bTypePriority - aTypePriority;
      }

      // Alphabetical order for same priority items
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