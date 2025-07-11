import { SearchProvider } from '../types/search.ts';
import { createCommandSearchResult, createSystemSearchResult } from './searchRegistry.ts';
import { useUIState } from '../store/uiState.ts';

// System command interface
export interface SystemCommand {
  id: string;
  title: string;
  description: string;
  icon?: string;
  shortcut?: string;
  action: () => void | Promise<void>;
  category: string;
}

// System commands service
class SystemCommandsService {
  private commands = new Map<string, SystemCommand>();

  register(command: SystemCommand): void {
    this.commands.set(command.id, command);
  }

  unregister(id: string): void {
    this.commands.delete(id);
  }

  get(id: string): SystemCommand | undefined {
    return this.commands.get(id);
  }

  getAll(): SystemCommand[] {
    return Array.from(this.commands.values());
  }

  getByCategory(category: string): SystemCommand[] {
    return this.getAll().filter(cmd => cmd.category === category);
  }

  // Create search provider for system commands
  createSearchProvider(): SearchProvider {
    return {
      id: 'system-commands',
      name: 'System Commands',
      description: 'System operations and shortcuts',
      priority: 4,
      search: async (query: string) => {
        const queryLower = query.toLowerCase();
        
        return this.getAll()
          .filter(cmd => 
            cmd.title.toLowerCase().includes(queryLower) ||
            cmd.description.toLowerCase().includes(queryLower) ||
            cmd.category.toLowerCase().includes(queryLower) ||
            (cmd.shortcut && cmd.shortcut.toLowerCase().includes(queryLower))
          )
          .map(cmd => createCommandSearchResult(
            cmd.id,
            cmd.title,
            cmd.id,
            cmd.action,
            cmd.shortcut
          ));
      }
    };
  }

  // Initialize default system commands
  initializeDefaultCommands(): void {
    const { 
      toggleSpotlight, 
      toggleStartMenu, 
      toggleUserMenu, 
      openShortcutHelp,
      navigateHome 
    } = useUIState.getState();

    const defaultCommands: SystemCommand[] = [
      {
        id: 'spotlight',
        title: 'Open Spotlight Search',
        description: 'Search apps, files, and commands',
        icon: '🔍',
        shortcut: 'Ctrl+Space',
        action: toggleSpotlight,
        category: 'Navigation'
      },
      {
        id: 'start-menu',
        title: 'Open Start Menu',
        description: 'Access applications and settings',
        icon: '🏠',
        shortcut: 'Ctrl+Escape',
        action: toggleStartMenu,
        category: 'Navigation'
      },
      {
        id: 'user-menu',
        title: 'User Menu',
        description: 'Access user settings and account',
        icon: '👤',
        shortcut: 'Ctrl+U',
        action: toggleUserMenu,
        category: 'User'
      },
      {
        id: 'shortcut-help',
        title: 'Keyboard Shortcuts',
        description: 'View all available keyboard shortcuts',
        icon: '⌨️',
        shortcut: 'F1',
        action: openShortcutHelp,
        category: 'Help'
      },
      {
        id: 'home',
        title: 'Go to Home',
        description: 'Navigate to the home screen',
        icon: '🏠',
        shortcut: 'Ctrl+H',
        action: navigateHome,
        category: 'Navigation'
      }
    ];

    defaultCommands.forEach(cmd => this.register(cmd));
  }
}

// Export singleton instance
export const systemCommands = new SystemCommandsService();

// Initialize default commands
systemCommands.initializeDefaultCommands(); 