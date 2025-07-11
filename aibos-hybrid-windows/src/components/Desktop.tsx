import React, { memo, useEffect } from 'react';
import { Dock } from './Dock.tsx';
import { TopBar } from './TopBar.tsx';
import { StartMenu } from './StartMenu.tsx';
import { Window } from './Window.tsx';
import { Spotlight } from './Spotlight.tsx';
import { ShortcutHelp } from './ShortcutHelp.tsx';
import { useUIState } from '../store/uiState.ts';
import { useGlobalShortcuts } from './useGlobalShortcuts.tsx';
import { appRegistry } from '../services/appRegistry.ts';
import { searchRegistry } from '../services/searchRegistry.ts';
import { systemCommands } from '../services/systemCommands.ts';
import { Notepad } from '../apps/Notepad.tsx';
import { Calculator } from '../apps/Calculator.tsx';
import { Files } from '../apps/Files.tsx';
import { ThemeSelector } from './ThemeSelector.tsx';

// Media query types for Deno environment
interface MediaQueryList {
  matches: boolean;
  addEventListener(type: string, listener: (e: MediaQueryListEvent) => void): void;
  removeEventListener(type: string, listener: (e: MediaQueryListEvent) => void): void;
}

interface MediaQueryListEvent {
  matches: boolean;
}

interface WindowWithMediaQuery extends Window {
  matchMedia(query: string): MediaQueryList;
}

// Initialize apps
const initializeApps = () => {
  appRegistry.register({
    id: 'notepad',
    title: 'Notepad',
    icon: '📝',
    description: 'Take notes and edit text files',
    category: 'Productivity',
    permissions: ['filesystem'],
    component: Notepad,
  });

  appRegistry.register({
    id: 'calculator',
    title: 'Calculator',
    icon: '🧮',
    description: 'Perform calculations',
    category: 'Utilities',
    permissions: [],
    component: Calculator,
  });

  appRegistry.register({
    id: 'files',
    title: 'Files',
    icon: '📁',
    description: 'Browse and manage files',
    category: 'System',
    permissions: ['filesystem'],
    component: Files,
  });

  appRegistry.register({
    id: 'themes',
    title: 'Theme Selector',
    icon: '🎨',
    description: 'Choose from beautiful themes',
    category: 'Appearance',
    permissions: [],
    component: ThemeSelector,
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
      {openWindows.map((win) => {
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

  // Dynamic background classes based on theme
  const getBackgroundClass = () => {
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
  };

  return (
    <div className={`absolute inset-0 ${getBackgroundClass()} transition-all duration-1000`}>
      {/* Glass blobs with theme-aware colors */}
      <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl top-1/3 left-1/4 animate-pulse" />
      <div className="absolute w-64 h-64 bg-blue-600/15 rounded-full blur-2xl bottom-1/4 right-1/3 animate-pulse delay-1000" />
      <div className="absolute w-80 h-80 bg-indigo-600/10 rounded-full blur-2xl top-1/4 right-1/4 animate-pulse delay-500" />
    </div>
  );
});

export const Desktop: React.FC = memo(() => {
  const { spotlightVisible, shortcutHelpVisible, closeShortcutHelp } = useUIState();
  
  // Initialize global shortcuts
  useGlobalShortcuts();

  // Initialize apps and search providers on mount
  useEffect(() => {
    initializeApps();
    initializeSearchProviders();
  }, []);

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
