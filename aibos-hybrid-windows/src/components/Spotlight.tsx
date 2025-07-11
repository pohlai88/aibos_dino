import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIState } from '../store/uiState.ts';
import { searchRegistry } from '../services/searchRegistry.ts';
import { SearchResult } from '../types/search.ts';

export const Spotlight: React.FC = () => {
  const { toggleSpotlight } = useUIState();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const searchResults = await searchRegistry.search(searchQuery);
        setResults(searchResults);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 150),
    []
  );

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
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
          executeResult(results[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        toggleSpotlight();
        break;
    }
  };

  const executeResult = async (result: SearchResult) => {
    try {
      await result.action();
      toggleSpotlight();
      setQuery('');
      setResults([]);
    } catch (error) {
      console.error('Failed to execute result:', error);
    }
  };

  const handleResultClick = (result: SearchResult, index: number) => {
    setSelectedIndex(index);
    executeResult(result);
  };

  // Auto-focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      (inputRef.current as any).focus();
    }
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current && selectedIndex >= 0) {
      const selectedElement = (resultsRef.current as any).children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        (selectedElement as any).scrollIntoView({ 
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex]);

  const getResultIcon = (result: SearchResult) => {
    if (result.icon) return result.icon;
    
    switch (result.type) {
      case 'app': return '📱';
      case 'command': return '⚡';
      case 'file': return '📄';
      case 'system': return '⚙️';
      default: return '🔍';
    }
  };

  const getResultCategory = (result: SearchResult) => {
    if (result.category) return result.category;
    
    switch (result.type) {
      case 'app': return 'Application';
      case 'command': return 'Command';
      case 'file': return 'File';
      case 'system': return 'System';
      default: return 'Other';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="spotlight-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[9999]"
        onClick={toggleSpotlight}
      >
        <motion.div
          key="spotlight-panel"
          initial={{ y: -50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -50, opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <span className="text-gray-400 text-xl">🔍</span>
              <input
                ref={inputRef}
                type="text"
                className="flex-1 bg-transparent text-white placeholder-gray-400 text-lg outline-none"
                placeholder="Search apps, commands, files..."
                value={query}
                                 onChange={(e) => setQuery((e.target as any).value)}
                onKeyDown={handleKeyDown}
              />
              {isLoading && (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
              )}
            </div>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto" ref={resultsRef}>
            {results.length > 0 ? (
              <div className="py-2">
                {results.map((result, index) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center p-3 cursor-pointer transition-colors ${
                      index === selectedIndex
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-800 text-gray-200'
                    }`}
                    onClick={() => handleResultClick(result, index)}
                  >
                    <span className="text-2xl mr-3">{getResultIcon(result)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{result.title}</div>
                      {result.description && (
                        <div className={`text-sm truncate ${
                          index === selectedIndex ? 'text-blue-100' : 'text-gray-400'
                        }`}>
                          {result.description}
                        </div>
                      )}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded ${
                      index === selectedIndex 
                        ? 'bg-blue-700 text-blue-100' 
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {getResultCategory(result)}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : query && !isLoading ? (
              <div className="p-8 text-center text-gray-400">
                <div className="text-4xl mb-2">🔍</div>
                <div className="text-lg">No results found</div>
                <div className="text-sm">Try a different search term</div>
              </div>
            ) : !query ? (
              <div className="p-8 text-center text-gray-400">
                <div className="text-4xl mb-2">🚀</div>
                <div className="text-lg">Start typing to search</div>
                <div className="text-sm">Apps, commands, files, and more</div>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-700 bg-gray-800">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center space-x-4">
                <span>↑↓ Navigate</span>
                <span>Enter Select</span>
                <span>Esc Close</span>
              </div>
              <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = (setTimeout as any)(() => func(...args), wait);
  };
}

Spotlight.displayName = 'Spotlight';
