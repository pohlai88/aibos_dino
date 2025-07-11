import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useUIState } from '../store/uiState';

interface WindowProps {
  id: string;
  component: string;
  props?: Record<string, any>;
  zIndex: number;
}

export const Window: React.FC<WindowProps> = ({ id, component, props, zIndex }) => {
  const { closeWindow } = useUIState();
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const handleClose = () => {
    closeWindow(id);
  };

  const handleMinimize = () => {
    // TODO: Implement minimize functionality
    console.log('Minimize window:', id);
  };

  const handleMaximize = () => {
    // TODO: Implement maximize functionality
    console.log('Maximize window:', id);
  };

  return (
    <motion.div
      className="absolute top-24 left-24 w-96 h-64 glass-window rounded-xl pointer-events-auto"
      style={{ zIndex }}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -20 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30
      }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {/* Window Title Bar */}
      <motion.div 
        className="flex items-center justify-between px-4 py-3 rounded-t-xl cursor-move border-b border-white/10"
        style={{ background: 'rgba(255, 255, 255, 0.1)' }}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
      >
        {/* Window Controls */}
        <div className="flex items-center space-x-2">
          <motion.button
            className="w-3 h-3 bg-red-400 rounded-full hover:bg-red-500 transition-colors duration-200"
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.8 }}
            onClick={handleClose}
            title="Close"
          />
          <motion.button
            className="w-3 h-3 bg-yellow-400 rounded-full hover:bg-yellow-500 transition-colors duration-200"
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.8 }}
            onClick={handleMinimize}
            title="Minimize"
          />
          <motion.button
            className="w-3 h-3 bg-green-400 rounded-full hover:bg-green-500 transition-colors duration-200"
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.8 }}
            onClick={handleMaximize}
            title="Maximize"
          />
        </div>

        {/* Window Title */}
        <motion.div 
          className="text-sm text-white font-medium flex items-center space-x-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <span className="text-lg">
            {component === 'Notepad' && '📝'}
            {component === 'Calculator' && '🧮'}
            {component === 'Files' && '📁'}
            {component === 'Settings' && '⚙️'}
            {component === 'Terminal' && '💻'}
          </span>
          <span>{component}</span>
        </motion.div>

        {/* Window Actions */}
        <div className="flex items-center space-x-2">
          <motion.button
            className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs transition-all duration-200"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="More options"
          >
            ⋯
          </motion.button>
        </div>
      </motion.div>

      {/* Window Content */}
      <motion.div 
        className="p-4 h-full overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {/* App-specific content */}
        <div className="h-full flex flex-col">
          {component === 'Notepad' && (
            <div className="flex-1">
              <textarea 
                className="w-full h-full bg-transparent text-white placeholder-white/50 resize-none outline-none"
                placeholder="Start typing..."
                defaultValue="Welcome to AI-BOS Notepad! ✨"
              />
            </div>
          )}
          
          {component === 'Calculator' && (
            <div className="flex-1 flex flex-col space-y-2">
              <div className="bg-white/10 rounded-lg p-3 text-right text-white text-2xl font-mono">
                0
              </div>
              <div className="grid grid-cols-4 gap-2">
                {['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', '0', '.', '=', '+'].map((btn) => (
                  <motion.button
                    key={btn}
                    className="w-12 h-12 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-all duration-200"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {btn}
                  </motion.button>
                ))}
              </div>
            </div>
          )}
          
          {component === 'Files' && (
            <div className="flex-1">
              <div className="text-white text-sm space-y-2">
                <div className="flex items-center space-x-2 p-2 hover:bg-white/10 rounded-lg cursor-pointer">
                  <span>📁</span>
                  <span>Documents</span>
                </div>
                <div className="flex items-center space-x-2 p-2 hover:bg-white/10 rounded-lg cursor-pointer">
                  <span>📁</span>
                  <span>Downloads</span>
                </div>
                <div className="flex items-center space-x-2 p-2 hover:bg-white/10 rounded-lg cursor-pointer">
                  <span>📁</span>
                  <span>Pictures</span>
                </div>
                <div className="flex items-center space-x-2 p-2 hover:bg-white/10 rounded-lg cursor-pointer">
                  <span>📁</span>
                  <span>Music</span>
                </div>
              </div>
            </div>
          )}
          
          {component === 'Settings' && (
            <div className="flex-1 text-white text-sm space-y-3">
              <div className="flex items-center justify-between p-2 hover:bg-white/10 rounded-lg">
                <span>Dark Mode</span>
                <div className="w-10 h-6 bg-white/20 rounded-full relative">
                  <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1"></div>
                </div>
              </div>
              <div className="flex items-center justify-between p-2 hover:bg-white/10 rounded-lg">
                <span>Notifications</span>
                <div className="w-10 h-6 bg-blue-500 rounded-full relative">
                  <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
                </div>
              </div>
              <div className="flex items-center justify-between p-2 hover:bg-white/10 rounded-lg">
                <span>Auto-update</span>
                <div className="w-10 h-6 bg-white/20 rounded-full relative">
                  <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1"></div>
                </div>
              </div>
            </div>
          )}
          
          {component === 'Terminal' && (
            <div className="flex-1 bg-black/50 rounded-lg p-3 font-mono text-green-400 text-sm">
              <div className="space-y-1">
                <div>AI-BOS Terminal v1.0.0</div>
                <div>Type 'help' for available commands</div>
                <div className="flex items-center">
                  <span className="text-green-400">$</span>
                  <span className="ml-2 text-white">_</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Resize Handle */}
      <div 
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        onMouseDown={() => setIsResizing(true)}
        onMouseUp={() => setIsResizing(false)}
      >
        <div className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-white/30"></div>
      </div>
    </motion.div>
  );
}; 