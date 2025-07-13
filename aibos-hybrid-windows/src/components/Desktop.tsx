/** @jsxImportSource react */
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getColor, getGradient, applyThemeWithCSS } from '../utils/themeHelpers.ts';
import { blur, elevation, animation } from '../utils/designTokens.ts';
import { useUIState } from '../store/uiState.ts';
import { useResponsiveConfig } from '../utils/responsive.ts';
import { appRegistry } from '../services/appRegistry.ts';
import { searchRegistry } from '../services/searchRegistry.ts';
import { systemCommands } from '../services/systemCommands.ts';
import { shortcutManager } from '../services/shortcutManager.ts';
import { monitorManager } from '../services/monitorManager.ts';
import { Window } from './Window.tsx';
import { Spotlight } from './Spotlight.tsx';
import { ShortcutHelp } from './ShortcutHelp.tsx';
import { StartMenu } from './StartMenu.tsx';
import { Dock } from './Dock.tsx';
import TopBar from './TopBar.tsx';
import { Notepad } from '../apps/Notepad.tsx';
import { Files } from '../apps/Files.tsx';
import { Calculator } from '../apps/Calculator.tsx';
import iPod from '../apps/iPod.tsx';
import { ThemeSelector } from './ThemeSelector.tsx';
import MultiMonitorLayout from './MultiMonitorLayout.tsx';
import { WindowGroupManager } from './WindowGroupManager.tsx';
import { GridLayoutManager } from './GridLayoutManager.tsx';
import { NotificationCenter } from './NotificationCenter.tsx';
import { advancedCommandManager } from '../services/advancedCommands.ts';
import { notificationManager } from '../services/notificationManager.ts';
import type { AppInfo } from '../services/appRegistry.ts';

// Type definitions for window objects
interface OpenWindow {
  id: string;
  component: string;
  props?: Record<string, unknown>;
  zIndex: number;
}

// Initialize apps
const initializeApps = () => {
  const apps: Omit<AppInfo, 'status' | 'metadata'>[] = [
    {
      id: 'notepad',
      title: 'Notepad',
      icon: '📝',
      description: 'Take notes and edit text files',
      category: 'productivity',
      permissions: ['file-system'],
      component: Notepad,
    },
    {
      id: 'files',
      title: 'Program Files',
      icon: '📁',
      description: 'Browse and manage installed programs',
      category: 'system',
      permissions: ['file-system'],
      component: Files,
    },
    {
      id: 'calculator',
      title: 'Calculator',
      icon: '🧮',
      description: 'Perform calculations and conversions',
      category: 'utilities',
      permissions: [],
      component: Calculator,
    },
    {
      id: 'ipod',
      title: 'iPod',
      icon: '🎵',
      description: 'Music player with playlist support',
      category: 'entertainment',
      permissions: ['storage'],
      component: iPod,
    },
  ];

  apps.forEach(app => {
    appRegistry.register({
      ...app,
      status: 'inactive',
      metadata: {
        version: '1.0.0',
        author: 'AIBOS Team',
        tags: [],
        lastUpdated: new Date(),
        installDate: new Date(),
        usageCount: 0
      },
      permissions: [...app.permissions]
    });
  });

  appRegistry.register({
    id: 'themes',
    title: 'Theme Selector',
    icon: '🎨',
    description: 'Choose from beautiful themes',
    category: 'utilities',
    permissions: [],
    component: ThemeSelector,
    status: 'inactive',
    metadata: {
      version: '1.0.0',
      author: 'AIBOS Team',
      tags: [],
      lastUpdated: new Date(),
      installDate: new Date(),
      usageCount: 0
    }
  });
};

// Initialize search providers
const initializeSearchProviders = () => {
  searchRegistry.register(appRegistry.createSearchProvider());
  searchRegistry.register(systemCommands.createSearchProvider());
};

