import { SearchProvider } from '../types/search.ts';
import { createCommandSearchResult } from './searchRegistry.ts';
import { useUIState } from '../store/uiState.ts';

// System command categories
export type SystemCommandCategory = 
  | 'navigation' 
  | 'system' 
  | 'user' 
  | 'help' 
  | 'development' 
  | 'utilities' 
  | 'security' 
  | 'performance' 
  | 'network' 
  | 'maintenance';

// System command permissions
export type SystemCommandPermission = 
  | 'basic' 
  | 'admin' 
  | 'system' 
  | 'developer' 
  | 'user';

// System command status
export type SystemCommandStatus = 'available' | 'disabled' | 'loading' | 'error' | 'maintenance';

// System command metadata
export interface SystemCommandMetadata {
  version: string;
  author: string;
  lastUpdated: Date;
  usageCount: number;
  tags: string[];
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  isSystem?: boolean;
  isHidden?: boolean;
  dependencies?: string[];
  estimatedTime?: number; // in milliseconds
  riskLevel?: 'low' | 'medium' | 'high';
}

// Enhanced system command interface
export interface SystemCommand {
  id: string;
  title: string;
  description: string;
  icon?: string;
  shortcut?: string;
  action: () => void | Promise<void>;
  category: SystemCommandCategory;
  status: SystemCommandStatus;
  metadata: SystemCommandMetadata;
  permissions: SystemCommandPermission[];
  keywords?: string[];
  helpText?: string;
  examples?: string[];
}

// System commands service with enhanced functionality
class SystemCommandsService {
  private commands = new Map<string, SystemCommand>();
  private categories = new Map<SystemCommandCategory, string>();
  private permissions = new Map<SystemCommandPermission, string>();
  private eventListeners = new Map<string, Set<(command: SystemCommand) => void>>();

  constructor() {
    this.initializeCategories();
    this.initializePermissions();
  }

  private initializeCategories(): void {
    this.categories.set('navigation', '🧭 Navigation');
    this.categories.set('system', '⚙️ System');
    this.categories.set('user', '👤 User');
    this.categories.set('help', '❓ Help');
    this.categories.set('development', '💻 Development');
    this.categories.set('utilities', '🔧 Utilities');
    this.categories.set('security', '🔒 Security');
    this.categories.set('performance', '⚡ Performance');
    this.categories.set('network', '🌐 Network');
    this.categories.set('maintenance', '🔧 Maintenance');
  }

  private initializePermissions(): void {
    this.permissions.set('basic', 'Basic Access');
    this.permissions.set('admin', 'Administrative Access');
    this.permissions.set('system', 'System Level Access');
    this.permissions.set('developer', 'Developer Access');
    this.permissions.set('user', 'User Level Access');
  }

  // Register a new system command
  register(command: SystemCommand): void {
    // Validate required fields
    if (!command.id || !command.title || !command.action) {
      throw new Error('System command registration failed: missing required fields');
    }

    // Check for duplicate IDs
    if (this.commands.has(command.id)) {
      console.warn(`System command with ID '${command.id}' already exists. Overwriting...`);
    }

    // Set default values
    const commandWithDefaults: SystemCommand = {
      id: command.id,
      title: command.title,
      description: command.description,
      icon: command.icon,
      shortcut: command.shortcut,
      action: command.action,
      category: command.category,
      status: command.status || 'available',
      metadata: {
        version: command.metadata?.version || '1.0.0',
        author: command.metadata?.author || 'System',
        lastUpdated: command.metadata?.lastUpdated || new Date(),
        usageCount: command.metadata?.usageCount || 0,
        tags: command.metadata?.tags || [],
        requiresConfirmation: command.metadata?.requiresConfirmation,
        confirmationMessage: command.metadata?.confirmationMessage,
        isSystem: command.metadata?.isSystem ?? true,
        isHidden: command.metadata?.isHidden ?? false,
        dependencies: command.metadata?.dependencies,
        estimatedTime: command.metadata?.estimatedTime,
        riskLevel: command.metadata?.riskLevel
      },
      permissions: command.permissions || ['basic'],
      keywords: command.keywords || [],
      helpText: command.helpText || '',
      examples: command.examples || []
    };

    this.commands.set(command.id, commandWithDefaults);
    this.emitEvent('commandRegistered', commandWithDefaults);
  }

  // Unregister a system command
  unregister(id: string): boolean {
    const command = this.commands.get(id);
    if (command) {
      this.commands.delete(id);
      this.emitEvent('commandUnregistered', command);
      return true;
    }
    return false;
  }

  // Get command by ID
  get(id: string): SystemCommand | undefined {
    return this.commands.get(id);
  }

  // Get all commands (with optional filtering)
  getAll(options?: {
    includeHidden?: boolean;
    category?: SystemCommandCategory;
    status?: SystemCommandStatus;
    permission?: SystemCommandPermission;
  }): SystemCommand[] {
    let commands = Array.from(this.commands.values());

    if (options) {
      if (!options.includeHidden) {
        commands = commands.filter(cmd => !cmd.metadata.isHidden);
      }
      if (options.category) {
        commands = commands.filter(cmd => cmd.category === options.category);
      }
      if (options.status) {
        commands = commands.filter(cmd => cmd.status === options.status);
      }
      if (options.permission) {
        commands = commands.filter(cmd => cmd.permissions.includes(options.permission!));
      }
    }

    return commands.sort((a, b) => a.title.localeCompare(b.title));
  }

