// Advanced System Commands for AI-BOS
// Provides powerful command system with shortcuts and automation

export interface Command {
  id: string;
  name: string;
  description: string;
  shortcut?: string;
  category: 'window' | 'system' | 'productivity' | 'automation';
  execute: (args?: any) => void | Promise<void>;
}

export interface CommandPalette {
  id: string;
  name: string;
  commands: Command[];
  isVisible: boolean;
}

class AdvancedCommandManager {
  private commands: Map<string, Command> = new Map();
  private palettes: Map<string, CommandPalette> = new Map();
  private isInitialized = false;

  constructor() {
    this.initializeDefaultCommands();
  }

  private initializeDefaultCommands(): void {
    // Window Management Commands
    this.registerCommand({
      id: 'arrange-windows-grid',
      name: 'Arrange Windows in Grid',
      description: 'Auto-arrange open windows in grid layout',
      shortcut: 'Ctrl+Shift+G',
      category: 'window',
      execute: () => {
        (window as any).openGridLayoutManager?.();
      }
    });

    this.registerCommand({
      id: 'create-window-group',
      name: 'Create Window Group',
      description: 'Create new window group from selected windows',
      shortcut: 'Ctrl+Shift+W',
      category: 'window',
      execute: () => {
        (window as any).openWindowGroupManager?.();
      }
    });

    this.registerCommand({
      id: 'snap-all-windows',
      name: 'Snap All Windows',
      description: 'Snap all windows to grid positions',
      shortcut: 'Ctrl+Shift+S',
      category: 'window',
      execute: () => {
        // Auto-snap all windows
        const windows = document.querySelectorAll('[data-window-id]');
        windows.forEach((win, index) => {
          const x = (index % 3) * 300;
          const y = Math.floor(index / 3) * 200;
          (win as HTMLElement).style.transform = `translate(${x}px, ${y}px)`;
        });
      }
    });

    // System Commands
    this.registerCommand({
      id: 'toggle-performance-mode',
      name: 'Toggle Performance Mode',
      description: 'Switch between performance and quality modes',
      shortcut: 'Ctrl+Shift+P',
      category: 'system',
      execute: () => {
        const isPerformanceMode = localStorage.getItem('aibos-performance-mode') === 'true';
        localStorage.setItem('aibos-performance-mode', (!isPerformanceMode).toString());
        window.location.reload();
      }
    });

    this.registerCommand({
      id: 'clear-cache',
      name: 'Clear Cache',
      description: 'Clear all cached data and reset state',
      shortcut: 'Ctrl+Shift+C',
      category: 'system',
      execute: () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
      }
    });

    // Productivity Commands
    this.registerCommand({
      id: 'focus-mode',
      name: 'Focus Mode',
      description: 'Hide all windows except active',
      shortcut: 'Ctrl+Shift+F',
      category: 'productivity',
      execute: () => {
        const windows = document.querySelectorAll('[data-window-id]');
        windows.forEach((win) => {
          (win as HTMLElement).style.opacity = '0.1';
        });
        // Restore after 5 seconds
        setTimeout(() => {
          windows.forEach((win) => {
            (win as HTMLElement).style.opacity = '1';
          });
        }, 5000);
      }
    });

    this.registerCommand({
      id: 'workspace-save',
      name: 'Save Workspace',
      description: 'Save current window arrangement',
      shortcut: 'Ctrl+Shift+W',
      category: 'productivity',
      execute: () => {
        const workspace = {
          windows: Array.from(document.querySelectorAll('[data-window-id]')).map(win => ({
            id: (win as HTMLElement).dataset['windowId'],
            position: (win as HTMLElement).style.transform
          })),
          timestamp: Date.now()
        };
        localStorage.setItem('aibos-workspace', JSON.stringify(workspace));
      }
    });

    this.registerCommand({
      id: 'workspace-restore',
      name: 'Restore Workspace',
      description: 'Restore saved window arrangement',
      shortcut: 'Ctrl+Shift+R',
      category: 'productivity',
      execute: () => {
        const saved = localStorage.getItem('aibos-workspace');
        if (saved) {
          const workspace = JSON.parse(saved);
          workspace.windows.forEach((win: any) => {
            const element = document.querySelector(`[data-window-id="${win.id}"]`);
            if (element) {
              (element as HTMLElement).style.transform = win.position;
            }
          });
        }
      }
    });

    // Automation Commands
    this.registerCommand({
      id: 'auto-organize',
      name: 'Auto Organize',
      description: 'Automatically organize windows by type',
      shortcut: 'Ctrl+Shift+O',
      category: 'automation',
      execute: () => {
        const windows = Array.from(document.querySelectorAll('[data-window-id]'));
        const productivity = windows.filter(w => 
          (w as HTMLElement).textContent?.includes('Notepad') || 
          (w as HTMLElement).textContent?.includes('Files')
        );
        const entertainment = windows.filter(w => 
          (w as HTMLElement).textContent?.includes('iPod')
        );
        
        // Arrange productivity apps on left
        productivity.forEach((win, i) => {
          (win as HTMLElement).style.transform = `translate(${i * 300}px, 0px)`;
        });
        
        // Arrange entertainment on right
        entertainment.forEach((win, i) => {
          (win as HTMLElement).style.transform = `translate(${800 + i * 300}px, 0px)`;
        });
      }
    });
  }

  registerCommand(command: Command): void {
    this.commands.set(command.id, command);
  }

  getCommand(id: string): Command | undefined {
    return this.commands.get(id);
  }

  getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  getCommandsByCategory(category: string): Command[] {
    return this.getAllCommands().filter(cmd => cmd.category === category);
  }

  executeCommand(id: string, args?: any): void {
    const command = this.commands.get(id);
    if (command) {
      try {
        command.execute(args);
      } catch (error) {
        console.error(`Failed to execute command ${id}:`, error);
      }
    }
  }

  // Keyboard shortcuts
  initializeShortcuts(): void {
    if (typeof window === 'undefined') return;

    document.addEventListener('keydown', (e) => {
      const commands = this.getAllCommands();
      const pressed = this.getKeyCombo(e);
      
      for (const command of commands) {
        if (command.shortcut && this.matchesShortcut(pressed, command.shortcut)) {
          e.preventDefault();
          this.executeCommand(command.id);
          break;
        }
      }
    });
  }

  private getKeyCombo(e: KeyboardEvent): string {
    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    if (e.key !== 'Control' && e.key !== 'Shift' && e.key !== 'Alt') {
      parts.push(e.key.toUpperCase());
    }
    return parts.join('+');
  }

  private matchesShortcut(pressed: string, shortcut: string): boolean {
    return pressed === shortcut;
  }

  // Command palettes
  createPalette(id: string, name: string, commands: Command[]): CommandPalette {
    const palette: CommandPalette = {
      id,
      name,
      commands,
      isVisible: false
    };
    this.palettes.set(id, palette);
    return palette;
  }

  getPalette(id: string): CommandPalette | undefined {
    return this.palettes.get(id);
  }

  showPalette(id: string): void {
    const palette = this.palettes.get(id);
    if (palette) {
      palette.isVisible = true;
    }
  }

  hidePalette(id: string): void {
    const palette = this.palettes.get(id);
    if (palette) {
      palette.isVisible = false;
    }
  }

  initialize(): void {
    if (this.isInitialized) return;
    this.initializeShortcuts();
    this.isInitialized = true;
    console.log('Advanced Command Manager initialized');
  }
}

export const advancedCommandManager = new AdvancedCommandManager(); 