import { useUIState } from '../store/uiState.ts';
import { SearchProvider } from '../types/search.ts';
import { createCommandSearchResult } from './searchRegistry.ts';
// REMOVED: import { logInfo, logWarn } from '../../modules/logging.ts';
import { EnterpriseLogger } from './core/logger';

export interface ShortcutDefinition {
  id: string;
  key: string;
  description: string;
  category: string;
  icon?: string;
  tags?: string[];
  action: () => void;
  context?: 'global' | 'app' | 'component';
  appId?: string; // For app-specific shortcuts
  priority?: number; // Higher priority shortcuts take precedence
  enabled?: boolean;
  preventDefault?: boolean;
  helpText?: string; // Additional help text for the shortcut
  isSystem?: boolean; // System shortcuts cannot be unregistered
  requiresConfirmation?: boolean; // For destructive actions
  confirmationMessage?: string;
}

export interface ShortcutContext {
  isInputFocused: boolean;
  activeApp?: string;
  activeComponent?: string;
  activeWindow?: string;
}

export interface ShortcutConflict {
  shortcut1: ShortcutDefinition;
  shortcut2: ShortcutDefinition;
  key: string;
  severity: 'warning' | 'error';
}

class ShortcutManager {
  private shortcuts: Map<string, ShortcutDefinition> = new Map();
  private eventListeners: Map<string, () => void> = new Map();
  private isInitialized = false;
  private keyMap: Map<string, ShortcutDefinition[]> = new Map(); // For quick key lookup
  private conflicts: ShortcutConflict[] = [];
  private searchProvider?: SearchProvider;

  // Register a new shortcut with conflict detection
  register(shortcut: ShortcutDefinition): void {
    if (this.shortcuts.has(shortcut.id)) {
      logWarn(`Shortcut ${shortcut.id} already registered, overwriting...`);
    }
    
    const normalizedShortcut: ShortcutDefinition = {
      ...shortcut,
      enabled: shortcut.enabled ?? true,
      preventDefault: shortcut.preventDefault ?? true,
      priority: shortcut.priority ?? 0,
      isSystem: shortcut.isSystem ?? false,
      requiresConfirmation: shortcut.requiresConfirmation ?? false
    };

    this.shortcuts.set(shortcut.id, normalizedShortcut);
    this.updateKeyMap(normalizedShortcut);
    this.detectConflicts(normalizedShortcut);
  }

  // Unregister a shortcut (cannot unregister system shortcuts)
  unregister(shortcutId: string): boolean {
    const shortcut = this.shortcuts.get(shortcutId);
    if (!shortcut) return false;
    
    if (shortcut.isSystem) {
      logWarn(`Cannot unregister system shortcut: ${shortcutId}`);
      return false;
    }

    this.shortcuts.delete(shortcutId);
    this.removeFromKeyMap(shortcut);
    this.resolveConflicts(shortcutId);
    return true;
  }

