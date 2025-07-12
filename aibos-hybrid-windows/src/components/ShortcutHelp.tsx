import React, { useState, useEffect, useMemo } from 'react';
import { useShortcutManager } from '../services/shortcutManager.ts';

interface ShortcutHelpProps {
  isVisible: boolean;
  onClose: () => void;
}

export const ShortcutHelp: React.FC<ShortcutHelpProps> = React.memo(({ isVisible, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const { getAllShortcuts } = useShortcutManager();

  // Get all shortcuts from the centralized manager
  const allShortcuts = useMemo(() => getAllShortcuts(), [getAllShortcuts]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
    
    return undefined;
  }, [isVisible, onClose]);

  // Filter shortcuts based on search and category
  const filteredShortcuts = useMemo(() => {
    let filtered = allShortcuts;

    // Filter by category
    if (activeCategory !== 'all') {
      filtered = filtered.filter(shortcut => shortcut.category === activeCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(shortcut => 
        shortcut.description.toLowerCase().includes(query) ||
        shortcut.key.toLowerCase().includes(query) ||
        shortcut.tags?.some(tag => tag.toLowerCase().includes(query)) ||
        shortcut.category.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [searchQuery, activeCategory, allShortcuts]);

  // Group filtered shortcuts by category
  const groupedShortcuts = useMemo(() => {
    return filteredShortcuts.reduce((acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
      }
      acc[shortcut.category].push(shortcut);
      return acc;
    }, {} as Record<string, typeof allShortcuts>);
  }, [filteredShortcuts]);

  // Get all unique categories
  const categories = useMemo(() => {
    const cats = [...new Set(allShortcuts.map(s => s.category))];
    return ['all', ...cats];
  }, [allShortcuts]);

  const handleCopyShortcut = async (shortcut: typeof allShortcuts[0]) => {
    try {
      await navigator.clipboard.writeText(shortcut.key);
      setShowCopiedMessage(true);
      setTimeout(() => setShowCopiedMessage(false), 2000);
    } catch (error) {
      console.error('Failed to copy shortcut:', error);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">⌨️</span>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Keyboard Shortcuts
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Master your AIBOS experience with these shortcuts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close shortcuts help"
          >
            ✕
          </button>
        </div>

        {/* Search and Filter */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search shortcuts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeCategory === category
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {Object.keys(groupedShortcuts).length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-4 block">🔍</span>
              <p className="text-gray-600 dark:text-gray-400">
                No shortcuts found for "{searchQuery}"
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
                className="mt-2 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
                <div key={category} className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                    <span className="text-xl">
                      {category === 'Navigation' && '🧭'}
                      {category === 'Applications' && '📱'}
                      {category === 'Windows' && '🪟'}
                      {category === 'Files' && '📁'}
                      {category === 'System' && '⚙️'}
                      {category === 'User' && '👤'}
                      {category === 'Appearance' && '🎨'}
                      {category === 'Help' && '❓'}
                    </span>
                    <span>{category}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({shortcuts.length})
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {shortcuts.map((shortcut) => (
                      <div 
                        key={shortcut.id} 
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{shortcut.icon}</span>
                          <div>
                            <div className="text-sm text-gray-900 dark:text-white font-medium">
                              {shortcut.description}
                            </div>
                            {shortcut.tags && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {shortcut.tags.slice(0, 2).map((tag) => (
                                  <span 
                                    key={tag}
                                    className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <kbd className="px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm group-hover:shadow-md transition-shadow">
                            {shortcut.key}
                          </kbd>
                          <button
                            onClick={() => handleCopyShortcut(shortcut)}
                            className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100"
                            title="Copy shortcut"
                          >
                            📋
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
              <span>💡 Tip: Press <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-mono rounded border">Esc</kbd> to close</span>
              {showCopiedMessage && (
                <span className="text-green-600 dark:text-green-400 animate-pulse">
                  ✓ Shortcut copied!
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {filteredShortcuts.length} of {allShortcuts.length} shortcuts
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

ShortcutHelp.displayName = 'ShortcutHelp'; 