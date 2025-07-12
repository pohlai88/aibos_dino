import { FileItem, FileStorage, OperationResult } from "./types.ts";
import { currentDate, generateId } from "./utils.ts";
import { isValidName } from "./validation.ts";

/**
 * Core operations for managing the virtual file system.
 */
export class FileOperations {
  constructor(private storage: FileStorage) {}

  /**
   * Create a new folder.
   */
  async createFolder(path: string, name: string): Promise<OperationResult> {
    if (!isValidName(name)) {
      return { success: false, error: "Invalid folder name." };
    }

    const items = await this.storage.getFiles(path);
    if (items.some(item => item.name === name)) {
      return { success: false, error: "A file or folder with that name already exists." };
    }

    const newFolder: FileItem = {
      id: generateId(),
      name,
      type: "folder",
      modified: currentDate(),
      icon: "📁",
      path: path ? `${path}/${name}` : name,
    };

    items.push(newFolder);
    await this.storage.saveFiles(path, items);
    await this.storage.saveFiles(newFolder.path, []); // Create empty folder contents

    return { success: true, data: { ...newFolder } };
  }

  /**
   * Create a new file.
   */
  async createFile(path: string, name: string, content = "", size = 0): Promise<OperationResult> {
    if (!isValidName(name)) {
      return { success: false, error: "Invalid file name." };
    }

    const items = await this.storage.getFiles(path);
    if (items.some(item => item.name === name)) {
      return { success: false, error: "A file or folder with that name already exists." };
    }

    const newFile: FileItem = {
      id: generateId(),
      name,
      type: "file",
      modified: currentDate(),
      icon: "📄",
      path: path ? `${path}/${name}` : name,
      size,
    };

    items.push(newFile);
    await this.storage.saveFiles(path, items);

    return { success: true, data: { ...newFile } };
  }

  /**
   * Rename a file or folder.
   */
  async renameItem(path: string, itemId: string, newName: string): Promise<OperationResult> {
    if (!isValidName(newName)) {
      return { success: false, error: "Invalid name." };
    }

    const items = await this.storage.getFiles(path);
    const item = items.find(i => i.id === itemId);
    if (!item) {
      return { success: false, error: "Item not found." };
    }

    if (items.some(i => i.name === newName && i.id !== itemId)) {
      return { success: false, error: "A file or folder with that name already exists." };
    }

    const oldPath = item.path;
    const newPath = path ? `${path}/${newName}` : newName;

    item.name = newName;
    item.modified = currentDate();
    item.path = newPath;

    if (item.type === "folder") {
      const children = await this.storage.getFiles(oldPath);
      // Safer path replacement using prefix matching
      for (const child of children) {
        if (child.path.startsWith(oldPath)) {
          child.path = newPath + child.path.slice(oldPath.length);
        }
      }
      // Save renamed children after all path updates
      await this.storage.saveFiles(newPath, children);
      await this.storage.saveFiles(oldPath, []);
    }

    await this.storage.saveFiles(path, items);
    return { success: true, data: { ...item } };
  }

  /**
   * Delete a file or folder (recursively if folder).
   */
  async deleteItem(path: string, itemId: string): Promise<OperationResult> {
    const items = await this.storage.getFiles(path);
    const item = items.find(i => i.id === itemId);
    if (!item) {
      return { success: false, error: "Item not found." };
    }

    if (item.type === "folder") {
      const stack = [item.path];
      while (stack.length > 0) {
        const currentPath = stack.pop()!;
        const children = await this.storage.getFiles(currentPath);
        for (const child of children) {
          if (child.type === "folder") {
            stack.push(child.path);
          }
        }
        await this.storage.saveFiles(currentPath, []);
      }
    }

    const success = await this.storage.deleteFile(path, itemId);
    return { success, error: success ? undefined : "Failed to delete item." };
  }

  /**
   * Generate a unique name for copied items, handling duplicates
   */
  private generateUniqueName(baseName: string, existingNames: string[]): string {
    let counter = 1;
    let uniqueName = `${baseName} (Copy)`;
    
    while (existingNames.includes(uniqueName)) {
      uniqueName = `${baseName} (Copy ${counter})`;
      counter++;
    }
    
    return uniqueName;
  }

