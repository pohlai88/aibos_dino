import { create } from 'zustand';
import { ThemeVariant, getThemeOrder } from '../utils/themeManager.ts';

interface WindowState {
  id: string;
  component: string;
  props?: Record<string, unknown>;
  zIndex: number;
}

interface UIState {
  openWindows: WindowState[];
  spotlightVisible: boolean;
  startMenuVisible: boolean;
  userMenuVisible: boolean;
  shortcutHelpVisible: boolean;
  theme: ThemeVariant;
  toggleStartMenu: () => void;
  openStartMenu: () => void;
  closeStartMenu: () => void;
  toggleSpotlight: () => void;
  openSpotlight: () => void;
  closeSpotlight: () => void;
  toggleUserMenu: () => void;
  openUserMenu: () => void;
  closeUserMenu: () => void;
  toggleShortcutHelp: () => void;
  openShortcutHelp: () => void;
  closeShortcutHelp: () => void;
  setTheme: (theme: ThemeVariant) => void;
  cycleTheme: () => void;
  closeWindow: (id: string) => void;
  bringToFront: (id: string) => void;
  openWindow: (component: string, props?: Record<string, unknown>) => void;
  navigateHome: () => void;
}

export const useUIState = create<UIState>((set, get) => {
  // Initialize theme from localStorage or default to 'nebula'
  const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('aibos-theme') as ThemeVariant : 'nebula';
  const initialTheme = savedTheme || 'nebula';

  // Theme order for cycling
  const themeOrder: ThemeVariant[] = getThemeOrder();

  return {
    openWindows: [],
    spotlightVisible: false,
    startMenuVisible: false,
    userMenuVisible: false,
    shortcutHelpVisible: false,
    theme: initialTheme,
    toggleStartMenu: () => set(state => ({ startMenuVisible: !state.startMenuVisible })),
    openStartMenu: () => set({ startMenuVisible: true }),
    closeStartMenu: () => set({ startMenuVisible: false }),
    toggleSpotlight: () => set(state => ({ spotlightVisible: !state.spotlightVisible })),
    openSpotlight: () => set({ spotlightVisible: true }),
    closeSpotlight: () => set({ spotlightVisible: false }),
    toggleUserMenu: () => set(state => ({ userMenuVisible: !state.userMenuVisible })),
    openUserMenu: () => set({ userMenuVisible: true }),
    closeUserMenu: () => set({ userMenuVisible: false }),
    toggleShortcutHelp: () => set(state => ({ shortcutHelpVisible: !state.shortcutHelpVisible })),
    openShortcutHelp: () => set({ shortcutHelpVisible: true }),
    closeShortcutHelp: () => set({ shortcutHelpVisible: false }),
    setTheme: (theme: ThemeVariant) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('aibos-theme', theme);
      }
      set({ theme });
    },
    cycleTheme: () => set(state => {
      const currentIndex = themeOrder.indexOf(state.theme);
      const nextIndex = (currentIndex + 1) % themeOrder.length;
      const newTheme = themeOrder[nextIndex];
      if (typeof window !== 'undefined') {
        localStorage.setItem('aibos-theme', newTheme);
      }
      return { theme: newTheme };
    }),
  closeWindow: (id: string) => set(state => ({
    openWindows: state.openWindows.filter(win => win.id !== id)
  })),
  bringToFront: (id: string) => set(state => {
    const maxZIndex = Math.max(...state.openWindows.map(win => win.zIndex), 0);
    return {
      openWindows: state.openWindows.map(win => 
        win.id === id ? { ...win, zIndex: maxZIndex + 1 } : win
      )
    };
  }),
  openWindow: (component: string, props?: Record<string, unknown>) => set(state => {
    const maxZIndex = Math.max(...state.openWindows.map(win => win.zIndex), 0);
    const newWindow: WindowState = {
      id: `${component}-${Date.now()}`,
      component,
      props,
      zIndex: maxZIndex + 1,
    };
    return {
      openWindows: [...state.openWindows, newWindow]
    };
  }),
  navigateHome: () => {
    console.log('Navigating to home screen');
    // TODO: Implement home navigation logic
    // This could close all windows, reset desktop state, etc.
  },
  };
}); 