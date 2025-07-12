import { ElementType, FC, useState, useCallback, useRef, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIState } from '../store/uiState.ts';
import { Tooltip } from './Tooltip.tsx';

interface WindowProps {
  id: string;
  component: ElementType;
  props?: Record<string, unknown>;
  zIndex?: number;
  onClose?: (id: string) => void;
  title?: string;
  initialSize?: { width: number; height: number };
  initialPosition?: { x: number; y: number };
  resizable?: boolean;
  minimizable?: boolean;
  maximizable?: boolean;
  closable?: boolean;
  icon?: string;
}

export const Window: FC<WindowProps> = function Window({ 
  id, 
  component: Component, 
  props, 
  zIndex, 
  onClose, 
  title = 'App',
  initialSize = { width: 600, height: 400 },
  initialPosition = { x: 100, y: 100 },
  resizable = true,
  minimizable = true,
  maximizable = true,
  closable = true,
  icon = '📱'
}: WindowProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [previousSize, setPreviousSize] = useState(initialSize);
  const [previousPosition, setPreviousPosition] = useState(initialPosition);
  const rndRef = useRef<any>(null);
  const { bringToFront } = useUIState();

  // Focus window when clicked
  const handleWindowClick = useCallback(() => {
    if (!isFocused) {
      setIsFocused(true);
      bringToFront(id);
    }
  }, [isFocused, bringToFront, id]);

  // Handle minimize
  const handleMinimize = useCallback(() => {
    if (isMinimized) {
      setIsMinimized(false);
    } else {
      setPreviousSize({ width: rndRef.current?.state?.width || initialSize.width, height: rndRef.current?.state?.height || initialSize.height });
      setPreviousPosition({ x: rndRef.current?.state?.x || initialPosition.x, y: rndRef.current?.state?.y || initialPosition.y });
      setIsMinimized(true);
    }
  }, [isMinimized, initialSize, initialPosition]);

  // Handle maximize/restore
  const handleMaximize = useCallback(() => {
    if (isMaximized) {
      // Restore to previous size and position
      setIsMaximized(false);
      if (rndRef.current) {
        rndRef.current.updateSize(previousSize);
        rndRef.current.updatePosition(previousPosition);
      }
    } else {
      // Save current size and position, then maximize
      setPreviousSize({ width: rndRef.current?.state?.width || initialSize.width, height: rndRef.current?.state?.height || initialSize.height });
      setPreviousPosition({ x: rndRef.current?.state?.x || initialPosition.x, y: rndRef.current?.state?.y || initialPosition.y });
      setIsMaximized(true);
      if (rndRef.current) {
        rndRef.current.updateSize({ width: window.innerWidth - 40, height: window.innerHeight - 120 });
        rndRef.current.updatePosition({ x: 20, y: 60 });
      }
    }
  }, [isMaximized, previousSize, previousPosition, initialSize, initialPosition]);

  // Handle close
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose(id);
    }
  }, [onClose, id]);

  // Handle double click on title bar to maximize/restore
  const handleTitleBarDoubleClick = useCallback(() => {
    if (maximizable) {
      handleMaximize();
    }
  }, [maximizable, handleMaximize]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFocused) return;
      
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'w':
            e.preventDefault();
            if (closable) handleClose();
            break;
          case 'm':
            e.preventDefault();
            if (minimizable) handleMinimize();
            break;
          case 'f':
            e.preventDefault();
            if (maximizable) handleMaximize();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFocused, closable, minimizable, maximizable, handleClose, handleMinimize, handleMaximize]);

  // Window control buttons
  const WindowControls = () => (
    <div className="flex items-center space-x-1">
      {minimizable && (
        <Tooltip content="Minimize" shortcut="Ctrl+M" position="bottom">
          <button
            type="button"
            className="w-3 h-3 bg-yellow-400 hover:bg-yellow-300 rounded-full transition-colors duration-200 flex items-center justify-center text-xs text-gray-800 font-bold"
            aria-label="Minimize window"
            onClick={handleMinimize}
          >
            −
          </button>
        </Tooltip>
      )}
      
      {maximizable && (
        <Tooltip content={isMaximized ? "Restore" : "Maximize"} shortcut="Ctrl+F" position="bottom">
          <button
            type="button"
            className="w-3 h-3 bg-green-500 hover:bg-green-400 rounded-full transition-colors duration-200 flex items-center justify-center text-xs text-white font-bold"
            aria-label={isMaximized ? "Restore window" : "Maximize window"}
            onClick={handleMaximize}
          >
            {isMaximized ? '⤢' : '⤢'}
          </button>
        </Tooltip>
      )}
      
      {closable && (
        <Tooltip content="Close" shortcut="Ctrl+W" position="bottom">
          <button
            type="button"
            className="w-3 h-3 bg-red-500 hover:bg-red-400 rounded-full transition-colors duration-200 flex items-center justify-center text-xs text-white font-bold"
            aria-label="Close window"
            onClick={handleClose}
          >
            ×
          </button>
        </Tooltip>
      )}
    </div>
  );

  if (isMinimized) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-4 left-4 z-50"
      >
        <Tooltip content={`Restore ${title}`} position="top">
          <button
            type="button"
            onClick={handleMinimize}
            className="bg-gray-800 bg-opacity-90 backdrop-blur-sm border border-gray-700 rounded-lg px-3 py-2 flex items-center space-x-2 hover:bg-gray-700 transition-all duration-200 shadow-lg"
          >
            <span className="text-sm">{icon}</span>
            <span className="text-xs text-gray-200 font-medium truncate max-w-24">{title}</span>
          </button>
        </Tooltip>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <Rnd
        ref={rndRef}
        default={{
          x: initialPosition.x,
          y: initialPosition.y,
          width: initialSize.width,
          height: initialSize.height,
        }}
        bounds="parent"
        style={{ zIndex: isFocused ? (zIndex || 1) + 1000 : zIndex || 1 }}
        minWidth={resizable ? 300 : initialSize.width}
        minHeight={resizable ? 200 : initialSize.height}
        maxWidth={isMaximized ? window.innerWidth - 40 : undefined}
        maxHeight={isMaximized ? window.innerHeight - 120 : undefined}
        dragHandleClassName="window-title-bar"
        disableDragging={isMaximized}
        enableResizing={resizable && !isMaximized}
        resizeHandleStyles={{
          topRight: { cursor: 'ne-resize' },
          bottomRight: { cursor: 'se-resize' },
          bottomLeft: { cursor: 'sw-resize' },
          topLeft: { cursor: 'nw-resize' },
          top: { cursor: 'n-resize' },
          right: { cursor: 'e-resize' },
          bottom: { cursor: 's-resize' },
          left: { cursor: 'w-resize' }
        }}
        onMouseDown={handleWindowClick}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
            boxShadow: isFocused 
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' 
              : '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
          }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 30,
            boxShadow: { duration: 0.2 }
          }}
          className={`
            bg-gray-800 bg-opacity-95 backdrop-blur-md rounded-xl border h-full flex flex-col
            transition-all duration-200
            ${isFocused 
              ? 'border-blue-500 border-opacity-50 shadow-2xl' 
              : 'border-gray-700 border-opacity-50 shadow-lg'
            }
            ${isMaximized ? 'rounded-none' : ''}
          `}
        >
          {/* Title Bar */}
          <div 
            className={`
              window-title-bar flex items-center justify-between px-4 py-3 cursor-move
              transition-all duration-200
              ${isFocused 
                ? 'bg-gradient-to-r from-gray-900 to-gray-800' 
                : 'bg-gray-900 bg-opacity-80'
              }
              ${isMaximized ? 'rounded-none' : 'rounded-t-xl'}
            `}
            onDoubleClick={handleTitleBarDoubleClick}
          >
            {/* Left side - Controls */}
            <div className="flex items-center space-x-3">
              <WindowControls />
              <div className="w-px h-4 bg-gray-600"></div>
            </div>

            {/* Center - Title */}
            <div className="flex items-center space-x-2 flex-1 justify-center">
              <span className="text-sm">{icon}</span>
              <span className="text-sm text-gray-200 font-medium truncate max-w-48">
                {title}
              </span>
              {isMaximized && (
                <span className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">
                  MAXIMIZED
                </span>
              )}
            </div>

            {/* Right side - Spacer for balance */}
            <div className="w-20"></div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto bg-gray-800 bg-opacity-50">
            <div className="p-4 text-gray-200 h-full">
              <Component {...props} />
            </div>
          </div>

          {/* Status Bar */}
          <div className="px-4 py-2 bg-gray-900 bg-opacity-50 border-t border-gray-700 border-opacity-50 text-xs text-gray-400 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span>Ready</span>
              {isFocused && <span>• Focused</span>}
            </div>
            <div className="flex items-center space-x-2">
              {resizable && <span>Resizable</span>}
              {minimizable && <span>Minimizable</span>}
              {maximizable && <span>Maximizable</span>}
            </div>
          </div>
        </motion.div>
      </Rnd>
    </AnimatePresence>
  );
};
