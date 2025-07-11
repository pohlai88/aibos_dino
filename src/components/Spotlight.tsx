import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIState } from '../store/uiState';

export const Spotlight: React.FC = () => {
  const { setSpotlightVisible, openWindow } = useUIState();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const searchResults = [
    { name: 'Notepad', icon: '📝', type: 'App', action: () => openWindow('Notepad') },
    { name: 'Calculator', icon: '🧮', type: 'App', action: () => openWindow('Calculator') },
    { name: 'Files', icon: '📁', type: 'App', action: () => openWindow('Files') },
    { name: 'Settings', icon: '⚙️', type: 'App', action: () => openWindow('Settings') },
    { name: 'Terminal', icon: '💻', type: 'App', action: () => openWindow('Terminal') },
    { name: 'Documents', icon: '📄', type: 'Folder', action: () => console.log('Open Documents') },
    { name: 'Downloads', icon: '⬇️', type: 'Folder', action: () => console.log('Open Downloads') },
    { name: 'Pictures', icon: '🖼️', type: 'Folder', action: () => console.log('Open Pictures') },
  ];

  const filteredResults = searchResults.filter(result =>
    result.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSpotlightVisible(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredResults.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredResults.length - 1
        );
      } else if (e.key === 'Enter' && filteredResults[selectedIndex]) {
        e.preventDefault();
        filteredResults[selectedIndex].action();
        setSpotlightVisible(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredResults, selectedIndex, setSpotlightVisible]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={() => setSpotlightVisible(false)}
    >
      <motion.div
        className="w-96 max-h-96 glass-elevated rounded-2xl overflow-hidden"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🔍</span>
            <input
              type="text"
              placeholder="Search apps, files, and more..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder-white/50 outline-none text-lg"
              autoFocus
            />
          </div>
        </div>

        {/* Search Results */}
        <div className="max-h-80 overflow-y-auto">
          <AnimatePresence>
            {filteredResults.length > 0 ? (
              filteredResults.map((result, index) => (
                <motion.div
                  key={result.name}
                  className={`flex items-center space-x-3 p-3 cursor-pointer transition-all duration-150 ${
                    index === selectedIndex ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    result.action();
                    setSpotlightVisible(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="text-2xl">{result.icon}</span>
                  <div className="flex-1">
                    <div className="text-white font-medium">{result.name}</div>
                    <div className="text-white/60 text-sm">{result.type}</div>
                  </div>
                  <div className="text-white/40 text-xs">
                    {index === selectedIndex ? '↵' : ''}
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div
                className="p-8 text-center text-white/60"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="text-4xl mb-2">🔍</div>
                <div>No results found</div>
                <div className="text-sm mt-1">Try a different search term</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 bg-white/5">
          <div className="flex items-center justify-between text-white/60 text-xs">
            <div className="flex items-center space-x-4">
              <span>⌘+Space</span>
              <span>•</span>
              <span>⌘+K</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>↑↓</span>
              <span>to navigate</span>
              <span>•</span>
              <span>↵</span>
              <span>to open</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}; 