  // Get commands by category
  getByCategory(category: SystemCommandCategory): SystemCommand[] {
    return this.getAll().filter(cmd => cmd.category === category);
  }

  // Get commands by permission
  getByPermission(permission: SystemCommandPermission): SystemCommand[] {
    return this.getAll().filter(cmd => cmd.permissions.includes(permission));
  }

  // Get recently used commands
  getRecentlyUsed(limit: number = 10): SystemCommand[] {
    return this.getAll()
      .filter(cmd => cmd.metadata.usageCount > 0)
      .sort((a, b) => b.metadata.usageCount - a.metadata.usageCount)
      .slice(0, limit);
  }

  // Execute a system command
  async execute(id: string, options?: {
    requireConfirmation?: boolean;
    userPermission?: SystemCommandPermission;
  }): Promise<boolean> {
    const command = this.get(id);
    if (!command) {
      console.error(`System command '${id}' not found`);
      return false;
    }

    if (command.status !== 'available') {
      console.warn(`System command '${id}' is not available (status: ${command.status})`);
      return false;
    }

    // Check permissions
    if (options?.userPermission && !command.permissions.includes(options.userPermission)) {
      console.error(`Insufficient permissions for command '${id}'`);
      return false;
    }

    // Check if confirmation is required
    if (command.metadata.requiresConfirmation || options?.requireConfirmation) {
      const message = command.metadata.confirmationMessage || `Execute ${command.title}?`;
      if (!confirm(message)) {
        return false;
      }
    }

    try {
      // Update usage count
      command.metadata.usageCount++;
      command.metadata.lastUpdated = new Date();
      command.status = 'loading';

      // Execute the command
      await command.action();

      command.status = 'available';
      this.emitEvent('commandExecuted', command);
      return true;
    } catch (error) {
      console.error(`Failed to execute system command '${id}':`, error);
      command.status = 'error';
      this.emitEvent('commandExecutionFailed', command);
      return false;
    }
  }

  // Update command status
  updateStatus(id: string, status: SystemCommandStatus): boolean {
    const command = this.get(id);
    if (command) {
      command.status = status;
      this.emitEvent('commandStatusChanged', command);
      return true;
    }
    return false;
  }

  // Update command metadata
  updateMetadata(id: string, metadata: Partial<SystemCommandMetadata>): boolean {
    const command = this.get(id);
    if (command) {
      command.metadata = { ...command.metadata, ...metadata };
      this.emitEvent('commandMetadataUpdated', command);
      return true;
    }
    return false;
  }

  // Get category display name
  getCategoryName(category: SystemCommandCategory): string {
    return this.categories.get(category) || category;
  }

  // Get permission display name
  getPermissionName(permission: SystemCommandPermission): string {
    return this.permissions.get(permission) || permission;
  }

  // Get all categories
  getCategories(): SystemCommandCategory[] {
    return Array.from(this.categories.keys());
  }

  // Get all permissions
  getPermissions(): SystemCommandPermission[] {
    return Array.from(this.permissions.keys());
  }

  // Event system for command lifecycle
  on(event: string, callback: (command: SystemCommand) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: string, callback: (command: SystemCommand) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emitEvent(event: string, command: SystemCommand): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(command));
    }
  }

  // Create enhanced search provider for system commands
  createSearchProvider(): SearchProvider {
    return {
      id: 'system-commands',
      name: 'System Commands',
      description: 'System operations and shortcuts',
      priority: 4,
      search: async (query: string, limit?: number) => {
        const queryLower = query.toLowerCase();
        return this.getAll()
          .filter(cmd => 
            cmd.title.toLowerCase().includes(queryLower) ||
            cmd.description.toLowerCase().includes(queryLower) ||
            cmd.category.toLowerCase().includes(queryLower) ||
            (cmd.shortcut && cmd.shortcut.toLowerCase().includes(queryLower)) ||
            cmd.metadata.tags.some(tag => tag.toLowerCase().includes(queryLower)) ||
            cmd.keywords?.some(keyword => keyword.toLowerCase().includes(queryLower))
          )
          .slice(0, limit || 10)
          .map(cmd => createCommandSearchResult(
            cmd.id,
            cmd.title,
            cmd.id,
            async () => { await this.execute(cmd.id); },
            cmd.shortcut
          ));
      },
      getQuickAccess: async (limit?: number) => {
        // Get frequently used system commands for quick access
        const frequentlyUsed = ['spotlight', 'start-menu', 'shortcut-help', 'home'];
        const quickCommands = frequentlyUsed
          .map(id => this.get(id))
          .filter(cmd => cmd && cmd.status === 'available')
          .slice(0, limit || 4);
        
        return quickCommands.map(cmd => createCommandSearchResult(
          cmd!.id,
          cmd!.title,
          cmd!.id,
          async () => { await this.execute(cmd!.id); },
          cmd!.shortcut
        ));
      }
    };
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
          console.log('System Information:');
          console.log('- OS: AI-BOS Hybrid Windows');
          console.log('- Version: 1.0.0');
          console.log('- Architecture: Web-based');
          console.log('- Memory: Available');
          console.log('- Storage: Available');
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
          console.log('Performance Monitor:');
          console.log('- CPU Usage: 45%');
          console.log('- Memory Usage: 62%');
          console.log('- Network: Online');
          console.log('- Battery: 87%');
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