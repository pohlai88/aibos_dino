import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

// File system data structure
export interface FileItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  size?: number; // in bytes
  modified: string;
  icon: string;
  path: string;
}

// In-memory file system (TODO: replace with persistent storage for production)
const fileSystem: Record<string, FileItem[]> = {
  '': [
    { id: '1', name: 'Common Files', type: 'folder', modified: '2024-01-15', icon: '📁', path: 'Common Files' },
    { id: '2', name: 'Internet Explorer', type: 'folder', modified: '2024-01-14', icon: '📁', path: 'Internet Explorer' },
    { id: '3', name: 'Windows NT', type: 'folder', modified: '2024-01-13', icon: '📁', path: 'Windows NT' },
    { id: '4', name: 'Microsoft Office', type: 'folder', modified: '2024-01-12', icon: '📁', path: 'Microsoft Office' },
    { id: '5', name: 'Adobe', type: 'folder', modified: '2024-01-11', icon: '📁', path: 'Adobe' },
    { id: '6', name: 'desktop.ini', type: 'file', size: 2355, modified: '2024-01-10', icon: '⚙️', path: 'desktop.ini' },
    { id: '7', name: 'Thumbs.db', type: 'file', size: 1126, modified: '2024-01-09', icon: '🖼️', path: 'Thumbs.db' },
  ],
  'Common Files': [
    { id: 'cf1', name: 'Microsoft Shared', type: 'folder', modified: '2024-01-15', icon: '📁', path: 'Common Files/Microsoft Shared' },
    { id: 'cf2', name: 'SpeechEngines', type: 'folder', modified: '2024-01-14', icon: '📁', path: 'Common Files/SpeechEngines' },
    { id: 'cf3', name: 'System', type: 'folder', modified: '2024-01-13', icon: '📁', path: 'Common Files/System' },
  ],
  'Microsoft Office': [
    { id: 'mo1', name: 'Office16', type: 'folder', modified: '2024-01-15', icon: '📁', path: 'Microsoft Office/Office16' },
    { id: 'mo2', name: 'Updates', type: 'folder', modified: '2024-01-14', icon: '📁', path: 'Microsoft Office/Updates' },
    { id: 'mo3', name: 'setup.exe', type: 'file', size: 15990784, modified: '2024-01-13', icon: '⚙️', path: 'Microsoft Office/setup.exe' },
  ],
  'Adobe': [
    { id: 'ad1', name: 'Adobe Creative Cloud', type: 'folder', modified: '2024-01-15', icon: '📁', path: 'Adobe/Adobe Creative Cloud' },
    { id: 'ad2', name: 'Adobe Photoshop', type: 'folder', modified: '2024-01-14', icon: '📁', path: 'Adobe/Adobe Photoshop' },
    { id: 'ad3', name: 'Adobe Illustrator', type: 'folder', modified: '2024-01-13', icon: '📁', path: 'Adobe/Adobe Illustrator' },
  ],
};

