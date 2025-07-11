import { SearchProvider } from '../types/search.ts';
import { createAppSearchResult } from './searchRegistry.ts';
import { useUIState } from '../store/uiState.ts';

// Lightweight app interface
export interface AppInfo {
  id: string;
  title: string;
  icon: string;
  description: string;
  category: string;
  permissions: string[];
  component: React.ComponentType<Record<string, unknown>>;
}

// App registry service
class AppRegistryService {
  private apps = new Map<string, AppInfo>();

  register(app: AppInfo): void {
    this.apps.set(app.id, app);
  }

  unregister(id: string): void {
    this.apps.delete(id);
  }

  get(id: string): AppInfo | undefined {
    return this.apps.get(id);
  }

  getAll(): AppInfo[] {
    return Array.from(this.apps.values());
  }

  getByCategory(category: string): AppInfo[] {
    return this.getAll().filter(app => app.category === category);
  }

  // Create search provider for apps
  createSearchProvider(): SearchProvider {
    return {
      id: 'apps',
      name: 'Applications',
      description: 'Search and launch applications',
      priority: 5,
      search: async (query: string) => {
        const { openWindow } = useUIState.getState();
        const queryLower = query.toLowerCase();
        
        return this.getAll()
          .filter(app => 
            app.title.toLowerCase().includes(queryLower) ||
            app.description.toLowerCase().includes(queryLower) ||
            app.category.toLowerCase().includes(queryLower)
          )
          .map(app => createAppSearchResult(
            app.id,
            app.title,
            app.icon,
            app.description,
            app.category,
            () => openWindow(app.id, {})
          ));
      }
    };
  }
}

// Export singleton instance
export const appRegistry = new AppRegistryService();

// Utility function to register apps
export const registerApp = (app: AppInfo): void => {
  appRegistry.register(app);
};

// Utility function to get app component
export const getAppComponent = (id: string): React.ComponentType<Record<string, unknown>> | null => {
  const app = appRegistry.get(id);
  return app ? app.component : null;
}; 