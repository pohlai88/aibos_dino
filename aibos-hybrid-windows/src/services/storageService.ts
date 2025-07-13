export interface StorageItem {
  key: string;
  value: unknown;
  timestamp: number;
  size: number;
}

class StorageService {
  private readonly STORAGE_THRESHOLD = 4 * 1024 * 1024; // 4MB
  private dbName = 'aibos-storage';
  private dbVersion = 1;
  private db?: IDBDatabase;

  initialize(): Promise<void> {
    if (!('indexedDB' in window)) {
      console.warn('IndexedDB not supported, falling back to localStorage only');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('storage')) {
          db.createObjectStore('storage', { keyPath: 'key' });
        }
      };
    });
  }

  setItem(key: string, value: unknown): Promise<void> {
    const serialized = JSON.stringify(value);
    const size = new Blob([serialized]).size;
    
    // Use IndexedDB for large data, localStorage for small
    if (size > this.STORAGE_THRESHOLD && this.db) {
      return this.setIndexedDB(key, value, size);
    } else {
      return Promise.resolve(this.setLocalStorage(key, value));
    }
  }

  async getItem<T>(key: string): Promise<T | null> {
    // Try IndexedDB first, then localStorage
    if (this.db) {
      const idbResult = await this.getIndexedDB<T>(key);
      if (idbResult !== null) return idbResult;
    }
    
    return this.getLocalStorage<T>(key);
  }

  private setIndexedDB(key: string, value: unknown, size: number): Promise<void> {
    if (!this.db) throw new Error('IndexedDB not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['storage'], 'readwrite');
      const store = transaction.objectStore('storage');
      
      const item: StorageItem = {
        key,
        value,
        timestamp: Date.now(),
        size
      };
      
      const request = store.put(item);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private setLocalStorage(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Failed to store ${key} in localStorage:`, error);
      throw error;
    }
  }

  private getIndexedDB<T>(key: string): Promise<T | null> {
    if (!this.db) return Promise.resolve(null);
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['storage'], 'readonly');
      const store = transaction.objectStore('storage');
      const request = store.get(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
    });
  }

  private getLocalStorage<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }
}

export const storageService = new StorageService();