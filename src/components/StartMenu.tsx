import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIState } from '../store/uiState';

export const StartMenu: React.FC = () => {
  const { openWindow } = useUIState();
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredApp, setHoveredApp] = useState<string | null>(null);

  const apps = [
    { name: 'Notepad', icon: '📝', color: 'bg-blue-500', category: 'Productivity' },
    { name: 'Calculator', icon: '🧮', color: 'bg-green-500', category: 'Utilities' },
    { name: 'Files', icon: '📁', color: 'bg-yellow-500', category: 'System' },
    { name: 'Settings', icon: '⚙️', color: 'bg-gray-500', category: 'System' },
    { name: 'Terminal', icon: '💻', color: 'bg-purple-500', category: 'Development' },
    { name: 'Browser', icon: '🌐', color: 'bg-indigo-500', category: 'Internet' },
    { name: 'Mail', icon: '📧', color: 'bg-red-500', category: 'Communication' },
    { name: 'Music', icon: '🎵', color: 'bg-pink-500', category: 'Media' },
    { name: 'Photos', icon: '📸', color: 'bg-orange-500', category: 'Media' },
    { name: 'Calendar', icon: '📅', color: 'bg-teal-500', category: 'Productivity' },
    { name: 'Maps', icon: '🗺️', color: 'bg-cyan-500', category: 'Utilities' },
    { name: 'Weather', icon: '🌤️', color: 'bg-sky-500', category: 'Utilities' },
  ];

  const categories = [...new Set(apps.map(app => app.category))];

  const handleAppClick = (appName: string) => {
    openWindow(appName);
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => setIsVisible(false)}
        >
          <motion.div
            className="absolute bottom-20 left-1/2 -translate-x-1/2 w-96 max-h-96 glass-elevated rounded-2xl overflow-hidden"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-semibold text-lg">Applications</h2>
                <motion.button
                  className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs transition-all duration-200"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsVisible(false)}
                >
                  ×
                </motion.button>
              </div>
            </div>

            {/* App Grid */}
            <div className="p-4 max-h-80 overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                {apps.map((app, index) => (
                  <motion.div
                    key={app.name}
                    className="relative"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <motion.button
                      className={`
                        w-full aspect-square rounded-xl flex flex-col items-center justify-center space-y-2
                        transition-all duration-300 cursor-pointer group relative overflow-hidden
                        ${hoveredApp === app.name ? 'scale-105' : 'scale-100'}
                      `}
                      style={{
                        background: hoveredApp === app.name 
                          ? 'rgba(255, 255, 255, 0.2)' 
                          : 'rgba(255, 255, 255, 0.1)'
                      }}
                      whileHover={{ 
                        scale: 1.1,
                        transition: { type: "spring", stiffness: 400, damping: 10 }
                      }}
                      whileTap={{ scale: 0.95 }}
                      onHoverStart={() => setHoveredApp(app.name)}
                      onHoverEnd={() => setHoveredApp(null)}
                      onClick={() => handleAppClick(app.name)}
                    >
                      {/* App Icon Background Glow */}
                      <motion.div
                        className={`absolute inset-0 rounded-xl ${app.color} opacity-0 blur-md`}
                        animate={{
                          opacity: hoveredApp === app.name ? 0.3 : 0,
                          scale: hoveredApp === app.name ? 1.2 : 1,
                        }}
                        transition={{ duration: 0.3 }}
                      />
                      
                      {/* App Icon */}
                      <motion.span
                        className="relative z-10 text-3xl"
                        animate={{
                          y: hoveredApp === app.name ? -2 : 0,
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        {app.icon}
                      </motion.span>

                      {/* App Name */}
                      <motion.span
                        className="relative z-10 text-white text-xs font-medium text-center"
                        animate={{
                          opacity: hoveredApp === app.name ? 1 : 0.8,
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        {app.name}
                      </motion.span>
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
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-white/10 bg-white/5">
              <div className="flex items-center justify-between text-white/60 text-xs">
                <span>Click to launch applications</span>
                <span>{apps.length} apps available</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 