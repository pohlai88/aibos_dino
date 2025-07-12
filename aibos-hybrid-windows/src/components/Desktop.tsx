import React, { useState, useEffect, memo } from 'react';
import { useUIState } from '../store/uiState.ts';
import { appRegistry } from '../services/appRegistry.ts';
import { searchRegistry } from '../services/searchRegistry.ts';
import { systemCommands } from '../services/systemCommands.ts';
import { shortcutManager } from '../services/shortcutManager.ts';
import { Window } from './Window.tsx';
import { Spotlight } from './Spotlight.tsx';
import { ShortcutHelp } from './ShortcutHelp.tsx';
import { StartMenu } from './StartMenu.tsx';
import { Dock } from './Dock.tsx';
import { TopBar } from './TopBar.tsx';
import { Notepad } from '../apps/Notepad.tsx';
import { Files } from '../apps/Files.tsx';
import { Calculator } from '../apps/Calculator.tsx';
import { ThemeSelector } from './ThemeSelector.tsx';
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
  const { toggleStartMenu } = useUIState();

  return (
    <button
      type="button"
      onClick={toggleStartMenu}
      className="fixed bottom-4 left-4 z-50 bg-black bg-opacity-50 text-white px-4 py-2 rounded hover:bg-opacity-70 transition-all duration-200 hover:scale-105 dark:bg-white dark:bg-opacity-10 dark:text-gray-200"
      aria-label="Open start menu"
    >
      Start
    </button>
  );
});

// Windows container component
const WindowsContainer: React.FC = memo(() => {
  const { openWindows, closeWindow } = useUIState();

  return (
    <div className="absolute inset-0">
      {openWindows.map((win: OpenWindow) => {
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
    </div>
  );
});

// Enhanced background system component
const BackgroundSystem: React.FC = memo(() => {
  const { theme } = useUIState();

  // Memoize background class to prevent unnecessary recalculations
  const backgroundClass = React.useMemo(() => {
    switch (theme) {
      case 'nebula':
        return 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900';
      case 'purple':
        return 'bg-gradient-to-br from-purple-800 via-purple-700 to-purple-600';
      case 'gray':
        return 'bg-gradient-to-br from-gray-800 via-gray-700 to-gray-600';
      case 'blue':
        return 'bg-gradient-to-br from-blue-800 via-blue-700 to-blue-600';
      case 'slate':
        return 'bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600';
      case 'ocean':
        return 'bg-gradient-to-br from-cyan-800 via-blue-800 to-indigo-800';
      case 'sunset':
        return 'bg-gradient-to-br from-orange-800 via-red-800 to-pink-800';
      case 'forest':
        return 'bg-gradient-to-br from-green-800 via-emerald-800 to-teal-800';
      case 'cosmic':
        return 'bg-gradient-to-br from-indigo-800 via-purple-800 to-pink-800';
      case 'aurora':
        return 'bg-gradient-to-br from-green-700 via-blue-800 to-purple-800';
      default:
        return 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900';
    }
  }, [theme]);

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
    <div className={`absolute inset-0 ${backgroundClass} transition-all duration-1000`}>
      {/* Glass blobs with theme-aware colors */}
      <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl top-1/3 left-1/4 animate-pulse" />
      <div className="absolute w-64 h-64 bg-blue-600/15 rounded-full blur-2xl bottom-1/4 right-1/3 animate-pulse delay-1000" />
      <div className="absolute w-80 h-80 bg-indigo-600/10 rounded-full blur-2xl top-1/4 right-1/4 animate-pulse delay-500" />
      
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
  const { spotlightVisible, shortcutHelpVisible, closeShortcutHelp } = useUIState();
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize global shortcuts
  shortcutManager.initialize();

  // Initialize apps and search providers on mount
  useEffect(() => {
    try {
      initializeApps();
      initializeSearchProviders();
      setIsInitialized(true);
    } catch (err) {
      console.error('Failed to initialize desktop:', err);
      setError(err instanceof Error ? err.message : 'Initialization failed');
    }
  }, []);

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

  return (
    <div className={`w-screen h-screen relative overflow-hidden transition-colors duration-500`}>
      <BackgroundSystem />
      
      {/* Top bar */}
      <TopBar />

      {/* Dock */}
      <Dock />

      {/* Start button */}
      <StartButton />

      {/* Windows */}
      <WindowsContainer />

      {/* Start Menu */}
      <StartMenu />

      {/* Spotlight overlay */}
      {spotlightVisible && <Spotlight />}

      {/* Shortcut help modal */}
      <ShortcutHelp isVisible={shortcutHelpVisible} onClose={closeShortcutHelp} />
    </div>
  );
});

// Add display names for better debugging
Desktop.displayName = 'Desktop';
StartButton.displayName = 'StartButton';
WindowsContainer.displayName = 'WindowsContainer';
BackgroundSystem.displayName = 'BackgroundSystem';