// Format size for display (e.g., 2355 -> '2.3 KB')
function formatSize(size?: number): string | undefined {
  if (typeof size !== 'number') return undefined;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

// Helper: get files for a path
function getFilesForPath(path: string): FileItem[] {
  return (fileSystem[path] || []).map(item => ({ ...item, size: item.size }));
}

// Helper: check for duplicate name in a folder
function hasDuplicateName(path: string, name: string): boolean {
  return !!fileSystem[path]?.some(item => item.name === name);
}

// Helper: create a new folder
function createFolder(path: string, name: string): { success: boolean; data?: FileItem; error?: string } {
  if (hasDuplicateName(path, name)) {
    return { success: false, error: 'A file or folder with that name already exists.' };
  }
  const newFolder: FileItem = {
    id: `folder_${Date.now()}`,
    name,
    type: 'folder',
    modified: new Date().toISOString().split('T')[0],
    icon: '📁',
    path: path ? `${path}/${name}` : name,
  };
  if (!fileSystem[path]) fileSystem[path] = [];
  fileSystem[path].push(newFolder);
  return { success: true, data: newFolder };
}

// Helper: delete an item
function deleteItem(path: string, itemId: string): { success: boolean; error?: string } {
  if (!fileSystem[path]) return { success: false, error: 'Path not found' };
  const index = fileSystem[path].findIndex(item => item.id === itemId);
  if (index === -1) return { success: false, error: 'Item not found' };
  fileSystem[path].splice(index, 1);
  return { success: true };
}

// Helper: rename an item
function renameItem(path: string, itemId: string, newName: string): { success: boolean; data?: FileItem; error?: string } {
  if (!fileSystem[path]) return { success: false, error: 'Path not found' };
  const item = fileSystem[path].find(item => item.id === itemId);
  if (!item) return { success: false, error: 'Item not found' };
  if (hasDuplicateName(path, newName)) return { success: false, error: 'A file or folder with that name already exists.' };
  item.name = newName;
  item.modified = new Date().toISOString().split('T')[0];
  item.path = path ? `${path}/${newName}` : newName;
  return { success: true, data: item };
}

// Helper: copy an item
function copyItem(sourcePath: string, targetPath: string, itemId: string): { success: boolean; data?: FileItem; error?: string } {
  if (!fileSystem[sourcePath]) return { success: false, error: 'Source path not found' };
  const sourceItem = fileSystem[sourcePath].find(item => item.id === itemId);
  if (!sourceItem) return { success: false, error: 'Item not found' };
  if (hasDuplicateName(targetPath, sourceItem.name + ' (Copy)')) return { success: false, error: 'A file or folder with that name already exists in the target folder.' };
  const copiedItem: FileItem = {
    ...sourceItem,
    id: `copy_${Date.now()}`,
    name: `${sourceItem.name} (Copy)`,
    modified: new Date().toISOString().split('T')[0],
    path: targetPath ? `${targetPath}/${sourceItem.name} (Copy)` : `${sourceItem.name} (Copy)`,
  };
  if (!fileSystem[targetPath]) fileSystem[targetPath] = [];
  fileSystem[targetPath].push(copiedItem);
  return { success: true, data: copiedItem };
}

// Helper: move an item
function moveItem(sourcePath: string, targetPath: string, itemId: string): { success: boolean; data?: FileItem; error?: string } {
  if (!fileSystem[sourcePath]) return { success: false, error: 'Source path not found' };
  const sourceIndex = fileSystem[sourcePath].findIndex(item => item.id === itemId);
  if (sourceIndex === -1) return { success: false, error: 'Item not found' };
  const item = fileSystem[sourcePath][sourceIndex];
  if (hasDuplicateName(targetPath, item.name)) return { success: false, error: 'A file or folder with that name already exists in the target folder.' };
  const movedItem: FileItem = {
    ...item,
    modified: new Date().toISOString().split('T')[0],
    path: targetPath ? `${targetPath}/${item.name}` : item.name,
  };
  // Remove from source
  fileSystem[sourcePath].splice(sourceIndex, 1);
  // Add to target
  if (!fileSystem[targetPath]) fileSystem[targetPath] = [];
  fileSystem[targetPath].push(movedItem);
  return { success: true, data: movedItem };
}

// --- API Server ---
serve(async (req) => {
  const url = new URL(req.url);
  const path = url.searchParams.get('path') || '';

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    switch (req.method) {
      case 'GET': {
        // Get files for a path
        const files = getFilesForPath(path).map(item => ({
          ...item,
          size: formatSize(item.size),
        }));
        return new Response(JSON.stringify({ success: true, data: { files, path } }), { headers });
      }
      case 'POST': {
        // Create new folder or perform action
        const body = await req.json();
        const { action, name, itemId } = body;
        switch (action) {
          case 'createFolder': {
            if (!name) {
              return new Response(JSON.stringify({ success: false, error: 'Folder name is required' }), { status: 400, headers });
            }
            const result = createFolder(path, name);
            return new Response(JSON.stringify(result), { status: result.success ? 200 : 400, headers });
          }
          case 'rename': {
            if (!itemId || !name) {
              return new Response(JSON.stringify({ success: false, error: 'Item ID and new name are required' }), { status: 400, headers });
            }
            const result = renameItem(path, itemId, name);
            return new Response(JSON.stringify(result), { status: result.success ? 200 : 400, headers });
          }
          case 'copy': {
            const { targetPath: copyTargetPath } = body;
            if (!itemId || !copyTargetPath) {
              return new Response(JSON.stringify({ success: false, error: 'Item ID and target path are required' }), { status: 400, headers });
            }
            const result = copyItem(path, copyTargetPath, itemId);
            return new Response(JSON.stringify(result), { status: result.success ? 200 : 400, headers });
          }
          case 'move': {
            const { targetPath: moveTargetPath } = body;
            if (!itemId || !moveTargetPath) {
              return new Response(JSON.stringify({ success: false, error: 'Item ID and target path are required' }), { status: 400, headers });
            }
            const result = moveItem(path, moveTargetPath, itemId);
            return new Response(JSON.stringify(result), { status: result.success ? 200 : 400, headers });
          }
          default:
            return new Response(JSON.stringify({ success: false, error: 'Invalid action' }), { status: 400, headers });
        }
      }
      case 'DELETE': {
        // Delete an item
        const deleteBody = await req.json();
        const { itemId: deleteItemId } = deleteBody;
        if (!deleteItemId) {
          return new Response(JSON.stringify({ success: false, error: 'Item ID is required' }), { status: 400, headers });
        }
        const result = deleteItem(path, deleteItemId);
        return new Response(JSON.stringify(result), { status: result.success ? 200 : 404, headers });
      }
      default:
        return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers });
    }
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), { status: 500, headers });
  }
});

console.log('File API server running on http://localhost:8000'); 