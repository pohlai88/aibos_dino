import { memo, useState, useEffect, useRef } from 'react';
import { useUIState } from '../store/uiState.ts';
import { appRegistry } from '../services/appRegistry.ts';
import { systemCommands } from '../services/systemCommands.ts';
import { useShortcutManager } from '../services/shortcutManager.ts';

interface MenuItem {
  id: string;
  name: string;
  icon: string;
  description?: string;
  type: 'app' | 'command' | 'shortcut';
  category: string;
  action: () => void;
  shortcut?: string;
}

export const StartMenu = memo(() => {
  const { startMenuVisible, toggleStartMenu, openWindow } = useUIState();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { getAllShortcuts } = useShortcutManager();

  // Get all menu items
  const allMenuItems = (): MenuItem[] => {
    const items: MenuItem[] = [];

    // Add apps from registry
    const apps = appRegistry.getAll();
    apps.forEach(app => {
      items.push({
        id: `app-${app.id}`,
        name: app.title,
        icon: app.icon,
        description: app.description,
        type: 'app',
        category: app.category,
        action: () => {
          openWindow(app.id);
          toggleStartMenu();
        }
      });
    });

    // Add system commands
    const commands = systemCommands.getAll();
    commands.forEach(cmd => {
      items.push({
        id: `cmd-${cmd.id}`,
        name: cmd.title,
        icon: cmd.icon || '⚙️',
        description: cmd.description,
        type: 'command',
        category: cmd.category,
        action: () => {
          cmd.action();
          toggleStartMenu();
        },
        shortcut: cmd.shortcut
      });
    });

    // Add keyboard shortcuts
    const shortcuts = getAllShortcuts();
    shortcuts.forEach(shortcut => {
      items.push({
        id: `shortcut-${shortcut.id}`,
        name: shortcut.description,
        icon: shortcut.icon || '⌨️',
        description: `Shortcut: ${shortcut.key}`,
        type: 'shortcut',
        category: `Shortcuts - ${shortcut.category}`,
        action: () => {
          shortcut.action();
          toggleStartMenu();
        },
        shortcut: shortcut.key
      });
    });

    return items;
  };

  // Filter and sort menu items
  const filteredItems = (): MenuItem[] => {
    let items = allMenuItems();

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (activeCategory !== 'all') {
      items = items.filter(item => item.category === activeCategory);
    }

    // Sort by relevance and type
    return items.sort((a, b) => {
      // Apps first, then commands, then shortcuts
      const typeOrder = { app: 0, command: 1, shortcut: 2 };
      const typeDiff = typeOrder[a.type] - typeOrder[b.type];
      if (typeDiff !== 0) return typeDiff;

      // Then alphabetically by name
      return a.name.localeCompare(b.name);
    });
  };

  // Get unique categories
  const categories = (): string[] => {
    const cats = [...new Set(allMenuItems().map(item => item.category))];
    return ['all', ...cats.sort()];
  };

  // Focus search input when menu opens
  useEffect(() => {
    if (startMenuVisible) {
      setSearchQuery('');
      setSelectedIndex(0);
      setActiveCategory('all');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [startMenuVisible]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = filteredItems();
    
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        toggleStartMenu();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < items.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : items.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (items[selectedIndex]) {
          items[selectedIndex].action();
        }
        break;
      case 'Tab':
        e.preventDefault();
        // Cycle through results
        setSelectedIndex(prev => 
          prev < items.length - 1 ? prev + 1 : 0
        );
        break;
    }
  };

  // Handle item click
  const handleItemClick = (item: MenuItem) => {
    item.action();
  };

  if (!startMenuVisible) return null;

  const menuItems = filteredItems();
  const categoryList = categories();

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-end justify-start p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🏠</span>
            <div className="flex-1">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search applications and commands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={toggleStartMenu}
              className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Close start menu"
            >
              ✕
            </button>
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
                {category === 'all' ? 'All' : category}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items */}
        <div className="max-h-96 overflow-y-auto">
          {menuItems.length > 0 ? (
            <div className="p-2">
              {menuItems.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={`w-full text-left p-3 rounded-lg transition-all duration-200 flex items-center space-x-3 ${
                    index === selectedIndex
                      ? 'bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => handleItemClick(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="text-2xl flex-shrink-0">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {item.name}
                    </div>
                    {item.description && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {item.description}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {item.category}
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex items-center space-x-2">
                    {item.shortcut && (
                      <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded font-mono">
                        {item.shortcut}
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.type === 'app' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      item.type === 'command' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                    }`}>
                      {item.type}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : searchQuery.trim() ? (
            <div className="p-8 text-center">
              <span className="text-4xl mb-4 block">🔍</span>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                No results found for "{searchQuery}"
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Try different keywords or check your spelling
              </p>
            </div>
          ) : (
            <div className="p-6">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                Quick Access
              </div>
              <div className="grid grid-cols-1 gap-2">
                {allMenuItems().slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="text-left p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center space-x-3"
                    onClick={() => handleItemClick(item)}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                        {item.name}
                      </div>
                      {item.category && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {item.category}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-4">
              <span>↑↓ Navigate</span>
              <span>Enter Select</span>
              <span>Esc Close</span>
            </div>
            <div>
              {menuItems.length > 0 && (
                <span>{menuItems.length} item{menuItems.length !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

StartMenu.displayName = 'StartMenu';
