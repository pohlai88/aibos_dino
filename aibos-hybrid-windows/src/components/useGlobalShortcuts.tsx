import { useEffect } from 'react';
import { useUIState } from '../store/uiState.ts';

export function useGlobalShortcuts() {
  const { toggleSpotlight, toggleStartMenu, toggleUserMenu, navigateHome, openShortcutHelp, cycleTheme } = useUIState();

  useEffect(() => {
    const handleKeydown = (e: Event) => {
      const event = e as any; // Using any to avoid Deno type issues
      if ((event.metaKey || event.ctrlKey) && event.code === 'Space') {
        event.preventDefault();
        toggleSpotlight();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'escape') {
        event.preventDefault();
        toggleStartMenu();
      }
      // Home navigation: Ctrl/Cmd + H
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'h') {
        event.preventDefault();
        navigateHome();
      }
      // User menu toggle: Ctrl/Cmd + U
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'u') {
        event.preventDefault();
        toggleUserMenu();
      }
      // Shortcut help: F1
      if (event.key === 'F1') {
        event.preventDefault();
        openShortcutHelp();
      }
      // Theme cycle: Ctrl/Cmd + T
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 't') {
        event.preventDefault();
        cycleTheme();
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [toggleSpotlight, toggleStartMenu, toggleUserMenu, navigateHome, openShortcutHelp, cycleTheme]);
} 