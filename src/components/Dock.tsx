import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIState } from '../store/uiState';

const apps = [
  { name: 'Notepad', icon: '📝', color: 'bg-blue-500' },
  { name: 'Calculator', icon: '🧮', color: 'bg-green-500' },
  { name: 'Files', icon: '📁', color: 'bg-yellow-500' },
  { name: 'Settings', icon: '⚙️', color: 'bg-gray-500' },
  { name: 'Terminal', icon: '💻', color: 'bg-purple-500' },
];

export const Dock: React.FC = () => {
  const { openWindow } = useUIState();
  const [hoveredApp, setHoveredApp] = useState<string | null>(null);

  const handleAppClick = (appName: string) => {
    // Add bounce animation effect
    openWindow(appName);
  };

  return (
    <motion.div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 flex glass-elevated rounded-2xl px-4 py-3 z-40"
      initial={{ opacity: 0, y: 50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        delay: 0.3
      }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center space-x-2">
        {apps.map((app, index) => (
          <motion.div
            key={app.name}
            className="relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + index * 0.1 }}
          >
            {/* App Icon */}
            <motion.button
              className={`
                relative w-12 h-12 rounded-xl flex items-center justify-center text-2xl
                transition-all duration-300 cursor-pointer group
                ${hoveredApp === app.name ? 'scale-110' : 'scale-100'}
              `}
              whileHover={{ 
                scale: 1.2,
                y: -8,
                transition: { type: "spring", stiffness: 400, damping: 10 }
              }}
              whileTap={{ scale: 0.9 }}
              onHoverStart={() => setHoveredApp(app.name)}
              onHoverEnd={() => setHoveredApp(null)}
              onClick={() => handleAppClick(app.name)}
              style={{
                background: hoveredApp === app.name 
                  ? 'rgba(255, 255, 255, 0.2)' 
                  : 'rgba(255, 255, 255, 0.1)'
              }}
            >
              {/* Icon Background Glow */}
              <motion.div
                className={`absolute inset-0 rounded-xl ${app.color} opacity-0 blur-md`}
                animate={{
                  opacity: hoveredApp === app.name ? 0.3 : 0,
                  scale: hoveredApp === app.name ? 1.2 : 1,
                }}
                transition={{ duration: 0.3 }}
              />
              
              {/* Icon */}
              <motion.span
                className="relative z-10"
                animate={{
                  y: hoveredApp === app.name ? -2 : 0,
                }}
                transition={{ duration: 0.2 }}
              >
                {app.icon}
              </motion.span>

              {/* Running Indicator */}
              <motion.div
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"
                animate={{
                  opacity: hoveredApp === app.name ? 1 : 0.6,
                  scale: hoveredApp === app.name ? 1.2 : 1,
                }}
                transition={{ duration: 0.2 }}
              />
            </motion.button>

            {/* Tooltip */}
            <AnimatePresence>
              {hoveredApp === app.name && (
                <motion.div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 
                           glass-surface rounded-lg text-sm font-medium text-white whitespace-nowrap"
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  {app.name}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 
                                border-l-4 border-r-4 border-t-4 border-transparent 
                                border-t-white/20" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Dock Separator */}
      <div className="w-px h-8 bg-white/20 mx-2" />

      {/* System Apps */}
      <motion.div
        className="flex items-center space-x-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <motion.button
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl
                   bg-white/10 hover:bg-white/20 transition-all duration-200 cursor-pointer"
          whileHover={{ scale: 1.1, y: -4 }}
          whileTap={{ scale: 0.9 }}
        >
          🗑️
        </motion.button>
        
        <motion.button
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl
                   bg-white/10 hover:bg-white/20 transition-all duration-200 cursor-pointer"
          whileHover={{ scale: 1.1, y: -4 }}
          whileTap={{ scale: 0.9 }}
        >
          📁
        </motion.button>
      </motion.div>
    </motion.div>
  );
}; 