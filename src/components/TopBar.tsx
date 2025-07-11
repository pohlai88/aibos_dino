import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIState } from '../store/uiState';

export const TopBar: React.FC = () => {
  const { setSpotlightVisible } = useUIState();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const menuItems = [
    { name: 'File', items: ['New Window', 'Open...', 'Save', 'Print', 'Exit'] },
    { name: 'Edit', items: ['Undo', 'Redo', 'Cut', 'Copy', 'Paste', 'Select All'] },
    { name: 'View', items: ['Zoom In', 'Zoom Out', 'Full Screen', 'Show Dock', 'Hide Dock'] },
    { name: 'Window', items: ['Minimize', 'Zoom', 'Bring All to Front', 'Arrange'] },
    { name: 'Help', items: ['AI-BOS Help', 'About AI-BOS'] }
  ];

  const handleSpotlightToggle = () => {
    setSpotlightVisible(true);
  };

  return (
    <motion.div
      className="fixed top-0 left-0 w-full h-12 glass-backdrop flex items-center px-6 z-50"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      {/* Apple Logo / Start Button */}
      <motion.button
        className="flex items-center space-x-2 text-white font-semibold text-lg mr-8"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-2xl">🦕</span>
        <span>AI-BOS</span>
      </motion.button>

      {/* Menu Bar */}
      <div className="flex items-center space-x-6">
        {menuItems.map((menu) => (
          <div key={menu.name} className="relative">
            <motion.button
              className="text-white text-sm font-medium px-3 py-1 rounded-md transition-all duration-200"
              whileHover={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                scale: 1.02
              }}
              onHoverStart={() => setHoveredMenu(menu.name)}
              onHoverEnd={() => setHoveredMenu(null)}
            >
              {menu.name}
            </motion.button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {hoveredMenu === menu.name && (
                <motion.div
                  className="absolute top-full left-0 mt-1 glass-elevated rounded-lg py-2 min-w-48"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  {menu.items.map((item, index) => (
                    <motion.button
                      key={item}
                      className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors duration-150"
                      whileHover={{ x: 4 }}
                      transition={{ duration: 0.1 }}
                    >
                      {item}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right Side Controls */}
      <div className="flex items-center space-x-4">
        {/* Spotlight Button */}
        <motion.button
          className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-200"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleSpotlightToggle}
          title="Spotlight Search (⌘+Space)"
        >
          🔍
        </motion.button>

        {/* Notifications */}
        <motion.button
          className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-200"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          🔔
        </motion.button>

        {/* Clock */}
        <motion.div
          className="text-white text-sm font-medium px-3 py-1 rounded-lg bg-white/10"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        >
          {currentTime.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          })}
        </motion.div>

        {/* User Avatar */}
        <motion.div
          className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm cursor-pointer"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title="User Profile"
        >
          U
        </motion.div>
      </div>
    </motion.div>
  );
}; 