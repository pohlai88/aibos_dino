import { memo, useState, useEffect } from 'react';
import { useUIState } from '../store/uiState.ts';

interface DockItem {
  name: string;
  icon: string;
  component: string;
  description: string;
  isRunning?: boolean;
}

const dockItems: DockItem[] = [
  { 
    name: 'Notepad', 
    icon: '📝', 
    component: 'notepad',
    description: 'Take notes and edit text files'
  },
  { 
    name: 'Program Files', 
    icon: '📁', 
    component: 'files',
    description: 'Browse and manage installed programs'
  },
  { 
    name: 'Calculator', 
    icon: '🧮', 
    component: 'calculator',
    description: 'Perform calculations and conversions'
  },
  { 
    name: 'Clock', 
    icon: '🕐', 
    component: 'clock',
    description: 'Check time, weather, and timers'
  },
  { 
    name: 'Themes', 
    icon: '🎨', 
    component: 'themes',
    description: 'Customize your desktop appearance'
  },
];

export const Dock = memo(() => {
  const { openWindow, openWindows, bringWindowToFront } = useUIState();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: DockItem } | null>(null);

  // Auto-hide dock after inactivity
  useEffect(() => {
    const handleActivity = () => {
      setLastActivity(Date.now());
      setIsVisible(true);
    };

    const checkInactivity = () => {
      const now = Date.now();
      const inactiveTime = now - lastActivity;
      if (inactiveTime > 3000) { // Hide after 3 seconds of inactivity
        setIsVisible(false);
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, handleActivity));
    
    const interval = setInterval(checkInactivity, 1000);
    
    return () => {
      events.forEach(event => document.removeEventListener(event, handleActivity));
      clearInterval(interval);
    };
  }, [lastActivity]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Check if apps are running
  const getRunningApps = () => {
    return openWindows.map(win => win.component);
  };

  const runningApps = getRunningApps();

  const handleItemClick = (item: DockItem) => {
    setLastActivity(Date.now());
    setIsVisible(true);
    
    // Check if app is already running
    const isRunning = runningApps.includes(item.component);
    
    if (isRunning) {
      // Bring existing window to front
      bringWindowToFront(item.component);
    } else {
      // Launch new instance
      openWindow(item.component);
    }
  };

  const handleContextMenu = (event: React.MouseEvent, item: DockItem) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, item });
  };

  const handleContextMenuAction = (action: string, item: DockItem) => {
    setContextMenu(null);
    
    switch (action) {
      case 'open':
        handleItemClick(item);
        break;
      case 'close':
        // TODO: Implement close all windows of this app
        console.log('Close all windows of:', item.name);
        break;
      case 'info':
        // TODO: Show app info dialog
        console.log('Show info for:', item.name);
        break;
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, item: DockItem) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleItemClick(item);
    }
  };

  // Remove the global keyboard shortcuts since they're now handled by shortcutManager
  // useEffect(() => {
  //   const handleGlobalKeyDown = (event: KeyboardEvent) => {
  //     // Only trigger if not typing in an input field
  //     if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
  //       return;
  //     }

  //     const shortcuts: Record<string, string> = {
  //       'n': 'notepad',
  //       'f': 'files', 
  //       'c': 'calculator',
  //       't': 'clock',
  //       'h': 'themes'
  //     };

  //     const component = shortcuts[event.key.toLowerCase()];
  //     if (component && !event.ctrlKey && !event.altKey && !event.metaKey) {
  //       event.preventDefault();
  //       const item = dockItems.find(dockItem => dockItem.component === component);
  //       if (item) {
  //         handleItemClick(item);
  //       }
  //     }
  //   };

  //   document.addEventListener('keydown', handleGlobalKeyDown);
  //   return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  // }, [runningApps]);

  return (
    <div 
      className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-30 transition-all duration-500 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setLastActivity(Date.now())}
    >
      {/* Dock background with enhanced glass effect */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl px-6 py-3 shadow-2xl border border-white/20 dark:border-gray-700/50">
        <div className="flex space-x-2">
          {dockItems.map((item) => {
            const isRunning = runningApps.includes(item.component);
            const isHovered = hoveredItem === item.name;
            
            return (
              <div key={item.name} className="relative">
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap z-50">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs opacity-75">{item.description}</div>
                    {isRunning && (
                      <div className="text-xs text-green-400 mt-1">● Running</div>
                    )}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                )}
                
                {/* Dock item button */}
                <button
                  type="button"
                  className={`relative w-14 h-14 flex items-center justify-center text-2xl rounded-xl transition-all duration-300 group ${
                    isHovered 
                      ? 'scale-125 bg-white/20 dark:bg-gray-700/20 shadow-lg' 
                      : 'hover:scale-110 hover:bg-white/10 dark:hover:bg-gray-700/10'
                  } ${isRunning ? 'ring-2 ring-blue-500/50' : ''}`}
                  onClick={() => handleItemClick(item)}
                  onContextMenu={(event) => handleContextMenu(event, item)}
                  onMouseEnter={() => setHoveredItem(item.name)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onKeyDown={(event) => handleKeyDown(event, item)}
                  tabIndex={0}
                  title={item.name}
                >
                  {/* Icon with enhanced styling */}
                  <span className={`transition-all duration-300 ${
                    isHovered ? 'scale-110' : 'scale-100'
                  }`}>
                    {item.icon}
                  </span>
                  
                  {/* Running indicator */}
                  {isRunning && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></div>
                  )}
                  
                  {/* Hover glow effect */}
                  {isHovered && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl blur-sm"></div>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Dock separator line */}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mt-2"></div>
      
      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 py-1 min-w-48"
          style={{ 
            left: contextMenu.x, 
            top: contextMenu.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <button
            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
            onClick={() => handleContextMenuAction('open', contextMenu.item)}
          >
            <span>🚀</span>
            <span>Open {contextMenu.item.name}</span>
          </button>
          
          {runningApps.includes(contextMenu.item.component) && (
            <button
              className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
              onClick={() => handleContextMenuAction('close', contextMenu.item)}
            >
              <span>❌</span>
              <span>Close {contextMenu.item.name}</span>
            </button>
          )}
          
          <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
          
          <button
            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
            onClick={() => handleContextMenuAction('info', contextMenu.item)}
          >
            <span>ℹ️</span>
            <span>About {contextMenu.item.name}</span>
          </button>
        </div>
      )}
    </div>
  );
});

Dock.displayName = 'Dock';