  // Get all shortcuts for display in ShortcutHelp
  getAllShortcuts(): ShortcutDefinition[] {
    return Array.from(this.shortcuts.values())
      .filter(shortcut => shortcut.enabled)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  // Get shortcuts by category
  getShortcutsByCategory(category: string): ShortcutDefinition[] {
    return this.getAllShortcuts().filter(shortcut => shortcut.category === category);
  }

  // Get shortcuts by context
  getShortcutsByContext(context: ShortcutContext): ShortcutDefinition[] {
    return this.getAllShortcuts().filter(shortcut => {
      // Global shortcuts always apply
      if (shortcut.context === 'global') return true;
      
      // App-specific shortcuts only when that app is active
      if (shortcut.context === 'app' && shortcut.appId === context.activeApp) return true;
      
      // Component shortcuts only when that component is active
      if (shortcut.context === 'component' && shortcut.appId === context.activeComponent) return true;
      
      return false;
    });
  }

  // Get shortcuts by key combination
  getShortcutsByKey(key: string): ShortcutDefinition[] {
    const normalizedKey = this.normalizeKey(key);
    return this.keyMap.get(normalizedKey) || [];
  }

  // Check if a key combination is already registered
  isKeyRegistered(key: string, context?: ShortcutContext): boolean {
    const matchingShortcuts = this.getShortcutsByKey(key);

    if (!context) return matchingShortcuts.length > 0;

    return matchingShortcuts.some(shortcut => {
      if (shortcut.context === 'global') return true;
      if (shortcut.context === 'app' && shortcut.appId === context.activeApp) return true;
      if (shortcut.context === 'component' && shortcut.appId === context.activeComponent) return true;
      return false;
    });
  }

  // Get all conflicts
  getConflicts(): ShortcutConflict[] {
    return this.conflicts;
  }

  // Resolve conflicts by unregistering one of the conflicting shortcuts
  resolveConflict(conflict: ShortcutConflict, keepShortcutId: string): void {
    const shortcutToRemove = conflict.shortcut1.id === keepShortcutId ? conflict.shortcut2 : conflict.shortcut1;
    this.unregister(shortcutToRemove.id);
  }

  // Normalize key combinations for comparison
  private normalizeKey(key: string): string {
    return key.toLowerCase()
      .replace(/\s+/g, '')
      .replace('ctrl', 'ctrl')
      .replace('cmd', 'ctrl')
      .replace('meta', 'ctrl');
  }

  // Update key map for quick lookup
  private updateKeyMap(shortcut: ShortcutDefinition): void {
    const normalizedKey = this.normalizeKey(shortcut.key);
    const existing = this.keyMap.get(normalizedKey) || [];
    existing.push(shortcut);
    this.keyMap.set(normalizedKey, existing);
  }

  // Remove from key map
  private removeFromKeyMap(shortcut: ShortcutDefinition): void {
    const normalizedKey = this.normalizeKey(shortcut.key);
    const existing = this.keyMap.get(normalizedKey) || [];
    const filtered = existing.filter(s => s.id !== shortcut.id);
    if (filtered.length > 0) {
      this.keyMap.set(normalizedKey, filtered);
    } else {
      this.keyMap.delete(normalizedKey);
    }
  }

  // Detect conflicts
  private detectConflicts(shortcut: ShortcutDefinition): void {
    const normalizedKey = this.normalizeKey(shortcut.key);
    const existing = this.keyMap.get(normalizedKey) || [];
    
    if (existing.length > 1) {
      existing.forEach(existingShortcut => {
        if (existingShortcut.id !== shortcut.id) {
          const conflict: ShortcutConflict = {
            shortcut1: shortcut,
            shortcut2: existingShortcut,
            key: shortcut.key,
            severity: existingShortcut.isSystem || shortcut.isSystem ? 'error' : 'warning'
          };
          
          // Avoid duplicate conflicts
          const exists = this.conflicts.some(c => 
            (c.shortcut1.id === conflict.shortcut1.id && c.shortcut2.id === conflict.shortcut2.id) ||
            (c.shortcut1.id === conflict.shortcut2.id && c.shortcut2.id === conflict.shortcut1.id)
          );
          
          if (!exists) {
            this.conflicts.push(conflict);
            logWarn(`Shortcut conflict detected: ${shortcut.key}`);
          }
        }
      });
    }
  }

  // Resolve conflicts when a shortcut is removed
  private resolveConflicts(removedShortcutId: string): void {
    this.conflicts = this.conflicts.filter(conflict => 
      conflict.shortcut1.id !== removedShortcutId && conflict.shortcut2.id !== removedShortcutId
    );
  }

  // Initialize the shortcut manager
  initialize(): void {
    if (this.isInitialized) return;

    this.registerDefaultShortcuts();
    this.setupGlobalEventListeners();
    this.createSearchProvider();
    this.isInitialized = true;
  }

  // Create search provider for shortcuts
  private createSearchProvider(): void {
    this.searchProvider = {
      id: 'shortcuts',
      name: 'Keyboard Shortcuts',
      description: 'Search and execute keyboard shortcuts',
      priority: 3,
      search: async (query: string, limit?: number) => {
        const queryLower = query.toLowerCase();
        return this.getAllShortcuts()
          .filter(shortcut => 
            shortcut.description.toLowerCase().includes(queryLower) ||
            shortcut.key.toLowerCase().includes(queryLower) ||
            shortcut.category.toLowerCase().includes(queryLower) ||
            shortcut.tags?.some(tag => tag.toLowerCase().includes(queryLower))
          )
          .slice(0, limit || 10)
          .map(shortcut => createCommandSearchResult(
            shortcut.id,
            shortcut.description,
            shortcut.id,
            () => {
              if (shortcut.requiresConfirmation) {
                const message = shortcut.confirmationMessage || `Execute ${shortcut.description}?`;
                if (confirm(message)) {
                  shortcut.action();
                }
              } else {
                shortcut.action();
              }
            },
            shortcut.key
          ));
      }
    };
  }

  // Get search provider
  getSearchProvider(): SearchProvider | undefined {
    return this.searchProvider;
  }

  // Register default system shortcuts
  private registerDefaultShortcuts(): void {
    const { 
      toggleSpotlight, 
      toggleStartMenu, 
      toggleUserMenu, 
      openShortcutHelp,
      closeShortcutHelp,
      navigateHome, 
      cycleTheme 
    } = useUIState.getState();

    // Global Navigation Shortcuts
    this.register({
      id: 'spotlight-toggle',
      key: 'Ctrl+Space',
      description: 'Toggle Spotlight Search',
      category: 'Navigation',
      icon: '🔍',
      tags: ['search', 'spotlight', 'find'],
      action: toggleSpotlight,
      context: 'global',
      priority: 100,
      isSystem: true,
      helpText: 'Quick access to search apps, files, and commands'
    });

    this.register({
      id: 'start-menu-toggle',
      key: 'Ctrl+Escape',
      description: 'Toggle Start Menu',
      category: 'Navigation',
      icon: '🏠',
      tags: ['start', 'menu', 'home'],
      action: toggleStartMenu,
      context: 'global',
      priority: 100,
      isSystem: true,
      helpText: 'Access applications and system settings'
    });

    this.register({
      id: 'home-navigate',
      key: 'Ctrl+H',
      description: 'Navigate to Home',
      category: 'Navigation',
      icon: '🏠',
      tags: ['home', 'navigate'],
      action: navigateHome,
      context: 'global',
      priority: 90,
      isSystem: true,
      helpText: 'Return to the main desktop'
    });

    this.register({
      id: 'user-menu-toggle',
      key: 'Ctrl+U',
      description: 'Toggle User Menu',
      category: 'User',
      icon: '👤',
      tags: ['user', 'profile', 'account'],
      action: toggleUserMenu,
      context: 'global',
      priority: 90,
      isSystem: true,
      helpText: 'Access user settings and account information'
    });

    this.register({
      id: 'theme-cycle',
      key: 'Ctrl+T',
      description: 'Cycle Theme (10 beautiful themes)',
      category: 'Appearance',
      icon: '🎨',
      tags: ['theme', 'appearance', 'color'],
      action: cycleTheme,
      context: 'global',
      priority: 80,
      isSystem: true,
      helpText: 'Switch between available themes'
    });

    this.register({
      id: 'shortcut-help-open',
      key: 'F1',
      description: 'Show Keyboard Shortcuts',
      category: 'Help',
      icon: '❓',
      tags: ['help', 'shortcuts', 'keyboard'],
      action: openShortcutHelp,
      context: 'global',
      priority: 100,
      isSystem: true,
      helpText: 'Display all available keyboard shortcuts'
    });

    this.register({
      id: 'shortcut-help-close',
      key: 'Escape',
      description: 'Close Shortcut Help',
      category: 'Help',
      icon: '❌',
      tags: ['close', 'escape'],
      action: closeShortcutHelp,
      context: 'global',
      priority: 100,
      isSystem: true,
      helpText: 'Close the shortcut help dialog'
    });

    // App Launcher Shortcuts
    this.register({
      id: 'app-notepad',
      key: 'N',
      description: 'Open Notepad',
      category: 'Applications',
      icon: '📝',
      tags: ['notepad', 'text', 'editor'],
      action: () => {
        const { openWindow } = useUIState.getState();
        openWindow('notepad');
      },
      context: 'global',
      priority: 70,
      helpText: 'Launch the text editor'
    });

    this.register({
      id: 'app-files',
      key: 'F',
      description: 'Open Files',
      category: 'Applications',
      icon: '📁',
      tags: ['files', 'explorer', 'browse'],
      action: () => {
        const { openWindow } = useUIState.getState();
        openWindow('files');
      },
      context: 'global',
      priority: 70,
      helpText: 'Open the file manager'
    });

    this.register({
      id: 'app-calculator',
      key: 'C',
      description: 'Open Calculator',
      category: 'Applications',
      icon: '🧮',
      tags: ['calculator', 'math', 'compute'],
      action: () => {
        const { openWindow } = useUIState.getState();
        openWindow('calculator');
      },
      context: 'global',
      priority: 70,
      helpText: 'Launch the calculator application'
    });

    this.register({
      id: 'app-clock',
      key: 'T',
      description: 'Open Clock',
      category: 'Applications',
      icon: '🕐',
      tags: ['clock', 'time', 'weather'],
      action: () => {
        const { openWindow } = useUIState.getState();
        openWindow('clock');
      },
      context: 'global',
      priority: 70,
      helpText: 'Open the clock and weather app'
    });

    this.register({
      id: 'app-themes',
      key: 'H',
      description: 'Open Theme Selector',
      category: 'Applications',
      icon: '🎨',
      tags: ['themes', 'customize', 'appearance'],
      action: () => {
        const { openWindow } = useUIState.getState();
        openWindow('themes');
      },
      context: 'global',
      priority: 70,
      helpText: 'Open the theme customization panel'
    });

    // Window Management Shortcuts
    this.register({
      id: 'window-close',
      key: 'Ctrl+W',
      description: 'Close Active Window',
      category: 'Windows',
      icon: '❌',
      tags: ['close', 'window', 'exit'],
      action: () => {
        // This would need to be implemented based on your window management system
        logInfo('Close active window');
      },
      context: 'global',
      priority: 60,
      helpText: 'Close the currently active window'
    });

    this.register({
      id: 'window-minimize',
      key: 'Ctrl+M',
      description: 'Minimize Active Window',
      category: 'Windows',
      icon: '➖',
      tags: ['minimize', 'window', 'hide'],
      action: () => {
        logInfo('Minimize active window');
      },
      context: 'global',
      priority: 60,
      helpText: 'Minimize the currently active window'
    });
  }

  // Setup global event listeners with performance optimizations
  private setupGlobalEventListeners(): void {
    const handleKeyDown = (event: KeyboardEvent) => {
      const context: ShortcutContext = {
        isInputFocused: event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement,
        activeApp: this.getActiveApp(),
        activeComponent: this.getActiveComponent(),
        activeWindow: this.getActiveWindow()
      };

      // Don't handle shortcuts when typing in input fields (except global ones)
      if (context.isInputFocused) {
        const globalShortcuts = this.getShortcutsByContext({ ...context, isInputFocused: false });
        const matchingGlobal = this.findMatchingShortcut(event, globalShortcuts);
        if (matchingGlobal) {
          if (matchingGlobal.preventDefault) {
            event.preventDefault();
          }
          matchingGlobal.action();
          return;
        }
        return;
      }

      // Find matching shortcut using optimized key map
      const eventKey = this.buildKeyString(event);
      const normalizedKey = this.normalizeKey(eventKey);
      const shortcutsForKey = this.keyMap.get(normalizedKey) || [];
      
      const availableShortcuts = shortcutsForKey.filter(shortcut => {
        if (!shortcut.enabled) return false;
        if (shortcut.context === 'global') return true;
        if (shortcut.context === 'app' && shortcut.appId === context.activeApp) return true;
        if (shortcut.context === 'component' && shortcut.appId === context.activeComponent) return true;
        return false;
      });

      const matchingShortcut = availableShortcuts.sort((a, b) => (b.priority || 0) - (a.priority || 0))[0];

      if (matchingShortcut) {
        if (matchingShortcut.preventDefault) {
          event.preventDefault();
        }
        matchingShortcut.action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    this.eventListeners.set('keydown', () => {
      window.removeEventListener('keydown', handleKeyDown);
    });
  }

  // Find matching shortcut for a key event (legacy method)
  private findMatchingShortcut(event: KeyboardEvent, shortcuts: ShortcutDefinition[]): ShortcutDefinition | null {
    const eventKey = this.buildKeyString(event);
    
    return shortcuts
      .filter(shortcut => shortcut.enabled)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .find(shortcut => this.normalizeKey(shortcut.key) === this.normalizeKey(eventKey)) || null;
  }

  // Build key string from event
  private buildKeyString(event: KeyboardEvent): string {
    const modifiers: string[] = [];
    
    if (event.ctrlKey || event.metaKey) modifiers.push('Ctrl');
    if (event.altKey) modifiers.push('Alt');
    if (event.shiftKey) modifiers.push('Shift');
    
    const key = event.key.toUpperCase();
    if (modifiers.length > 0) {
      return `${modifiers.join('+')}+${key}`;
    }
    return key;
  }

  // Get currently active app (enhanced)
  private getActiveApp(): string | undefined {
    // This could be enhanced to track active windows
    // For now, return undefined to allow all app shortcuts
    return undefined;
  }

  // Get currently active component (enhanced)
  private getActiveComponent(): string | undefined {
    // This could be enhanced to track active components
    return undefined;
  }

  // Get currently active window (new method)
  private getActiveWindow(): string | undefined {
    // This could be enhanced to track active windows
    return undefined;
  }

  // Cleanup event listeners
  cleanup(): void {
    this.eventListeners.forEach(cleanup => cleanup());
    this.eventListeners.clear();
    this.shortcuts.clear();
    this.keyMap.clear();
    this.conflicts = [];
    this.isInitialized = false;
  }

  // Register app-specific shortcuts
  registerAppShortcuts(appId: string, shortcuts: Omit<ShortcutDefinition, 'context' | 'appId'>[]): void {
    shortcuts.forEach(shortcut => {
      this.register({
        ...shortcut,
        context: 'app',
        appId
      });
    });
  }

  // Register component-specific shortcuts
  registerComponentShortcuts(componentId: string, shortcuts: Omit<ShortcutDefinition, 'context' | 'appId'>[]): void {
    shortcuts.forEach(shortcut => {
      this.register({
        ...shortcut,
        context: 'component',
        appId: componentId
      });
    });
  }

  // Unregister all shortcuts for an app/component
  unregisterAppShortcuts(appId: string): void {
    const shortcutsToRemove = Array.from(this.shortcuts.keys()).filter(id => {
      const shortcut = this.shortcuts.get(id);
      return shortcut && shortcut.appId === appId && !shortcut.isSystem;
    });
    
    shortcutsToRemove.forEach(id => this.unregister(id));
  }

  // Get statistics about shortcuts
  getStats(): {
    total: number;
    byCategory: Record<string, number>;
    byContext: Record<string, number>;
    conflicts: number;
    systemShortcuts: number;
  } {
    const shortcuts = this.getAllShortcuts();
    const byCategory: Record<string, number> = {};
    const byContext: Record<string, number> = {};

    shortcuts.forEach(shortcut => {
      byCategory[shortcut.category] = (byCategory[shortcut.category] || 0) + 1;
      byContext[shortcut.context || 'global'] = (byContext[shortcut.context || 'global'] || 0) + 1;
    });

    return {
      total: shortcuts.length,
      byCategory,
      byContext,
      conflicts: this.conflicts.length,
      systemShortcuts: shortcuts.filter(s => s.isSystem).length
    };
  }
}

// Export singleton instance
export const shortcutManager = new ShortcutManager();

// Hook for components to use shortcuts
export const useShortcutManager = () => {
  return {
    register: shortcutManager.register.bind(shortcutManager),
    unregister: shortcutManager.unregister.bind(shortcutManager),
    getAllShortcuts: shortcutManager.getAllShortcuts.bind(shortcutManager),
    getShortcutsByCategory: shortcutManager.getShortcutsByCategory.bind(shortcutManager),
    getShortcutsByKey: shortcutManager.getShortcutsByKey.bind(shortcutManager),
    isKeyRegistered: shortcutManager.isKeyRegistered.bind(shortcutManager),
    getConflicts: shortcutManager.getConflicts.bind(shortcutManager),
    resolveConflict: shortcutManager.resolveConflict.bind(shortcutManager),
    registerAppShortcuts: shortcutManager.registerAppShortcuts.bind(shortcutManager),
    registerComponentShortcuts: shortcutManager.registerComponentShortcuts.bind(shortcutManager),
    unregisterAppShortcuts: shortcutManager.unregisterAppShortcuts.bind(shortcutManager),
    getSearchProvider: shortcutManager.getSearchProvider.bind(shortcutManager),
    getStats: shortcutManager.getStats.bind(shortcutManager)
  };
};
import { SearchProvider, SearchResult } from '../types/search.ts';
import { createSearchResult } from './searchRegistry.ts';
import { EnterpriseLogger } from './core/logger';

class ShortcutManagerProvider implements SearchProvider {
  private logger = new EnterpriseLogger();
  
  // Replace all logging calls:
  // logInfo('message') → this.logger.info('message', { component: 'ShortcutManager', action: 'actionName' })
  // logWarn('message') → this.logger.warn('message', { component: 'ShortcutManager', action: 'actionName' })
}