  /**
   * Recursively copy folder contents with unique names
   */
  private async copyFolderContents(sourcePath: string, targetPath: string): Promise<void> {
    const sourceChildren = await this.storage.getFiles(sourcePath);
    const targetChildren = await this.storage.getFiles(targetPath);
    
    // Handle name collisions for immediate children
    const existingNames = targetChildren.map(child => child.name);
    const copiedChildren: FileItem[] = [];
    
    for (const child of sourceChildren) {
      const uniqueName = this.generateUniqueName(child.name, existingNames);
      existingNames.push(uniqueName);
      
      const copiedChild: FileItem = {
        ...child,
        id: generateId(),
        name: uniqueName,
        path: `${targetPath}/${uniqueName}`,
        modified: currentDate(),
      };
      
      copiedChildren.push(copiedChild);
      
      // Recursively copy subfolder contents
      if (child.type === "folder") {
        await this.copyFolderContents(child.path, copiedChild.path);
      }
    }
    
    await this.storage.saveFiles(targetPath, copiedChildren);
  }

  /**
   * Copy an item (file or folder) to a target path.
   */
  async copyItem(sourcePath: string, targetPath: string, itemId: string): Promise<OperationResult> {
    const sourceItems = await this.storage.getFiles(sourcePath);
    const targetItems = await this.storage.getFiles(targetPath);

    const sourceItem = sourceItems.find(i => i.id === itemId);
    if (!sourceItem) {
      return { success: false, error: "Source item not found." };
    }

    const existingNames = targetItems.map(i => i.name);
    const copyName = this.generateUniqueName(sourceItem.name, existingNames);

    const copiedItem: FileItem = {
      ...sourceItem,
      id: generateId(),
      name: copyName,
      path: targetPath ? `${targetPath}/${copyName}` : copyName,
      modified: currentDate(),
    };

    targetItems.push(copiedItem);
    await this.storage.saveFiles(targetPath, targetItems);

    if (sourceItem.type === "folder") {
      await this.copyFolderContents(sourceItem.path, copiedItem.path);
    }

    return { success: true, data: { ...copiedItem } };
  }

  /**
   * Move an item (file or folder) to a target path.
   */
  async moveItem(sourcePath: string, targetPath: string, itemId: string): Promise<OperationResult> {
    const sourceItems = await this.storage.getFiles(sourcePath);
    const targetItems = await this.storage.getFiles(targetPath);

    const index = sourceItems.findIndex(i => i.id === itemId);
    if (index === -1) {
      return { success: false, error: "Item not found in source path." };
    }

    const item = sourceItems[index];
    if (targetItems.some(i => i.name === item.name)) {
      return { success: false, error: "A file or folder with that name already exists in the target folder." };
    }

    sourceItems.splice(index, 1);
    await this.storage.saveFiles(sourcePath, sourceItems);

    const oldPath = item.path;
    item.path = targetPath ? `${targetPath}/${item.name}` : item.name;
    item.modified = currentDate();

    targetItems.push(item);
    await this.storage.saveFiles(targetPath, targetItems);

    if (item.type === "folder") {
      const children = await this.storage.getFiles(oldPath);
      // Update all children paths first, then save once
      for (const child of children) {
        if (child.path.startsWith(oldPath)) {
          child.path = item.path + child.path.slice(oldPath.length);
        }
      }
      await this.storage.saveFiles(item.path, children);
      await this.storage.saveFiles(oldPath, []);
    }

    return { success: true, data: { ...item } };
  }

  /**
   * Retrieve all items under a given path.
   */
  async getFileTree(path: string = ""): Promise<OperationResult> {
    const files = await this.storage.getFiles(path);
    // Clone returned objects to prevent external mutation
    const clonedFiles = files.map(file => ({ ...file }));
    return { success: true, data: clonedFiles };
  }
}

// Note: Legacy Node.js file system functions removed for Deno compatibility
// Use the virtual file system operations instead
