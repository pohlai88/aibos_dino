// /system-integration/file-system/associations.ts

import { Logger } from './core/logger.ts';
import { systemEvents } from '../types/systemEvents.ts';

export interface FileAssociation {
  extension: string;
  mimeType: string;
  description: string;
  iconPath?: string;
  isDefault?: boolean;
}

export interface FileAssociationConfig {
  appName: string;
  appPath: string;
  appIcon: string;
  supportedTypes: FileAssociation[];
}

export class FileAssociationService {
  private logger: Logger;
  private isRegistered = false;
  private associations: FileAssociation[];

  constructor(
    logger: Logger,
    config?: FileAssociationConfig
  ) {
    this.logger = logger;
    this.associations = config?.supportedTypes ?? this.defaultAssociations;
  }

  private defaultAssociations: FileAssociation[] = [
    { extension: '.aibos', mimeType: 'application/aibos-project', description: 'AI-BOS Project File' },
    { extension: '.aiws', mimeType: 'application/aibos-workspace', description: 'AI-BOS Workspace' },
    { extension: '.txt', mimeType: 'text/plain', description: 'Text Document' },
    { extension: '.md', mimeType: 'text/markdown', description: 'Markdown Document' },
    { extension: '.json', mimeType: 'application/json', description: 'JSON File' },
    { extension: '.js', mimeType: 'text/javascript', description: 'JavaScript File' },
    { extension: '.ts', mimeType: 'text/typescript', description: 'TypeScript File' },
    { extension: '.css', mimeType: 'text/css', description: 'CSS Stylesheet' },
    { extension: '.html', mimeType: 'text/html', description: 'HTML Document' }
  ];

  initialize(): void {
    try {
      this.checkRegistrationStatus();
      if (!this.isRegistered) {
        this.registerFileAssociations();
      }
      this.logger.info('File associations initialized successfully', {
        component: 'FileAssociationService',
        action: 'initialize'
      });
    } catch (error) {
      this.logger.error('Failed to initialize file associations', {
        component: 'FileAssociationService',
        action: 'initialize',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  private checkRegistrationStatus(): void {
    try {
      if ('launchQueue' in window && 'LaunchParams' in window) {
        this.isRegistered = true;
      }
    } catch (error) {
      this.logger.warn('Could not check registration status', {
        component: 'FileAssociationService',
        action: 'checkRegistrationStatus',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  registerFileAssociations(): void {
    try {
      if ('serviceWorker' in navigator && 'launchQueue' in window) {
        this.logger.debug('Registering file associations with File Handling API', {
          component: 'FileAssociationService',
          action: 'registerFileAssociations'
        });
        // You might implement registration logic here for File Handling API.
      }

      this.registerProtocolHandler();
      this.isRegistered = true;

      this.logger.info('File associations registered successfully', {
        component: 'FileAssociationService',
        action: 'registerFileAssociations'
      });
    } catch (error) {
      this.logger.error('Failed to register file associations', {
        component: 'FileAssociationService',
        action: 'registerFileAssociations',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  getServiceWorkerScript(): string {
    return `
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FILE_LAUNCH') {
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'OPEN_FILE',
          file: event.data.file
        });
      });
    });
  }
});

if ('launchQueue' in self) {
  self.launchQueue.setConsumer(launchParams => {
    if (launchParams.files && launchParams.files.length > 0) {
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'OPEN_FILES',
            files: launchParams.files
          });
        });
      });
    }
  });
}
`;
  }

  private registerProtocolHandler(): void {
    try {
      if ('registerProtocolHandler' in navigator) {
        navigator.registerProtocolHandler(
          'aibos',
          '/open-protocol?url=%s'
        );
        this.logger.info('Protocol handler registered', {
          component: 'FileAssociationService',
          action: 'registerProtocolHandler'
        });
      }
    } catch (error) {
      this.logger.warn('Protocol handler registration failed', {
        component: 'FileAssociationService',
        action: 'registerProtocolHandler',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  async handleFileOpen(files: FileSystemFileHandle[]): Promise<void> {
    try {
      for (const handle of files) {
        const file = await handle.getFile();
        this.emitFileOpenEvent(file, handle);
      }
    } catch (error) {
      this.logger.error('Failed to handle file open', {
        component: 'FileAssociationService',
        action: 'handleFileOpen',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  private emitFileOpenEvent(file: File, handle: FileSystemFileHandle): void {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    const association = this.associations.find(a => a.extension === extension);

    if (association) {
      systemEvents.emit('file:open', {
        file,
        handle,
        extension,
        mimeType: association.mimeType,
        description: association.description
      });

      this.logger.info(`Emitted file open event for ${file.name}`, {
        component: 'FileAssociationService',
        action: 'emitFileOpenEvent'
      });
    } else {
      this.logger.warn(`No association found for ${file.name}`, {
        component: 'FileAssociationService',
        action: 'emitFileOpenEvent'
      });
    }
  }

  getRegisteredAssociations(): FileAssociation[] {
    return [...this.associations];
  }

  unregisterFileAssociations(): void {
    this.isRegistered = false;
    this.logger.info('File associations unregistered', {
      component: 'FileAssociationService',
      action: 'unregisterFileAssociations'
    });
  }
}

