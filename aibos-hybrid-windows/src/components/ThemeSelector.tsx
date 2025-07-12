import { memo, useState, useEffect, useRef } from 'react';
import { useUIState } from '../store/uiState.ts';
import { themeConfigs, getThemesByCategory, ThemeVariant } from '../utils/themeManager.ts';

interface ThemeSelectorProps {
  onClose?: () => void;
  isWindow?: boolean;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = memo(({ onClose, isWindow = false }) => {
  const { theme, setTheme, cycleTheme } = useUIState();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [previewMode, setPreviewMode] = useState<'gradient' | 'full' | 'minimal'>('gradient');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const themesByCategory = getThemesByCategory();

  // Get all themes as flat array for search and navigation
  const allThemes = (): ThemeVariant[] => {
    return Object.values(themesByCategory).flat();
  };

  // Filter themes based on search and category
  const filteredThemes = (): ThemeVariant[] => {
    let themes = allThemes();

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      themes = themes.filter(themeVariant => {
        const config = themeConfigs[themeVariant];
        return config.name.toLowerCase().includes(query) ||
               config.description.toLowerCase().includes(query) ||
               themeVariant.toLowerCase().includes(query);
      });
    }

    // Filter by category
    if (activeCategory !== 'all') {
      themes = themes.filter(themeVariant => {
        const config = themeConfigs[themeVariant];
        return config.category === activeCategory;
      });
    }

    return themes;
  };

  // Get unique categories
  const categories = (): string[] => {
    const cats = [...new Set(Object.values(themeConfigs).map(config => config.category))];
    return ['all', ...cats.sort()];
  };

  // Focus search input when component mounts
  useEffect(() => {
    if (!isWindow) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isWindow]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const themes = filteredThemes();
    
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        onClose?.();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < themes.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : themes.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (themes[selectedIndex]) {
          handleThemeSelect(themes[selectedIndex]);
        }
        break;
      case 'Tab':
        e.preventDefault();
        // Cycle through results
        setSelectedIndex(prev => 
          prev < themes.length - 1 ? prev + 1 : 0
        );
        break;
      case ' ':
        e.preventDefault();
        cycleTheme();
        break;
    }
  };

  const handleThemeSelect = (selectedTheme: ThemeVariant) => {
    setTheme(selectedTheme);
    onClose?.();
  };

  const handlePreviewModeChange = (mode: 'gradient' | 'full' | 'minimal') => {
    setPreviewMode(mode);
  };

  const renderThemePreview = (themeVariant: ThemeVariant) => {
    const config = themeConfigs[themeVariant];
    
    switch (previewMode) {
      case 'full':
        return (
          <div className={`mt-3 h-16 rounded-lg ${config.gradient} relative overflow-hidden`}>
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute top-2 left-2 w-3 h-3 bg-white/20 rounded-full"></div>
            <div className="absolute top-2 right-2 w-8 h-2 bg-white/20 rounded"></div>
            <div className="absolute bottom-2 left-2 w-6 h-2 bg-white/20 rounded"></div>
            <div className="absolute bottom-2 right-2 w-4 h-2 bg-white/20 rounded"></div>
          </div>
        );
      case 'minimal':
        return (
          <div className={`mt-2 h-4 rounded ${config.gradient} opacity-60`} />
        );
      default:
        return (
          <div className={`mt-2 h-8 rounded ${config.gradient} opacity-80`} />
        );
    }
  };

  const themes = filteredThemes();
  const categoryList = categories();

  return (
    <div className={`${isWindow ? 'h-full' : 'fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4'}`}>
      <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl ${
        isWindow ? 'h-full flex flex-col' : 'w-full max-w-4xl max-h-[90vh] overflow-hidden'
      }`}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">🎨</span>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Theme Selector
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Choose from {allThemes().length} beautiful themes
                </p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Close theme selector"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search and Controls */}
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search themes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Preview:</span>
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {(['gradient', 'full', 'minimal'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handlePreviewModeChange(mode)}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      previewMode === mode
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex flex-wrap gap-2">
            {categoryList.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  activeCategory === category
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                {category === 'all' ? 'All Themes' : category}
              </button>
            ))}
          </div>
        </div>

        {/* Theme Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {themes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {themes.map((themeVariant, index) => {
                const config = themeConfigs[themeVariant];
                const isSelected = theme === themeVariant;
                const isHighlighted = index === selectedIndex;
                
                return (
                  <button
                    key={themeVariant}
                    type="button"
                    onClick={() => handleThemeSelect(themeVariant)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 text-left group ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg'
                        : isHighlighted
                        ? 'border-blue-300 dark:border-blue-600 bg-blue-25 dark:bg-blue-900/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-3xl">{config.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {config.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                          {config.description}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                          {config.category}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="text-blue-500 text-xl">✓</div>
                      )}
                    </div>
                    
                    {/* Theme preview */}
                    {renderThemePreview(themeVariant)}
                    
                    {/* Hover effect */}
                    <div className={`absolute inset-0 rounded-xl transition-opacity duration-200 ${
                      isSelected ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'
                    }`}>
                      <div className={`absolute inset-0 rounded-xl ${config.gradient} opacity-5`} />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : searchQuery.trim() ? (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">🎨</span>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                No themes found for "{searchQuery}"
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Try different keywords or check your spelling
              </p>
            </div>
          ) : (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">🎨</span>
              <p className="text-gray-600 dark:text-gray-400">
                No themes available in this category
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-6">
              <span>↑↓ Navigate</span>
              <span>Enter Select</span>
              <span>Space Cycle</span>
              <span>Esc Close</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>
                {themes.length} of {allThemes().length} theme{themes.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={cycleTheme}
                className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
              >
                Quick Cycle
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

ThemeSelector.displayName = 'ThemeSelector'; 