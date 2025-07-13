// Enhanced Context Menu Service with OS Integration
import { systemIntegration } from './systemIntegration.ts';
import { FileAssociationService, FileAssociation } from './fileAssociations.ts';
import { EnterpriseLogger } from './core/logger.ts';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  action: () => void | Promise<void>;
  separator?: boolean;
  submenu?: ContextMenuItem[];
  enabled?: boolean;
  visible?: boolean;
}

export interface ContextMenuConfig {
  target?: HTMLElement;
  items: ContextMenuItem[];
  position?: { x: number; y: number };
  theme?: 'light' | 'dark' | 'auto';
}

class ContextMenuService {
  private logger = new EnterpriseLogger();
  private activeMenu: HTMLElement | null = null;
  private _isNativeSupported = false;

  initialize(): void {
    try {
      this.checkNativeSupport();
      this.setupGlobalListeners();
      this.logger.info('Context menu service initialized', {
        component: 'ContextMenuService',
        action: 'initialize'
      });
    } catch (error) {
      this.logger.error('Failed to initialize context menu service', {
        component: 'ContextMenuService',
        action: 'initialize',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  private checkNativeSupport(): void {
    this._isNativeSupported = 'contextMenu' in navigator || 'registerProtocolHandler' in navigator;
  }

  private setupGlobalListeners(): void {
    document.addEventListener('contextmenu', this.handleGlobalContextMenu.bind(this));
    document.addEventListener('click', this.closeActiveMenu.bind(this));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeMenu) {
        this.closeActiveMenu();
      }
    });
  }

  private async handleGlobalContextMenu(event: MouseEvent): Promise<void> {
    const target = event.target as HTMLElement;
    const menuConfig = this.getContextMenuForElement(target);
    if (menuConfig && menuConfig.items && menuConfig.items.length > 0) {
      event.preventDefault();
      await this.showContextMenu({
        ...menuConfig,
        position: { x: event.clientX, y: event.clientY },
        items: menuConfig.items
      });
    }
  }

  private getContextMenuForElement(element: HTMLElement): Partial<ContextMenuConfig> | null {
    if (element.closest('[data-file-item]')) {
      const fileItem = element.closest('[data-file-item]') as HTMLElement;
      const filePath = fileItem.dataset['filePath'];
      const fileName = fileItem.dataset['fileName'];
      const isDirectory = fileItem.dataset['isDirectory'] === 'true';
      return {
        items: this.getFileContextMenuItems(filePath!, fileName!, isDirectory)
      };
    }

    if (element.closest('[data-desktop-area]')) {
      return {
        items: this.getDesktopContextMenuItems()
      };
    }

    if (element.closest('[data-window-titlebar]')) {
      const windowId = element.closest('[data-window]')?.getAttribute('data-window-id');
      return {
        items: this.getWindowContextMenuItems(windowId!)
      };
    }

    return null;
  }

  private getFileContextMenuItems(filePath: string, _fileName: string, isDirectory: boolean): ContextMenuItem[] {
    const items: ContextMenuItem[] = [
      {
        id: 'open',
        label: 'Open',
        icon: '📂',
        action: () => this.openFile(filePath)
      },
      {
        id: 'open-with',
        label: 'Open with...',
        icon: '🔧',
        submenu: this.getOpenWithSubmenu(filePath),
        action: () => {}
      },
      {
        id: 'separator-1',
        label: '',
        separator: true,
        action: () => {}
      },
      {
        id: 'copy',
        label: 'Copy',
        icon: '📋',
        shortcut: 'Ctrl+C',
        action: () => this.copyFile(filePath)
      },
      {
        id: 'cut',
        label: 'Cut',
        icon: '✂️',
        shortcut: 'Ctrl+X',
        action: () => this.cutFile(filePath)
      },
      {
        id: 'paste',
        label: 'Paste',
        icon: '📄',
        shortcut: 'Ctrl+V',
        action: () => this.pasteFile(filePath),
        enabled: this.hasClipboardContent()
      },
      {
        id: 'separator-2',
        label: '',
        separator: true,
        action: () => {}
      },
      {
        id: 'rename',
        label: 'Rename',
        icon: '✏️',
        shortcut: 'F2',
        action: () => this.renameFile(filePath)
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: '🗑️',
        shortcut: 'Delete',
        action: () => this.deleteFile(filePath)
      },
      {
        id: 'separator-3',
        label: '',
        separator: true,
        action: () => {}
      },
      {
        id: 'properties',
        label: 'Properties',
        icon: '⚙️',
        shortcut: 'Alt+Enter',
        action: () => this.showProperties(filePath)
      }
    ];

    if (isDirectory) {
      items.splice(2, 0, {
        id: 'open-terminal',
        label: 'Open in Terminal',
        icon: '💻',
        action: () => this.openTerminal(filePath)
      });
    }

    return items;
  }

  private getOpenWithSubmenu(filePath: string): ContextMenuItem[] {
    const extension = '.' + filePath.split('.').pop()?.toLowerCase();
    const fileAssociationService = new FileAssociationService(this.logger);
    const associations = fileAssociationService.getRegisteredAssociations();
    // Filter relevant apps for the extension
    associations.filter((a: FileAssociation) => a.extension === extension);

    return [
      {
        id: 'open-aibos',
        label: 'AI-BOS (Default)',
        icon: '🤖',
        action: () => this.openWithAIBOS(filePath)
      },
      {
        id: 'separator',
        label: '',
        separator: true,
        action: () => {}
      },
      {
        id: 'open-notepad',
        label: 'Notepad',
        icon: '📝',
        action: () => this.openWithApp(filePath, 'notepad')
      },
      {
        id: 'open-system',
        label: 'System Default',
        icon: '🖥️',
        action: () => this.openWithSystemDefault(filePath)
      },
      {
        id: 'choose-app',
        label: 'Choose Application...',
        icon: '📁',
        action: () => this.chooseApplication(filePath)
      }
    ];
  }

  private getDesktopContextMenuItems(): ContextMenuItem[] {
    return [
      {
        id: 'new-folder',
        label: 'New Folder',
        icon: '📁',
        action: () => this.createNewFolder()
      },
      {
        id: 'new-file',
        label: 'New File',
        icon: '📄',
        submenu: [
          {
            id: 'new-text',
            label: 'Text Document',
            icon: '📝',
            action: () => this.createNewFile('txt')
          },
          {
            id: 'new-markdown',
            label: 'Markdown Document',
            icon: '📋',
            action: () => this.createNewFile('md')
          },
          {
            id: 'new-json',
            label: 'JSON File',
            icon: '🔧',
            action: () => this.createNewFile('json')
          }
        ],
        action: () => {}
      },
      {
        id: 'separator-1',
        label: '',
        separator: true,
        action: () => {}
      },
      {
        id: 'paste',
        label: 'Paste',
        icon: '📄',
        shortcut: 'Ctrl+V',
        action: () => this.pasteToDesktop(),
        enabled: this.hasClipboardContent()
      },
      {
        id: 'separator-2',
        label: '',
        separator: true,
        action: () => {}
      },
      {
        id: 'refresh',
        label: 'Refresh',
        icon: '🔄',
        shortcut: 'F5',
        action: () => this.refreshDesktop()
      },
      {
        id: 'properties',
        label: 'Properties',
        icon: '⚙️',
        action: () => this.showDesktopProperties()
      }
    ];
  }

  private getWindowContextMenuItems(windowId: string): ContextMenuItem[] {
    return [
      {
        id: 'restore',
        label: 'Restore',
        icon: '🔲',
        action: () => systemIntegration.restoreWindow(windowId)
      },
      {
        id: 'minimize',
        label: 'Minimize',
        icon: '➖',
        action: () => systemIntegration.minimizeWindow(windowId)
      },
      {
        id: 'maximize',
        label: 'Maximize',
        icon: '⬜',
        action: () => systemIntegration.maximizeWindow(windowId)
      },
      {
        id: 'separator',
        label: '',
        separator: true,
        action: () => {}
      },
      {
        id: 'close',
        label: 'Close',
        icon: '❌',
        shortcut: 'Alt+F4',
        action: () => systemIntegration.closeWindow(windowId)
      }
    ];
  }

  async showContextMenu(config: ContextMenuConfig): Promise<void> {
    try {
      this.closeActiveMenu();
      await this.showCustomContextMenu(config);
    } catch (error) {
      this.logger.error('Failed to show context menu', {
        component: 'ContextMenuService',
        action: 'showContextMenu',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  private showCustomContextMenu(config: ContextMenuConfig): void {
    const menu = this.createCustomMenuElement(config);
    document.body.appendChild(menu);
    this.activeMenu = menu;
    this.positionMenu(menu, config.position || { x: 0, y: 0 });
    const firstItem = menu.querySelector('[role="menuitem"]:not([aria-disabled="true"])') as HTMLElement;
    firstItem?.focus();
  }

  private createCustomMenuElement(config: ContextMenuConfig): HTMLElement {
    const menu = document.createElement('div');
    menu.className = `
      fixed z-50 min-w-48 bg-white dark:bg-gray-800 
      border border-gray-200 dark:border-gray-700 
      rounded-lg shadow-lg backdrop-blur-sm
      focus:outline-none
    `;
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-orientation', 'vertical');

    config.items.forEach((item, index) => {
      const menuItem = this.createMenuItem(item, index);
      menu.appendChild(menuItem);
    });

    return menu;
  }

  private createMenuItem(item: ContextMenuItem, index: number): HTMLElement {
    if (item.separator) {
      const separator = document.createElement('div');
      separator.className = 'h-px bg-gray-200 dark:bg-gray-700 my-1';
      separator.setAttribute('role', 'separator');
      return separator;
    }

    const menuItem = document.createElement('button');
    menuItem.className = `
      w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300
      hover:bg-gray-100 dark:hover:bg-gray-700 
      focus:bg-blue-50 dark:focus:bg-blue-900/20
      focus:outline-none focus:ring-2 focus:ring-blue-500
      disabled:opacity-50 disabled:cursor-not-allowed
      flex items-center justify-between
    `;
    menuItem.setAttribute('role', 'menuitem');
    menuItem.setAttribute('tabindex', index === 0 ? '0' : '-1');
    if (item.enabled === false) {
      menuItem.disabled = true;
      menuItem.setAttribute('aria-disabled', 'true');
    }

    const content = document.createElement('div');
    content.className = 'flex items-center space-x-2';

    if (item.icon) {
      const icon = document.createElement('span');
      icon.textContent = item.icon;
      icon.className = 'text-base';
      content.appendChild(icon);
    }

    const label = document.createElement('span');
    label.textContent = item.label;
    content.appendChild(label);
    menuItem.appendChild(content);

    if (item.shortcut) {
      const shortcut = document.createElement('span');
      shortcut.textContent = item.shortcut;
      shortcut.className = 'text-xs text-gray-500 dark:text-gray-400';
      menuItem.appendChild(shortcut);
    }

    if (item.submenu) {
      const arrow = document.createElement('span');
      arrow.textContent = '▶';
      arrow.className = 'text-xs text-gray-500';
      menuItem.appendChild(arrow);
    }

    menuItem.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!item.submenu) {
        await item.action();
        this.closeActiveMenu();
      }
    });

    menuItem.addEventListener('keydown', (e) => {
      this.handleMenuKeydown(e, menuItem);
    });

    return menuItem;
  }

  private handleMenuKeydown(event: KeyboardEvent, menuItem: HTMLElement): void {
    const menu = menuItem.closest('[role="menu"]') as HTMLElement;
    const items = Array.from(menu.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])')) as HTMLElement[];
    const currentIndex = items.indexOf(menuItem);

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        const nextIndex = (currentIndex + 1) % items.length;
        items[nextIndex]?.focus();
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        const prevIndex = (currentIndex - 1 + items.length) % items.length;
        items[prevIndex]?.focus();
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        menuItem.click();
        break;
      }
      case 'Escape': {
        event.preventDefault();
        this.closeActiveMenu();
        break;
      }
    }
  }

  private positionMenu(menu: HTMLElement, position: { x: number; y: number }): void {
    const rect = menu.getBoundingClientRect();
    const viewportWidth = globalThis.innerWidth;
    const viewportHeight = globalThis.innerHeight;

    let x = position.x;
    let y = position.y;

    if (x + rect.width > viewportWidth) {
      x = viewportWidth - rect.width - 10;
    }
    if (y + rect.height > viewportHeight) {
      y = viewportHeight - rect.height - 10;
    }

    menu.style.left = `${Math.max(10, x)}px`;
    menu.style.top = `${Math.max(10, y)}px`;
  }

  private closeActiveMenu(): void {
    if (this.activeMenu) {
      this.activeMenu.remove();
      this.activeMenu = null;
    }
  }

  private async openFile(filePath: string): Promise<void> {
    await systemIntegration.openFile(filePath);
  }

  private async openWithAIBOS(filePath: string): Promise<void> {
    await systemIntegration.openFile(filePath);
  }

  private async openWithApp(filePath: string, appId: string): Promise<void> {
    await systemIntegration.openApp(appId, { filePath });
  }

  private openWithSystemDefault(filePath: string): void {
    if ('showOpenFilePicker' in window) {
      globalThis.open(filePath, '_blank');
    }
  }

  private async chooseApplication(filePath: string): Promise<void> {
    await systemIntegration.showAppChooser(filePath);
  }

  private async copyFile(filePath: string): Promise<void> {
    await systemIntegration.copyToClipboard(filePath);
  }

  private async cutFile(filePath: string): Promise<void> {
    await systemIntegration.cutToClipboard(filePath);
  }

  private async pasteFile(targetPath: string): Promise<void> {
    await systemIntegration.pasteFromClipboard(targetPath);
  }

  private hasClipboardContent(): boolean {
    return systemIntegration.hasClipboardContent();
  }

  private async renameFile(filePath: string): Promise<void> {
    await systemIntegration.renameFile(filePath);
  }

  private async deleteFile(filePath: string): Promise<void> {
    await systemIntegration.deleteFile(filePath);
  }

  private async showProperties(filePath: string): Promise<void> {
    await systemIntegration.showFileProperties(filePath);
  }

  private async openTerminal(dirPath: string): Promise<void> {
    await systemIntegration.openTerminal(dirPath);
  }

  private async createNewFolder(): Promise<void> {
    await systemIntegration.createNewFolder();
  }

  private async createNewFile(extension: string): Promise<void> {
    await systemIntegration.createNewFile(extension);
  }

  private async pasteToDesktop(): Promise<void> {
    await systemIntegration.pasteToDesktop();
  }

  private async refreshDesktop(): Promise<void> {
    await systemIntegration.refreshDesktop();
  }

  private async showDesktopProperties(): Promise<void> {
    await systemIntegration.showDesktopProperties();
  }
}

export const contextMenuService = new ContextMenuService();
