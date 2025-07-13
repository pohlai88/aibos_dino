import { SearchProvider, SearchResult } from '../types/search.ts';
import { systemIntegration } from './systemIntegration.ts';
import { createSearchResult } from './searchRegistry.ts';
import { EnterpriseLogger } from './core/logger';

class SystemCommandsProvider implements SearchProvider {
  private logger = new EnterpriseLogger();
  
  // Replace all logging calls:
  // logInfo() → this.logger.info('message', { component: 'SystemCommands', action: 'actionName' })
  // logWarn() → this.logger.warn('message', { component: 'SystemCommands', action: 'actionName' })
  // logError() → this.logger.error('message', { component: 'SystemCommands', action: 'actionName' })
  
  // ... existing code ...
}

// Get command statistics
  getStats(): {
    total: number;
    byCategory: Record<SystemCommandCategory, number>;
    byStatus: Record<SystemCommandStatus, number>;
    byPermission: Record<SystemCommandPermission, number>;
    systemCommands: number;
    hiddenCommands: number;
    recentlyUsed: number;
  } {
    const commands = this.getAll({ includeHidden: true });
    const byCategory: Record<SystemCommandCategory, number> = {} as Record<SystemCommandCategory, number>;
    const byStatus: Record<SystemCommandStatus, number> = {} as Record<SystemCommandStatus, number>;
    const byPermission: Record<SystemCommandPermission, number> = {} as Record<SystemCommandPermission, number>;

    // Initialize counters
    this.getCategories().forEach(category => byCategory[category] = 0);
    ['available', 'disabled', 'loading', 'error', 'maintenance'].forEach(status => 
      byStatus[status as SystemCommandStatus] = 0
    );
    this.getPermissions().forEach(permission => byPermission[permission] = 0);

    // Count commands
    commands.forEach(cmd => {
      byCategory[cmd.category]++;
      byStatus[cmd.status]++;
      cmd.permissions.forEach(permission => byPermission[permission]++);
    });

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    return {
      total: commands.length,
      byCategory,
      byStatus,
      byPermission,
      systemCommands: commands.filter(cmd => cmd.metadata.isSystem).length,
      hiddenCommands: commands.filter(cmd => cmd.metadata.isHidden).length,
      recentlyUsed: commands.filter(cmd => cmd.metadata.lastUpdated > weekAgo).length
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
        category: 'navigation',
        status: 'available',
        metadata: {
          version: '1.0.0',
          author: 'System',
          lastUpdated: new Date(),
          usageCount: 0,
          tags: ['search', 'spotlight', 'find'],
          isSystem: true,
          isHidden: false
        },
        permissions: ['basic'],
        keywords: ['search', 'find', 'spotlight', 'quick'],
        helpText: 'Quick access to search functionality across the entire system',
        examples: ['Type "calc" to find calculator', 'Type "files" to open file manager']
      },
      {
        id: 'start-menu',
        title: 'Open Start Menu',
        description: 'Access applications and settings',
        icon: '🏠',
        shortcut: 'Ctrl+Escape',
        action: toggleStartMenu,
        category: 'navigation',
        status: 'available',
        metadata: {
          version: '1.0.0',
          author: 'System',
          lastUpdated: new Date(),
          usageCount: 0,
          tags: ['start', 'menu', 'applications'],
          isSystem: true,
          isHidden: false
        },
        permissions: ['basic'],
        keywords: ['start', 'menu', 'apps', 'applications'],
        helpText: 'Access the main application menu and system settings',
        examples: ['Browse installed applications', 'Access system settings']
      },
      {
        id: 'user-menu',
        title: 'User Menu',
        description: 'Access user settings and account',
        icon: '👤',
        shortcut: 'Ctrl+U',
        action: toggleUserMenu,
        category: 'user',
        status: 'available',
        metadata: {
          version: '1.0.0',
          author: 'System',
          lastUpdated: new Date(),
          usageCount: 0,
          tags: ['user', 'profile', 'account'],
          isSystem: true,
          isHidden: false
        },
        permissions: ['basic'],
        keywords: ['user', 'profile', 'account', 'settings'],
        helpText: 'Access user profile, settings, and account information',
        examples: ['Change user settings', 'View account information']
      },
      {
        id: 'shortcut-help',
        title: 'Keyboard Shortcuts',
        description: 'View all available keyboard shortcuts',
        icon: '⌨️',
        shortcut: 'F1',
        action: openShortcutHelp,
        category: 'help',
        status: 'available',
        metadata: {
          version: '1.0.0',
          author: 'System',
          lastUpdated: new Date(),
          usageCount: 0,
          tags: ['help', 'shortcuts', 'keyboard'],
          isSystem: true,
          isHidden: false
        },
        permissions: ['basic'],
        keywords: ['help', 'shortcuts', 'keyboard', 'keys'],
        helpText: 'Display comprehensive list of all available keyboard shortcuts',
        examples: ['Learn new shortcuts', 'Find specific commands']
      },
      {
        id: 'home',
        title: 'Go to Home',
        description: 'Navigate to the home screen',
        icon: '🏠',
        shortcut: 'Ctrl+H',
        action: navigateHome,
        category: 'navigation',
        status: 'available',
        metadata: {
          version: '1.0.0',
          author: 'System',
          lastUpdated: new Date(),
          usageCount: 0,
          tags: ['home', 'navigate', 'desktop'],
          isSystem: true,
          isHidden: false
        },
        permissions: ['basic'],
        keywords: ['home', 'navigate', 'desktop', 'main'],
        helpText: 'Return to the main desktop/home screen',
        examples: ['Return to desktop', 'Close all windows']
      },
      {
        id: 'system-info',
        title: 'System Information',
        description: 'View detailed system information and status',
        icon: 'ℹ️',
        shortcut: 'Ctrl+I',
        action: async () => {
          logInfo('System Information:');
          logInfo('- OS: AI-BOS Hybrid Windows');
          logInfo('- Version: 1.0.0');
          logInfo('- Architecture: Web-based');
          logInfo('- Memory: Available');
          logInfo('- Storage: Available');
        },
        category: 'system',
        status: 'available',
        metadata: {
          version: '1.0.0',
          author: 'System',
          lastUpdated: new Date(),
          usageCount: 0,
          tags: ['system', 'info', 'status'],
          isSystem: true,
          isHidden: false
        },
        permissions: ['basic'],
        keywords: ['system', 'info', 'status', 'details'],
        helpText: 'Display comprehensive system information and status',
        examples: ['Check system status', 'View system details']
      },
      {
        id: 'performance-monitor',
        title: 'Performance Monitor',
        description: 'Monitor system performance and resource usage',
        icon: '📊',
        shortcut: 'Ctrl+P',
        action: async () => {
          logInfo('Performance Monitor:');
          logInfo('- CPU Usage: 45%');
          logInfo('- Memory Usage: 62%');
          logInfo('- Network: Online');
          logInfo('- Battery: 87%');
        },
        category: 'performance',
        status: 'available',
        metadata: {
          version: '1.0.0',
          author: 'System',
          lastUpdated: new Date(),
          usageCount: 0,
          tags: ['performance', 'monitor', 'resources'],
          isSystem: true,
          isHidden: false
        },
        permissions: ['basic'],
        keywords: ['performance', 'monitor', 'resources', 'usage'],
        helpText: 'Monitor system performance and resource utilization',
        examples: ['Check CPU usage', 'Monitor memory usage']
      },
      {
        id: 'multi-monitor',
        title: 'Multi-Monitor Layout',
        description: 'Manage and configure multiple displays',
        icon: '🖥️',
        shortcut: 'Ctrl+M',
        action: () => {
          if (typeof window !== 'undefined' && (window as any).openMultiMonitorLayout) {
            (window as any).openMultiMonitorLayout();
          }
        },
        category: 'system',
        status: 'available',
        metadata: {
          version: '1.0.0',
          author: 'System',
          lastUpdated: new Date(),
          usageCount: 0,
          tags: ['monitor', 'display', 'multi', 'layout'],
          isSystem: true,
          isHidden: false
        },
        permissions: ['basic'],
        keywords: ['monitor', 'display', 'multi', 'layout', 'screens'],
        helpText: 'Open multi-monitor layout management interface',
        examples: ['Configure display settings', 'Manage window distribution']
      }
    ];

    defaultCommands.forEach(cmd => this.register(cmd));
  }
}

// Export singleton instance
export const systemCommands = new SystemCommandsService();

// Initialize default commands
systemCommands.initializeDefaultCommands();

// Utility function to execute command
export const executeSystemCommand = (id: string, options?: Parameters<typeof systemCommands.execute>[1]): Promise<boolean> => {
  return systemCommands.execute(id, options);
};

// Utility function to search commands
export const searchSystemCommands = (query: string, options?: Parameters<typeof systemCommands.getAll>[0]): SystemCommand[] => {
  return systemCommands.getAll(options).filter(cmd => 
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.description.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );
};