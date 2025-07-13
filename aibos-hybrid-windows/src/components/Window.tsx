/** @jsxImportSource react */
import { ElementType, FC, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Rnd } from 'react-rnd';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIState } from '../store/uiState.ts';
import { Tooltip } from './Tooltip.tsx';
import { getColor, getGradient } from '../utils/themeHelpers.ts';
import { animation } from '../utils/designTokens.ts';
import { windowSnappingManager, type SnapResult } from '../utils/windowSnapping.ts';
import { audioManager } from '../utils/audio.ts';
import { hapticManager } from '../utils/haptics.ts';
import { useDeviceInfo, getResponsiveWindowConfig } from '../utils/responsive.ts';
import { monitorManager } from '../services/monitorManager.ts';

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
  // Get monitor for this window
  const [monitor, setMonitor] = useState(() => {
    const windowMonitor = monitorManager.getMonitorForWindow(id, true);
    return windowMonitor!; // We know it won't be null with fallback=true
  });
  
  // Update monitor when assignments change
  useEffect(() => {
    if (id) {
      const monitor = monitorManager.getMonitorForWindow(id);
      if (monitor) {
        setMonitor(monitor);
      }
    }
  }, [id]);
  const { colorMode, bringToFront } = useUIState();
  const deviceInfo = useDeviceInfo();
  const { isMobile, isTablet } = deviceInfo;
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [previousSize, setPreviousSize] = useState(initialSize);
  const [previousPosition, setPreviousPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [snapIndicator, setSnapIndicator] = useState<SnapResult['indicator']>();
  const rndRef = useRef<any>(null);

  // Get responsive window configuration
  const windowConfig = useMemo(() => getResponsiveWindowConfig(deviceInfo), [deviceInfo]);

  // Performance: Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => 
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, 
    []
  );

  // Performance: Memoized theme-aware styles
  const windowStyles = useMemo(() => ({
    container: (focused: boolean) => ({
      backgroundColor: focused 
        ? getColor('glass.dark.30', colorMode) 
        : getColor('glass.dark.20', colorMode),
      backdropFilter: `blur(16px)`,
      border: `1px solid ${
        focused
          ? getColor('primary.400', colorMode)
          : getColor('glass.dark.40', colorMode)
      }`,
      boxShadow: focused 
        ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' 
        : '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
      transition: prefersReducedMotion ? 'none' : `all ${animation.duration.normal} ${animation.easing.smooth}`,
    }),
    titleBar: (focused: boolean) => ({
      background: focused 
        ? getGradient('professional.slate', colorMode)
        : getColor('glass.dark.10', colorMode),
      backdropFilter: `blur(8px)`,
      borderBottom: `1px solid ${getColor('glass.dark.20', colorMode)}`,
    }),
    content: {
      backgroundColor: getColor('glass.dark.10', colorMode),
      backdropFilter: `blur(4px)`,
    },
    statusBar: {
      backgroundColor: getColor('glass.dark.20', colorMode),
      backdropFilter: `blur(4px)`,
      borderTop: `1px solid ${getColor('glass.dark.20', colorMode)}`,
    },
    minimized: {
      backgroundColor: getColor('glass.dark.20', colorMode),
      backdropFilter: `blur(12px)`,
      border: `1px solid ${getColor('glass.dark.30', colorMode)}`,
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
    },
    transition: prefersReducedMotion 
      ? { duration: 0 }
      : { type: "spring", stiffness: 300, damping: 30 },
  }), [colorMode, prefersReducedMotion]);

  // Focus window when clicked
  const handleWindowClick = useCallback(() => {
    if (!isFocused) {
      setIsFocused(true);
      bringToFront(id);
      audioManager.playButtonClick();
      hapticManager.playButtonPress();
    }
  }, [isFocused, bringToFront, id]);

  // Handle minimize
  const handleMinimize = useCallback(() => {
    if (isMinimized) {
      setIsMinimized(false);
      audioManager.playMenuOpen();
      hapticManager.playMenuOpen();
    } else {
      setPreviousSize({ 
        width: rndRef.current?.state?.width || initialSize.width, 
        height: rndRef.current?.state?.height || initialSize.height 
      });
      setPreviousPosition({ 
        x: rndRef.current?.state?.x || initialPosition.x, 
        y: rndRef.current?.state?.y || initialPosition.y 
      });
      setIsMinimized(true);
      audioManager.playMenuClose();
      hapticManager.playMenuClose();
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
      audioManager.playWindowClose();
      hapticManager.playButtonRelease();
    } else {
      // Save current size and position, then maximize
      setPreviousSize({ 
        width: rndRef.current?.state?.width || initialSize.width, 
        height: rndRef.current?.state?.height || initialSize.height 
      });
      setPreviousPosition({ 
        x: rndRef.current?.state?.x || initialPosition.x, 
        y: rndRef.current?.state?.y || initialPosition.y 
      });
      setIsMaximized(true);
      if (rndRef.current) {
        // Maximize to monitor bounds instead of window bounds
        const maxWidth = monitor.bounds.width - 40;
        const maxHeight = monitor.bounds.height - 120;
        const maxX = monitor.bounds.x + 20;
        const maxY = monitor.bounds.y + 60;
        
        rndRef.current.updateSize({ width: maxWidth, height: maxHeight });
        rndRef.current.updatePosition({ x: maxX, y: maxY });
      }
      audioManager.playWindowOpen();
      hapticManager.playButtonPress();
    }
  }, [isMaximized, previousSize, previousPosition, initialSize, initialPosition, monitor]);

  // Handle close
  const handleClose = useCallback(() => {
    if (onClose) {
      audioManager.playWindowClose();
      hapticManager.playButtonRelease();
      onClose(id);
    }
  }, [onClose, id]);

  // Handle double click on title bar to maximize/restore
  const handleTitleBarDoubleClick = useCallback(() => {
    if (maximizable) {
      handleMaximize();
    }
  }, [maximizable, handleMaximize]);

  // Handle drag start
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    audioManager.playDragStart();
    hapticManager.playDragStart();
  }, []);

  // Handle drag stop
  const handleDragStop = useCallback((_e: any, d: any) => {
    setIsDragging(false);
    setSnapIndicator(undefined);
    
    // Calculate snap result
    const snapResult = windowSnappingManager.calculateSnap({
      x: d.x,
      y: d.y,
      width: rndRef.current?.state?.width || initialSize.width,
      height: rndRef.current?.state?.height || initialSize.height
    }, false);

    // Apply snap if needed
    if (snapResult.snapped) {
      if (rndRef.current) {
        rndRef.current.updatePosition(snapResult.position);
        if (snapResult.size.width !== (rndRef.current?.state?.width || initialSize.width) ||
            snapResult.size.height !== (rndRef.current?.state?.height || initialSize.height)) {
          rndRef.current.updateSize(snapResult.size);
        }
      }
      audioManager.playWindowSnap();
      hapticManager.playWindowSnap();
    } else {
      audioManager.playDragEnd();
      hapticManager.playDragEnd();
    }
  }, [initialSize]);

  // Handle drag
  const handleDrag = useCallback((_e: any, d: any) => {
    if (!isDragging) return;

    // Calculate snap result for indicator
    const snapResult = windowSnappingManager.calculateSnap({
      x: d.x,
      y: d.y,
      width: rndRef.current?.state?.width || initialSize.width,
      height: rndRef.current?.state?.height || initialSize.height
    }, true);

    setSnapIndicator(snapResult.indicator);
  }, [isDragging, initialSize]);

  // Handle resize
  const handleResize = useCallback((_e: any, _direction: any, _ref: any, _delta: any, _position: any) => {
    audioManager.playResize();
    hapticManager.playResize();
  }, []);

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
  const WindowControls = useCallback(() => (
    <div className="flex items-center space-x-1" role="toolbar" aria-label="Window controls">
      {minimizable && (
        <Tooltip content="Minimize" shortcut="Ctrl+M" position="bottom">
          <button
            type="button"
            className="relative w-3 h-3 bg-yellow-400 hover:bg-yellow-300 rounded-full transition-all duration-150 hover:w-5 hover:h-5 flex items-center justify-center group"
            aria-label="Minimize window"
            aria-pressed={isMinimized}
            onClick={handleMinimize}
          >
            <span className="absolute inset-0 flex items-center justify-center text-[0.5rem] font-bold text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              −
            </span>
          </button>
        </Tooltip>
      )}
      
      {maximizable && (
        <Tooltip content={isMaximized ? "Restore" : "Maximize"} shortcut="Ctrl+F" position="bottom">
          <button
            type="button"
            className="relative w-3 h-3 bg-green-500 hover:bg-green-400 rounded-full transition-all duration-150 hover:w-5 hover:h-5 flex items-center justify-center group"
            aria-label={isMaximized ? "Restore window" : "Maximize window"}
            aria-pressed={isMaximized}
            onClick={handleMaximize}
          >
            <span className="absolute inset-0 flex items-center justify-center text-[0.5rem] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              {isMaximized ? '⤢' : '+'}
            </span>
          </button>
        </Tooltip>
      )}
      
      {closable && (
        <Tooltip content="Close" shortcut="Ctrl+W" position="bottom">
          <button
            type="button"
            className="relative w-3 h-3 bg-red-500 hover:bg-red-400 rounded-full transition-all duration-150 hover:w-5 hover:h-5 flex items-center justify-center group"
            aria-label="Close window"
            onClick={handleClose}
          >
            <span className="absolute inset-0 flex items-center justify-center text-[0.5rem] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              ×
            </span>
          </button>
        </Tooltip>
      )}
    </div>
  ), [minimizable, maximizable, closable, isMinimized, isMaximized, handleMinimize, handleMaximize, handleClose]);

  if (isMinimized) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={windowStyles.transition}
        className={`fixed z-50 ${
          isMobile 
            ? 'bottom-2 left-2' 
            : 'bottom-4 left-4'
        }`}
        role="button"
        aria-label={`Restore ${title} window`}
      >
        <Tooltip content={`Restore ${title}`} position="top">
          <button
            type="button"
            onClick={handleMinimize}
            style={windowStyles.minimized}
            className={`rounded-lg flex items-center space-x-2 hover:bg-opacity-80 transition-all duration-200 ${
              isMobile 
                ? 'px-2 py-1' 
                : 'px-3 py-2'
            }`}
          >
            <span className={`${isMobile ? 'text-xs' : 'text-sm'}`} aria-hidden="true">{icon}</span>
            <span className={`text-gray-200 font-medium truncate ${
              isMobile 
                ? 'text-xs max-w-16' 
                : 'text-xs max-w-24'
            }`}>{title}</span>
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
        minWidth={windowConfig.minWidth}
        minHeight={windowConfig.minHeight}
        maxWidth={isMaximized ? windowConfig.maxWidth : windowConfig.maxWidth}
        maxHeight={isMaximized ? windowConfig.maxHeight : windowConfig.maxHeight}
        dragHandleClassName="window-title-bar"
        disableDragging={isMaximized || !windowConfig.draggable}
        enableResizing={windowConfig.resizable && !isMaximized}
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
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragStop={handleDragStop}
        onResize={handleResize}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`window-title-${id}`}
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
          transition={windowStyles.transition}
          style={windowStyles.container(isFocused)}
          className={`
            h-full flex flex-col
            ${isMaximized ? 'rounded-none' : 'rounded-xl'}
            ${isMobile ? 'mobile-window' : ''}
            ${isTablet ? 'tablet-window' : ''}
          `}
        >
          {/* Title Bar */}
          <div 
            style={windowStyles.titleBar(isFocused)}
            className={`
              window-title-bar flex items-center justify-between cursor-move
              transition-all duration-200
              ${isMaximized ? 'rounded-none' : 'rounded-t-xl'}
              ${isMobile 
                ? 'px-3 py-2' 
                : isTablet 
                  ? 'px-4 py-2' 
                  : 'px-4 py-3'
              }
            `}
            onDoubleClick={handleTitleBarDoubleClick}
            role="banner"
            aria-label="Window title bar"
          >
            {/* Left side - Controls */}
            <div className="flex items-center space-x-3">
              <WindowControls />
              <div 
                className="w-px h-4"
                style={{ backgroundColor: getColor('gray.600', colorMode) }}
                aria-hidden="true"
              />
            </div>

            {/* Center - Title */}
            <div className="flex items-center space-x-2 flex-1 justify-center">
              <span className={`${isMobile ? 'text-xs' : 'text-sm'}`} aria-hidden="true">{icon}</span>
              <span 
                id={`window-title-${id}`}
                className={`text-gray-200 font-medium truncate ${
                  isMobile 
                    ? 'text-xs max-w-24' 
                    : isTablet 
                      ? 'text-sm max-w-36' 
                      : 'text-sm max-w-48'
                }`}
              >
                {title}
              </span>
              {isMaximized && !isMobile && (
                <span 
                  className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded"
                  aria-label="Window is maximized"
                >
                  MAXIMIZED
                </span>
              )}
            </div>

            {/* Right side - Spacer for balance */}
            <div className={`${isMobile ? 'w-12' : isTablet ? 'w-16' : 'w-20'}`} aria-hidden="true"></div>
          </div>

          {/* Content Area */}
          <div 
            style={windowStyles.content}
            className="flex-1 overflow-auto"
            role="main"
            aria-label={`${title} content area`}
          >
            <div className={`text-gray-200 h-full ${
              isMobile 
                ? 'p-2' 
                : isTablet 
                  ? 'p-3' 
                  : 'p-4'
            }`}>
              <Component {...props} />
            </div>
          </div>

          {/* Status Bar - hide on mobile */}
          {!isMobile && (
            <div 
              style={windowStyles.statusBar}
              className={`text-xs text-gray-400 flex items-center justify-between ${
                isTablet ? 'px-3 py-1' : 'px-4 py-2'
              }`}
              role="status"
              aria-label="Window status"
            >
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
          )}
        </motion.div>
      </Rnd>

      {/* Snap Indicator Overlay - hide on mobile */}
      {snapIndicator && !isMobile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: snapIndicator.opacity }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            left: snapIndicator.x,
            top: snapIndicator.y,
            width: snapIndicator.width,
            height: snapIndicator.height,
            backgroundColor: getColor('primary.400', colorMode),
            border: `2px solid ${getColor('primary.300', colorMode)}`,
            borderRadius: '8px',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
          className="snap-indicator"
          aria-hidden="true"
        />
      )}
    </AnimatePresence>
  );
};
