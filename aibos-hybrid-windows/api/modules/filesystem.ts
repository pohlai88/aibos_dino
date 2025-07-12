import { FileStorage, FileItem } from "./types.ts";

/**
 * Default sample data for development
 */
const DEFAULT_SAMPLE_DATA: Record<string, FileItem[]> = {
  "": [
    { id: "1", name: "Common Files", type: "folder", modified: "2024-01-15", icon: "📁", path: "Common Files" },
    { id: "2", name: "Internet Explorer", type: "folder", modified: "2024-01-14", icon: "📁", path: "Internet Explorer" },
    { id: "3", name: "Windows NT", type: "folder", modified: "2024-01-13", icon: "📁", path: "Windows NT" },
    { id: "4", name: "Microsoft Office", type: "folder", modified: "2024-01-12", icon: "📁", path: "Microsoft Office" },
    { id: "5", name: "Adobe", type: "folder", modified: "2024-01-11", icon: "📁", path: "Adobe" },
    { id: "6", name: "desktop.ini", type: "file", size: 2355, modified: "2024-01-10", icon: "⚙️", path: "desktop.ini" },
    { id: "7", name: "Thumbs.db", type: "file", size: 1126, modified: "2024-01-09", icon: "🖼️", path: "Thumbs.db" },
  ],
  "Common Files": [
    { id: "cf1", name: "Microsoft Shared", type: "folder", modified: "2024-01-15", icon: "📁", path: "Common Files/Microsoft Shared" },
    { id: "cf2", name: "SpeechEngines", type: "folder", modified: "2024-01-14", icon: "📁", path: "Common Files/SpeechEngines" },
    { id: "cf3", name: "System", type: "folder", modified: "2024-01-13", icon: "📁", path: "Common Files/System" },
  ],
  "Microsoft Office": [
    { id: "mo1", name: "Office16", type: "folder", modified: "2024-01-15", icon: "📁", path: "Microsoft Office/Office16" },
    { id: "mo2", name: "Updates", type: "folder", modified: "2024-01-14", icon: "📁", path: "Microsoft Office/Updates" },
    { id: "mo3", name: "setup.exe", type: "file", size: 15990784, modified: "2024-01-13", icon: "⚙️", path: "Microsoft Office/setup.exe" },
  ],
  "Adobe": [
    { id: "ad1", name: "Adobe Creative Cloud", type: "folder", modified: "2024-01-15", icon: "📁", path: "Adobe/Adobe Creative Cloud" },
    { id: "ad2", name: "Adobe Photoshop", type: "folder", modified: "2024-01-14", icon: "📁", path: "Adobe/Adobe Photoshop" },
    { id: "ad3", name: "Adobe Illustrator", type: "folder", modified: "2024-01-13", icon: "📁", path: "Adobe/Adobe Illustrator" },
  ],
};

/**
 * Deep clone utility for better performance than JSON.parse/stringify
 */
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as T;
  if (Array.isArray(obj)) return obj.map(item => deepClone(item)) as T;
  
  // Use Object.create(null) to avoid prototype pollution
  const cloned = Object.create(null) as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/**
 * In-memory implementation of the FileStorage interface.
 * Intended for development and testing.
 */
export class InMemoryStorage implements FileStorage {
  private fileSystem: Record<string, FileItem[]> = {};
  private silent: boolean;

  constructor(initialData?: Record<string, FileItem[]>, useSampleData = true, silent = false) {
    this.silent = silent;
    if (initialData) {
      this.fileSystem = deepClone(initialData);
    } else if (useSampleData) {
      this.resetToSampleData();
    }
  }

  async getFiles(path: string): Promise<FileItem[]> {
    return deepClone(this.fileSystem[path] || []);
  }

  async saveFiles(path: string, files: FileItem[]): Promise<void> {
    if (!Array.isArray(files)) {
      throw new Error(`saveFiles expects an array, got: ${typeof files}`);
    }

    // Validate for duplicate names to ensure data integrity
    const seenNames = new Set<string>();
    for (const file of files) {
      if (seenNames.has(file.name)) {
        throw new Error(`Duplicate file/folder name "${file.name}" in path "${path}"`);
      }
      seenNames.add(file.name);
    }

    this.fileSystem[path] = deepClone(files);
  }

  async deleteFile(path: string, itemId: string): Promise<boolean> {
    const items = this.fileSystem[path];
    if (!items) return false;
    
    const index = items.findIndex(item => item.id === itemId);
    if (index >= 0) {
      items.splice(index, 1);
      if (!this.silent) {
        console.log(`🗑️ Deleted item ${itemId} from path ${path}`);
      }
      return true;
    }
    return false;
  }

  // Development utility methods
  /**
   * Get all paths in the file system (for debugging)
   */
  getAllPaths(): string[] {
    return Object.keys(this.fileSystem);
  }

  /**
   * Get the total number of items (for debugging)
   */
  getTotalItems(): number {
    return Object.values(this.fileSystem).reduce((sum, items) => sum + items.length, 0);
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.fileSystem = {};
    if (!this.silent) {
      console.log("🧹 Cleared all file system data");
    }
  }

  /**
   * Reset to sample data (for testing)
   */
  resetToSampleData(): void {
    this.fileSystem = deepClone(DEFAULT_SAMPLE_DATA);
    if (!this.silent) {
      console.log("🔄 Reset to sample data");
    }
  }

  /**
   * Find a file by its ID across all paths
   */
  findFileById(itemId: string): FileItem | undefined {
    const found = Object.values(this.fileSystem)
      .flatMap(items => items)
      .find(item => item.id === itemId);
    return found ? deepClone(found) : undefined;
  }

  /**
   * Get storage statistics
   */
  getStats(): { totalPaths: number; totalItems: number; paths: string[] } {
    const paths = this.getAllPaths();
    const totalItems = this.getTotalItems();
    return {
      totalPaths: paths.length,
      totalItems,
      paths,
    };
  }
}
