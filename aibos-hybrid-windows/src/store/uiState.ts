import { create } from 'zustand';
import { ThemeVariant, getThemeOrder } from '../utils/themeManager.ts';
import type { ThemeMode } from '../utils/themeHelpers.ts';

// --- Types ---
interface WindowState {
  id: string;
  component: string;
  props?: Record<string, unknown>;
  zIndex: number;
  minimized?: boolean;
  maximized?: boolean;
  focused?: boolean;
  // Window Groups & Tabs
  groupId?: string;
  tabId?: string;
  isTab?: boolean;
  parentWindowId?: string;
}

interface WindowGroup {
  id: string;
  name: string;
  windowIds: string[];
  activeWindowId?: string;
  isCollapsed?: boolean;
  order?: number;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: number;
}

interface UIState {
  // Window management
  openWindows: WindowState[];
  focusedWindowId?: string;
  // Window Groups & Tabs
  windowGroups: Record<string, WindowGroup>;
  activeGroupId?: string;
  // UI overlays
  spotlightVisible: boolean;
  startMenuVisible: boolean;
  userMenuVisible: boolean;
  shortcutHelpVisible: boolean;
  // Theme & accessibility
  theme: ThemeVariant;
  colorMode: ThemeMode;
  highContrastMode: boolean;
  // Spotlight/search
  lastSpotlightQuery?: string;
  lastSpotlightResults?: unknown[];
  // Notifications
  notifications: Notification[];
  // --- Actions ---
  // Window actions
  openWindow: (component: string, props?: Record<string, unknown>) => void;
  closeWindow: (id: string) => void;
  bringToFront: (id: string) => void;
  bringWindowToFront: (component: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  closeAllWindows: () => void;
  focusWindow: (id: string) => void;
  // Window Groups & Tabs actions
  createWindowGroup: (name: string, windowIds?: string[]) => string;
  addWindowToGroup: (windowId: string, groupId: string) => void;
  removeWindowFromGroup: (windowId: string) => void;
  setActiveGroup: (groupId: string) => void;
  setActiveWindowInGroup: (groupId: string, windowId: string) => void;
  collapseGroup: (groupId: string) => void;
  expandGroup: (groupId: string) => void;
  closeGroup: (groupId: string) => void;
  // Overlay actions
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
  // Theme & accessibility
  setTheme: (theme: ThemeVariant) => void;
  setColorMode: (mode: ThemeMode) => void;
  cycleTheme: () => void;
  toggleHighContrast: () => void;
  // Spotlight/search
  setLastSpotlightQuery: (query: string) => void;
  setLastSpotlightResults: (results: unknown[]) => void;
  // Notifications
  addNotification: (type: Notification['type'], message: string) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  // Navigation
  navigateHome: () => void;
}

export const useUIState = create<UIState>((set) => {
  // --- Theme ---
  const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('aibos-theme') as ThemeVariant : 'nebula';
  const initialTheme = savedTheme || 'nebula';
  const themeOrder: ThemeVariant[] = getThemeOrder();

  return {
    // --- State ---
    openWindows: [],
    focusedWindowId: undefined,
    windowGroups: {},
    activeGroupId: undefined,
    spotlightVisible: false,
    startMenuVisible: false,
    userMenuVisible: false,
    shortcutHelpVisible: false,
    theme: initialTheme,
    colorMode: 'light',
    highContrastMode: false,
    lastSpotlightQuery: '',
    lastSpotlightResults: [],
    notifications: [],

    // --- Window Actions ---
    openWindow: (component, props) => set((state) => {
      const maxZIndex = Math.max(...state.openWindows.map(win => win.zIndex), 0);
      const newId = `${component}-${Date.now()}`;
      const newWindow: WindowState = {
        id: newId,
        component,
        props,
        zIndex: maxZIndex + 1,
        minimized: false,
        maximized: false,
        focused: true,
      };
      // Unfocus all others
      const openWindows = state.openWindows.map(win => ({ ...win, focused: false }));
      return {
        openWindows: [...openWindows, newWindow],
        focusedWindowId: newId,
      };
    }),
    closeWindow: (id) => set((state) => {
      const openWindows = state.openWindows.filter(win => win.id !== id);
      let focusedWindowId = state.focusedWindowId;
      if (focusedWindowId === id) {
        focusedWindowId = openWindows.length > 0 ? openWindows[openWindows.length - 1].id : undefined;
      }
      return { openWindows, focusedWindowId };
    }),
    bringToFront: (id) => set((state) => {
      const maxZIndex = Math.max(...state.openWindows.map(win => win.zIndex), 0);
      return {
        openWindows: state.openWindows.map(win =>
          win.id === id ? { ...win, zIndex: maxZIndex + 1, focused: true } : { ...win, focused: false }
        ),
        focusedWindowId: id,
      };
    }),
    bringWindowToFront: (component) => set((state) => {
      const maxZIndex = Math.max(...state.openWindows.map(win => win.zIndex), 0);
      let focusedId = state.focusedWindowId;
      const openWindows = state.openWindows.map(win => {
        if (win.component === component) {
          focusedId = win.id;
          return { ...win, zIndex: maxZIndex + 1, focused: true };
        }
        return { ...win, focused: false };
      });
      return { openWindows, focusedWindowId: focusedId };
    }),
    minimizeWindow: (id) => set((state) => ({
      openWindows: state.openWindows.map(win =>
        win.id === id ? { ...win, minimized: true, maximized: false, focused: false } : win
      ),
      focusedWindowId: state.focusedWindowId === id ? undefined : state.focusedWindowId,
    })),
    maximizeWindow: (id) => set((state) => ({
      openWindows: state.openWindows.map(win =>
        win.id === id ? { ...win, maximized: true, minimized: false, focused: true } : { ...win, focused: false }
      ),
      focusedWindowId: id,
    })),
    restoreWindow: (id) => set((state) => ({
      openWindows: state.openWindows.map(win =>
        win.id === id ? { ...win, minimized: false, maximized: false, focused: true } : { ...win, focused: false }
      ),
      focusedWindowId: id,
    })),
    closeAllWindows: () => set(() => ({ openWindows: [], focusedWindowId: undefined })),
    focusWindow: (id) => set((state) => ({
      openWindows: state.openWindows.map(win =>
        win.id === id ? { ...win, focused: true } : { ...win, focused: false }
      ),
      focusedWindowId: id,
    })),

    // --- Overlay Actions ---
    toggleStartMenu: () => set((state) => ({ startMenuVisible: !state.startMenuVisible })),
    openStartMenu: () => set({ startMenuVisible: true }),
    closeStartMenu: () => set({ startMenuVisible: false }),
    toggleSpotlight: () => set((state) => ({ spotlightVisible: !state.spotlightVisible })),
    openSpotlight: () => set({ spotlightVisible: true }),
    closeSpotlight: () => set({ spotlightVisible: false }),
    toggleUserMenu: () => set((state) => ({ userMenuVisible: !state.userMenuVisible })),
    openUserMenu: () => set({ userMenuVisible: true }),
    closeUserMenu: () => set({ userMenuVisible: false }),
    toggleShortcutHelp: () => set((state) => ({ shortcutHelpVisible: !state.shortcutHelpVisible })),
    openShortcutHelp: () => set({ shortcutHelpVisible: true }),
    closeShortcutHelp: () => set({ shortcutHelpVisible: false }),

    // --- Theme & Accessibility ---
    setTheme: (theme) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('aibos-theme', theme);
      }
      set({ theme });
    },
    setColorMode: (colorMode) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('aibos-color-mode', colorMode);
      }
      set({ colorMode });
    },
    cycleTheme: () => set((state) => {
      const currentIndex = themeOrder.indexOf(state.theme);
      const nextIndex = (currentIndex + 1) % themeOrder.length;
      const newTheme = themeOrder[nextIndex];
      if (typeof window !== 'undefined') {
        localStorage.setItem('aibos-theme', newTheme);
      }
      return { theme: newTheme };
    }),
    toggleHighContrast: () => set((state) => ({ highContrastMode: !state.highContrastMode })),

    // --- Spotlight/Search ---
    setLastSpotlightQuery: (query) => set({ lastSpotlightQuery: query }),
    setLastSpotlightResults: (results) => set({ lastSpotlightResults: results }),

    // --- Notifications ---
    addNotification: (type, message) => set((state) => {
      const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const notification: Notification = {
        id,
        type,
        message,
        timestamp: Date.now(),
      };
      return { notifications: [...state.notifications, notification] };
    }),
    removeNotification: (id) => set((state) => ({
      notifications: state.notifications.filter(n => n.id !== id)
    })),
    clearNotifications: () => set({ notifications: [] }),

    // --- Window Groups & Tabs Actions ---
    createWindowGroup: (name, windowIds = []) => {
      const groupId = `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const group: WindowGroup = {
        id: groupId,
        name,
        windowIds,
        activeWindowId: windowIds[0],
        isCollapsed: false,
        order: Object.keys(useUIState.getState().windowGroups).length,
      };
      set((state) => ({
        windowGroups: { ...state.windowGroups, [groupId]: group },
        activeGroupId: groupId,
      }));
      return groupId;
    },
    addWindowToGroup: (windowId, groupId) => set((state) => {
      const group = state.windowGroups[groupId];
      if (!group) return {};
      
      const updatedGroup = {
        ...group,
        windowIds: [...group.windowIds, windowId],
        activeWindowId: windowId,
      };
      
      return {
        windowGroups: { ...state.windowGroups, [groupId]: updatedGroup },
        openWindows: state.openWindows.map(win =>
          win.id === windowId ? { ...win, groupId } : win
        ),
      };
    }),
    removeWindowFromGroup: (windowId) => set((state) => {
      const updatedGroups = { ...state.windowGroups };
      let updatedWindows = state.openWindows;
      
      // Find and remove window from its group
      Object.keys(updatedGroups).forEach(groupId => {
        const group = updatedGroups[groupId];
        if (group.windowIds.includes(windowId)) {
          const newWindowIds = group.windowIds.filter(id => id !== windowId);
          if (newWindowIds.length === 0) {
            delete updatedGroups[groupId];
          } else {
            updatedGroups[groupId] = {
              ...group,
              windowIds: newWindowIds,
              activeWindowId: group.activeWindowId === windowId ? newWindowIds[0] : group.activeWindowId,
            };
          }
          updatedWindows = updatedWindows.map(win =>
            win.id === windowId ? { ...win, groupId: undefined } : win
          );
        }
      });
      
      return { windowGroups: updatedGroups, openWindows: updatedWindows };
    }),
    setActiveGroup: (groupId) => set({ activeGroupId: groupId }),
    setActiveWindowInGroup: (groupId, windowId) => set((state) => {
      const group = state.windowGroups[groupId];
      if (!group || !group.windowIds.includes(windowId)) return {};
      
      return {
        windowGroups: {
          ...state.windowGroups,
          [groupId]: { ...group, activeWindowId: windowId }
        },
        openWindows: state.openWindows.map(win =>
          win.id === windowId ? { ...win, focused: true } : { ...win, focused: false }
        ),
        focusedWindowId: windowId,
      };
    }),
    collapseGroup: (groupId) => set((state) => {
      const group = state.windowGroups[groupId];
      if (!group) return {};
      
      return {
        windowGroups: {
          ...state.windowGroups,
          [groupId]: { ...group, isCollapsed: true }
        },
        openWindows: state.openWindows.map(win =>
          group.windowIds.includes(win.id) ? { ...win, minimized: true } : win
        ),
      };
    }),
    expandGroup: (groupId) => set((state) => {
      const group = state.windowGroups[groupId];
      if (!group) return {};
      
      return {
        windowGroups: {
          ...state.windowGroups,
          [groupId]: { ...group, isCollapsed: false }
        },
        openWindows: state.openWindows.map(win =>
          group.windowIds.includes(win.id) ? { ...win, minimized: false } : win
        ),
      };
    }),
    closeGroup: (groupId) => set((state) => {
      const group = state.windowGroups[groupId];
      if (!group) return {};
      
      const updatedGroups = { ...state.windowGroups };
      delete updatedGroups[groupId];
      
      return {
        windowGroups: updatedGroups,
        openWindows: state.openWindows.filter(win => !group.windowIds.includes(win.id)),
        focusedWindowId: state.focusedWindowId && group.windowIds.includes(state.focusedWindowId) 
          ? undefined 
          : state.focusedWindowId,
      };
    }),

    // --- Navigation ---
    navigateHome: () => {
      // Example: close all windows, reset overlays
      set({
        openWindows: [],
        focusedWindowId: undefined,
        startMenuVisible: false,
        userMenuVisible: false,
        shortcutHelpVisible: false,
        spotlightVisible: false,
      });
      // Add more logic as needed
    },
  };
}); 