import { memo, useState, useEffect, useRef, useMemo } from 'react';
import { useUIState } from '../store/uiState.ts';
import { searchRegistry } from '../services/searchRegistry.ts';
// Simple debounce utility for Deno compatibility
function debounce<T extends (...args: any[]) => void>(fn: T, wait: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
  debounced.cancel = () => {
    if (timeout) clearTimeout(timeout);
    timeout = null;
  };
  return debounced as T & { cancel: () => void };
}

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  icon: string;
  type: 'app' | 'command' | 'file' | 'setting';
  action: () => void;
  tags?: string[];
  category?: string;
}

export const Spotlight = memo(() => {
  const { spotlightVisible, closeSpotlight } = useUIState();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [quickAccess, setQuickAccess] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultLimit = 10;

  // Focus input when spotlight opens
  useEffect(() => {
    if (spotlightVisible) {
      setQuery('');
      setSelectedIndex(0);
      setResults([]);
      // Load quick access items
      searchRegistry.getQuickAccess(8).then(items => {
        setQuickAccess(items);
      });
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [spotlightVisible]);

  // Debounced search handler
  const debouncedSearch = useMemo(() => debounce((q: string) => {
    setIsLoading(true);
    setResults([]);
    let allResults: any[] = [];
    searchRegistry.searchStream(q, (partial) => {
      allResults = [...allResults, ...partial];
      // Remove duplicates by id
      const unique = Array.from(new Map(allResults.map(r => [r.id, r])).values());
      setResults(unique.slice(0, resultLimit));
    }, resultLimit).then(finalResults => {
      setIsLoading(false);
      setResults(finalResults.slice(0, resultLimit));
      setSelectedIndex(0);
    });
  }, 200), []);

  // Search functionality
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    debouncedSearch(query);
    return () => {
      debouncedSearch.cancel();
    };
  }, [query, debouncedSearch]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        closeSpotlight();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : results.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          results[selectedIndex].action();
        }
        break;
      case 'Tab':
        e.preventDefault();
        // Cycle through results
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : 0
        );
        break;
    }
  };

  // Handle result selection
  const handleResultClick = (result: SearchResult) => {
    result.action();
  };

  if (!spotlightVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🔍</span>
            <div className="flex-1">
              <input
                ref={inputRef}
                type="text"
                placeholder="Search apps, commands, shortcuts, and settings..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              />
            </div>
            <button
              onClick={closeSpotlight}
              className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Close spotlight"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Searching...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="p-2">
              {results.map((result, index) => (
                <button
                  key={result.id}
                  type="button"
                  className={`w-full text-left p-4 rounded-lg transition-all duration-200 flex items-center space-x-3 ${
                    index === selectedIndex
                      ? 'bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => handleResultClick(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="text-2xl flex-shrink-0">{result.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {result.title}
                    </div>
                    {result.description && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {result.description}
                      </div>
                    )}
                    {result.category && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {result.category}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      result.type === 'app' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      result.type === 'command' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      result.type === 'file' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {result.type}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : query.trim() ? (
            <div className="p-8 text-center">
              <span className="text-4xl mb-4 block">🔍</span>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                No results found for "{query}"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {quickAccess.length > 0 ? (
                  quickAccess.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="w-full text-left p-3 rounded-lg transition-all duration-200 flex items-center space-x-3 hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => item.action()}
                    >
                      <span className="text-xl flex-shrink-0">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {item.title}
                        </div>
                        {item.description && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-4">
                    <span className="text-2xl mb-2 block">🚀</span>
                    <p className="text-gray-500 dark:text-gray-400">
                      Start typing to search apps, commands, and more
                    </p>
                  </div>
                )}
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
              {results.length > 0 && (
                <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

Spotlight.displayName = 'Spotlight';
