import React, { useState, useEffect, useCallback } from 'react';
import { aibosPlatformService, App, AppInstallation } from '../services/aibos-platform.ts';

interface AppStoreProps {
  tenantId: string;
  onAppInstalled?: (app: App) => void;
  onAppUninstalled?: (appId: string) => void;
}

interface AppCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon: string;
  color: string;
  sort_order: number;
}

const AppStore: React.FC<AppStoreProps> = ({ tenantId, onAppInstalled, onAppUninstalled }) => {
  const [apps, setApps] = useState<App[]>([]);
  const [categories, setCategories] = useState<AppCategory[]>([]);
  const [installedApps, setInstalledApps] = useState<AppInstallation[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load apps and categories
  const loadApps = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load categories
      const categoriesResponse = await aibosPlatformService.getAppCategories();
      if (categoriesResponse.success) {
        setCategories(categoriesResponse.data || []);
      }

      // Load apps
      const appsResponse = await aibosPlatformService.getPublishedApps();
      if (appsResponse.success) {
        setApps(appsResponse.data || []);
      }

      // Load installed apps
      const installedResponse = await aibosPlatformService.getTenantApps(tenantId);
      if (installedResponse.success) {
        setInstalledApps(installedResponse.data || []);
      }
    } catch (err) {
      setError('Failed to load apps');
      console.error('Error loading apps:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // Install app
  const installApp = async (app: App) => {
    try {
      setInstalling(app.id);
      setError(null);

      const response = await aibosPlatformService.installApp(app.id, tenantId);
      
      if (response.success) {
        // Refresh installed apps
        const installedResponse = await aibosPlatformService.getTenantApps(tenantId);
        if (installedResponse.success) {
          setInstalledApps(installedResponse.data || []);
        }
        
        onAppInstalled?.(app);
        
        // Show success notification
        await aibosPlatformService.createNotification(
          tenantId,
          (await aibosPlatformService.getCurrentUser())?.id || '',
          'success',
          'App Installed',
          `${app.name} has been successfully installed!`,
          app.id
        );
      } else {
        setError(response.error || 'Failed to install app');
      }
    } catch (err) {
      setError('Failed to install app');
      console.error('Error installing app:', err);
    } finally {
      setInstalling(null);
    }
  };

  // Uninstall app
  const uninstallApp = async (installation: AppInstallation) => {
    try {
      setError(null);

      const response = await aibosPlatformService.uninstallApp(installation.id);
      
      if (response.success) {
        // Refresh installed apps
        const installedResponse = await aibosPlatformService.getTenantApps(tenantId);
        if (installedResponse.success) {
          setInstalledApps(installedResponse.data || []);
        }
        
        onAppUninstalled?.(installation.app_id);
        
        // Show success notification
        await aibosPlatformService.createNotification(
          tenantId,
          (await aibosPlatformService.getCurrentUser())?.id || '',
          'info',
          'App Uninstalled',
          'App has been successfully uninstalled.',
          installation.app_id
        );
      } else {
        setError(response.error || 'Failed to uninstall app');
      }
    } catch (err) {
      setError('Failed to uninstall app');
      console.error('Error uninstalling app:', err);
    }
  };

  // Check if app is installed
  const isAppInstalled = (appId: string): boolean => {
    return installedApps.some(installation => installation.app_id === appId);
  };

  // Get installation status
  const getInstallationStatus = (appId: string): string | null => {
    const installation = installedApps.find(inst => inst.app_id === appId);
    return installation?.status || null;
  };

  // Filter apps based on category and search
  const filteredApps = apps.filter(app => {
    const matchesCategory = selectedCategory === 'all' || app.category_id === selectedCategory;
    const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  // Load data on mount
  useEffect(() => {
    loadApps();
  }, [loadApps]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading apps...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI-BOS App Store</h1>
        <p className="text-gray-600">Discover and install powerful apps for your workspace</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search apps..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Category Filter */}
        <div className="sm:w-48">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Apps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredApps.map(app => {
          const isInstalled = isAppInstalled(app.id);
          const installationStatus = getInstallationStatus(app.id);
          const isInstalling = installing === app.id;

          return (
            <div key={app.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              {/* App Icon */}
              <div className="h-48 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-6xl">{app.icon_url || '📱'}</div>
              </div>

              {/* App Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">{app.name}</h3>
                  {app.is_featured && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      ⭐ Featured
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {app.description}
                </p>

                {/* App Stats */}
                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <span>📥 {app.downloads_count} downloads</span>
                  <span>⭐ {app.rating_average.toFixed(1)} ({app.rating_count})</span>
                </div>

                {/* Tags */}
                {app.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {app.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Button */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {app.is_free ? 'Free' : `$${app.price}`}
                  </span>

                  {isInstalled ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => uninstallApp(installedApps.find(inst => inst.app_id === app.id)!)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                      >
                        Uninstall
                      </button>
                      <button
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                      >
                        Open
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => installApp(app)}
                      disabled={isInstalling}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        isInstalling
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isInstalling ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Installing...
                        </div>
                      ) : (
                        'Install'
                      )}
                    </button>
                  )}
                </div>

                {/* Installation Status */}
                {installationStatus && installationStatus !== 'installed' && (
                  <div className="mt-2 text-xs text-gray-500">
                    Status: {installationStatus}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredApps.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No apps found</h3>
          <p className="text-gray-600">
            Try adjusting your search terms or category filter
          </p>
        </div>
      )}

      {/* Installed Apps Section */}
      {installedApps.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Installed Apps</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {installedApps.map(installation => {
              const app = apps.find(a => a.id === installation.app_id);
              if (!app) return null;

              return (
                <div key={installation.id} className="bg-white rounded-lg shadow-md overflow-hidden border-2 border-green-200">
                  <div className="h-32 bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
                    <div className="text-4xl">{app.icon_url || '📱'}</div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">{app.name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        Status: {installation.status}
                      </span>
                      <button
                        onClick={() => uninstallApp(installation)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                      >
                        Uninstall
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AppStore; 