// Start button component
const StartButton: React.FC = memo(() => {
  const { toggleStartMenu, colorMode } = useUIState();

  return (
    <button
      type="button"
      onClick={toggleStartMenu}
      style={{
        background: `linear-gradient(135deg, ${getColor('glass.dark.40', colorMode)}, ${getColor('glass.dark.30', colorMode)})`,
        backdropFilter: 'blur(8px)',
        border: `1px solid ${getColor('glass.dark.50', colorMode)}`,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }}
      className="fixed bottom-4 left-4 z-50 text-white px-4 py-2 rounded-lg hover:scale-105 transition-all duration-200"
      aria-label="Open start menu"
    >
      Start
    </button>
  );
});

// Windows container component
const WindowsContainer: React.FC = memo(() => {
  const { openWindows, closeWindow, windowGroups, activeGroupId } = useUIState();

  // Separate grouped and ungrouped windows
  const groupedWindows = openWindows.filter((win: any) => win.groupId);
  const ungroupedWindows = openWindows.filter((win: any) => !win.groupId);

  return (
    <div className="absolute inset-0">
      {/* Render ungrouped windows normally */}
      {ungroupedWindows.map((win: OpenWindow) => {
        const appInfo = appRegistry.get(win.component);
        if (!appInfo) return null;

        const Comp = appInfo.component;
        
        return (
          <Window
            key={win.id}
            id={win.id}
            title={appInfo.title}
            component={Comp}
            props={win.props}
            zIndex={win.zIndex}
            onClose={() => closeWindow(win.id)}
          />
        );
      })}

      {/* Render grouped windows as tabbed windows */}
      {Object.values(windowGroups).map((group: any) => {
        const groupWindows = openWindows.filter((win: any) => group.windowIds.includes(win.id));
        if (groupWindows.length === 0) return null;

        // For now, render the first window in the group as a placeholder
        // In a full implementation, this would be replaced with TabbedWindow component
        const firstWindow = groupWindows[0];
        const appInfo = appRegistry.get(firstWindow.component);
        if (!appInfo) return null;

        const Comp = appInfo.component;
        
        return (
          <Window
            key={`group-${group.id}`}
            id={`group-${group.id}`}
            title={`${group.name} (${groupWindows.length})`}
            component={Comp}
            props={firstWindow.props ?? {}}
            zIndex={firstWindow.zIndex}
            onClose={() => {
              // Close all windows in the group
              groupWindows.forEach((win: any) => closeWindow(win.id));
            }}
          />
        );
      })}
    </div>
  );
});

