import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dock } from './Dock';
import { TopBar } from './TopBar';
import { StartMenu } from './StartMenu';
import { Window } from './Window';
import { Spotlight } from './Spotlight';
import { useUIState } from '../store/uiState';

export const Desktop: React.FC = () => {
  const { openWindows, spotlightVisible } = useUIState();

  return (
    <div className="w-screen h-screen relative overflow-hidden">
      {/* Animated Gradient Background */}
      <motion.div 
        className="absolute inset-0 gradient-primary"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      >
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl"
            animate={{
              x: [0, 100, 0],
              y: [0, -50, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"
            animate={{
              x: [0, -80, 0],
              y: [0, 60, 0],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-500/8 rounded-full blur-2xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
      </motion.div>

      {/* Top Bar */}
      <TopBar />

      {/* Dock */}
      <Dock />

      {/* Window Container with Enhanced Z-Index Management */}
      <div className="absolute inset-0 pointer-events-none">
        <AnimatePresence>
          {openWindows.map((win, index) => (
            <motion.div
              key={win.id}
              initial={{ 
                opacity: 0, 
                scale: 0.8, 
                y: 20 
              }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: 0 
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.8, 
                y: -20 
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                delay: index * 0.1
              }}
              style={{ zIndex: win.zIndex }}
            >
              <Window {...win} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Start Menu */}
      <AnimatePresence>
        <StartMenu />
      </AnimatePresence>

      {/* Spotlight */}
      <AnimatePresence>
        {spotlightVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Spotlight />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Icons */}
      <div className="absolute top-20 left-8 space-y-6">
        <motion.div
          className="desktop-icon group cursor-pointer"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="text-5xl mb-2 group-hover:scale-110 transition-transform duration-200">
            📁
          </div>
          <div className="text-sm text-white text-center font-medium drop-shadow-lg">
            File Explorer
          </div>
        </motion.div>

        <motion.div
          className="desktop-icon group cursor-pointer"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div className="text-5xl mb-2 group-hover:scale-110 transition-transform duration-200">
            📝
          </div>
          <div className="text-sm text-white text-center font-medium drop-shadow-lg">
            Notepad
          </div>
        </motion.div>

        <motion.div
          className="desktop-icon group cursor-pointer"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <div className="text-5xl mb-2 group-hover:scale-110 transition-transform duration-200">
            🧮
          </div>
          <div className="text-sm text-white text-center font-medium drop-shadow-lg">
            Calculator
          </div>
        </motion.div>
      </div>
    </div>
  );
}; 