// Enhanced background system component
const BackgroundSystem: React.FC = memo(() => {
  const { theme, colorMode } = useUIState();

  // Memoize gradient based on theme and color mode
  const gradient = React.useMemo(() => {
    switch (theme) {
      case 'nebula':
        return getGradient('cosmic.nebula', colorMode);
      case 'ocean':
        return getGradient('nature.ocean', colorMode);
      case 'forest':
        return getGradient('nature.forest', colorMode);
      case 'sunset':
        return getGradient('nature.sunset', colorMode);
      case 'aurora':
        return getGradient('nature.aurora', colorMode);
      case 'cosmic':
        return getGradient('cosmic.cosmic', colorMode);
      default:
        return getGradient('professional.slate', colorMode);
    }
  }, [theme, colorMode]);

  // Memoize floating particles to prevent recreation on every render
  const floatingParticles = React.useMemo(() => 
    [...Array(20)].map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${3 + Math.random() * 4}s`,
    })), []
  );

  return (
    <div 
      className="absolute inset-0 transition-all duration-1000"
      style={{ backgroundImage: gradient }}
    >
      {/* Glass blobs with theme-aware colors */}
      <div 
        style={{
          background: `radial-gradient(circle, ${getColor('glass.light.20', colorMode)}, transparent)`,
          backdropFilter: 'blur(40px)',
        }}
        className="absolute w-96 h-96 rounded-full blur-3xl top-1/3 left-1/4 animate-pulse" 
      />
      <div 
        style={{
          background: `radial-gradient(circle, ${getColor('glass.light.20', colorMode)}, transparent)`,
          backdropFilter: 'blur(30px)',
        }}
        className="absolute w-64 h-64 rounded-full blur-2xl bottom-1/4 right-1/3 animate-pulse delay-1000" 
      />
      <div 
        style={{
          background: `radial-gradient(circle, ${getColor('glass.light.10', colorMode)}, transparent)`,
          backdropFilter: 'blur(25px)',
        }}
        className="absolute w-80 h-80 rounded-full blur-2xl top-1/4 right-1/4 animate-pulse delay-500" 
      />
      
      {/* Enhanced floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {floatingParticles.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-float"
            style={{
              left: particle.left,
              top: particle.top,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          />
        ))}
      </div>
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full" style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>
    </div>
  );
});

export const Desktop: React.FC = memo(() => {
  const { shortcutHelpVisible, closeShortcutHelp, colorMode } = useUIState();
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [multiMonitorVisible, setMultiMonitorVisible] = useState(false);
  const [windowGroupManagerVisible, setWindowGroupManagerVisible] = useState(false);
  const [gridLayoutManagerVisible, setGridLayoutManagerVisible] = useState(false);
  const [notificationCenterVisible, setNotificationCenterVisible] = useState(false);
  
  // Expose multi-monitor function globally for system commands
  useEffect(() => {
    (window as any).openMultiMonitorLayout = () => setMultiMonitorVisible(true);
    return () => {
      delete (window as any).openMultiMonitorLayout;
    };
  }, []);
  
  // Initialize global shortcuts
  shortcutManager.initialize();

  // Initialize apps and search providers on mount
  useEffect(() => {
    try {
      initializeApps();
      initializeSearchProviders();
      
      // Initialize monitor manager for multi-monitor support
      monitorManager.initialize();
      
      // Initialize advanced command manager
      advancedCommandManager.initialize();
      
      // Apply initial theme with CSS variables
      applyThemeWithCSS(colorMode);
      
      setIsInitialized(true);
    } catch (err) {
      console.error('Failed to initialize desktop:', err);
      setError(err instanceof Error ? err.message : 'Initialization failed');
    }
  }, [colorMode]);

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="w-screen h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-4xl mb-4">🚀</div>
          <div className="text-xl font-semibold mb-2">Loading AIBOS</div>
          <div className="text-sm opacity-75">Initializing desktop environment...</div>
        </div>
      </div>
    );
  }

  // Show error state if initialization failed
  if (error) {
    return (
      <div className="w-screen h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-700 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-xl font-semibold mb-2">Initialization Error</div>
          <div className="text-sm opacity-75 mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { responsiveClasses } = useResponsiveConfig();

  return (
    <div className={`relative w-screen h-screen overflow-hidden transition-colors duration-500 ${responsiveClasses.container}`}>
      <BackgroundSystem />
      <TopBar 
        onOpenWindowGroups={() => setWindowGroupManagerVisible(true)}
        onOpenGridLayout={() => setGridLayoutManagerVisible(true)}
        onOpenNotifications={() => setNotificationCenterVisible(true)}
      />
      <WindowsContainer />
      <Dock />
      <Spotlight />
      <StartMenu />
      <ShortcutHelp isVisible={shortcutHelpVisible} onClose={closeShortcutHelp} />
      <ThemeSelector />
      <MultiMonitorLayout isVisible={multiMonitorVisible} onClose={() => setMultiMonitorVisible(false)} />
      <WindowGroupManager 
        isVisible={windowGroupManagerVisible} 
        onClose={() => setWindowGroupManagerVisible(false)} 
      />
      <GridLayoutManager 
        isVisible={gridLayoutManagerVisible} 
        onClose={() => setGridLayoutManagerVisible(false)} 
      />
      <NotificationCenter 
        isVisible={notificationCenterVisible} 
        onClose={() => setNotificationCenterVisible(false)} 
      />
      {/* Prepare for mobile window collapse/tab mode here */}
    </div>
  );
});

export default Desktop;

// Add display names for better debugging
Desktop.displayName = 'Desktop';
StartButton.displayName = 'StartButton';
WindowsContainer.displayName = 'WindowsContainer';
BackgroundSystem.displayName = 'BackgroundSystem';
