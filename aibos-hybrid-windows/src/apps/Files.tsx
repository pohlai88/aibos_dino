import React, { memo, useState, useRef, useEffect } from 'react';
import { PropertiesDialog } from '../components/PropertiesDialog.tsx';
import { VirtualScrolling } from '../utils/virtualScrolling.tsx';
import { DragDropZone } from '../components/DragDropZone';
import { systemIntegration } from '../services/systemIntegration';

// Improved type definitions
interface BaseItem {
  id: string;
  name: string;
  icon: string;
}

interface FolderItem extends BaseItem {
  type: 'folder';
  modified: string;
}

interface FileEntry extends BaseItem {
  type: 'file';
  size: string;
  modified: string;
}

type FileItem = FolderItem | FileEntry;

interface ContextMenuProps {
  x: number;
  y: number;
  item: FileItem;
  onClose: () => void;
  onAction: (action: string, item: FileItem) => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, item, onClose, onAction }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleAction = (action: string) => {
    onAction(action, item);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-48"
      style={{ left: x, top: y }}
    >
      <button
        type="button"
        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center"
        onClick={() => handleAction('open')}
      >
        <span className="mr-3">▶️</span>
        Open
      </button>
      <button
        type="button"
        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center"
        onClick={() => handleAction('rename')}
      >
        <span className="mr-3">✏️</span>
        Rename
      </button>
      <button
        type="button"
        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center"
        onClick={() => handleAction('copy')}
      >
        <span className="mr-3">📋</span>
        Copy
      </button>
      <button
        type="button"
        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center"
        onClick={() => handleAction('cut')}
      >
        <span className="mr-3">✂️</span>
        Cut
      </button>
      <hr className="my-1 border-gray-200 dark:border-gray-700" />
      <button
        type="button"
        className="w-full text-left px-4 py-2 hover:bg-red-100 dark:hover:bg-red-900 transition-colors flex items-center text-red-600 dark:text-red-400"
        onClick={() => handleAction('delete')}
      >
        <span className="mr-3">🗑️</span>
        Delete
      </button>
      <hr className="my-1 border-gray-200 dark:border-gray-700" />
      <button
        type="button"
        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center"
        onClick={() => handleAction('properties')}
      >
        <span className="mr-3">ℹ️</span>
        Properties
      </button>
    </div>
  );
};

export const Files: React.FC = memo(() => {
  // Better path management using array
  const [pathParts, setPathParts] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: FileItem;
  } | null>(null);
  const [propertiesDialog, setPropertiesDialog] = useState<{
    isVisible: boolean;
    item: FileItem | null;
  }>({ isVisible: false, item: null });
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API base URL
  const API_BASE = 'http://localhost:8000';

  // Fetch files from API
  const fetchFiles = async (path: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/files?path=${encodeURIComponent(path)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setFileItems(data.files || []);
    } catch (err) {
      console.error('Error fetching files:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch files');
      // Fallback to static data if API fails
      setFileItems(getStaticFileItems());
    } finally {
      setLoading(false);
    }
  };

  // API operations
  const apiOperation = async (action: string, data: any) => {
    try {
      const response = await fetch(`${API_BASE}/api/files?path=${encodeURIComponent(pathParts.join('/'))}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, ...data }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      console.error(`Error in ${action}:`, err);
      throw err;
    }
  };

  const deleteItemApi = async (itemId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/files?path=${encodeURIComponent(pathParts.join('/'))}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error('Error deleting item:', err);
      throw err;
    }
  };

  // Dynamic file items based on current path (fallback static data)
  const getStaticFileItems = (): FileItem[] => {
    if (pathParts.length === 0) {
      // Root level - Program Files
      return [
        { id: '1', name: 'Common Files', type: 'folder', modified: '2024-01-15', icon: '📁' },
        { id: '2', name: 'Internet Explorer', type: 'folder', modified: '2024-01-14', icon: '📁' },
        { id: '3', name: 'Windows NT', type: 'folder', modified: '2024-01-13', icon: '📁' },
        { id: '4', name: 'Microsoft Office', type: 'folder', modified: '2024-01-12', icon: '📁' },
        { id: '5', name: 'Adobe', type: 'folder', modified: '2024-01-11', icon: '📁' },
        { id: '6', name: 'desktop.ini', type: 'file', size: '2.3 KB', modified: '2024-01-10', icon: '⚙️' },
        { id: '7', name: 'Thumbs.db', type: 'file', size: '1.1 KB', modified: '2024-01-09', icon: '🖼️' },
      ];
    } else if (pathParts[0] === 'Common Files') {
      return [
        { id: 'cf1', name: 'Microsoft Shared', type: 'folder', modified: '2024-01-15', icon: '📁' },
        { id: 'cf2', name: 'SpeechEngines', type: 'folder', modified: '2024-01-14', icon: '📁' },
        { id: 'cf3', name: 'System', type: 'folder', modified: '2024-01-13', icon: '📁' },
      ];
    } else if (pathParts[0] === 'Microsoft Office') {
      return [
        { id: 'mo1', name: 'Office16', type: 'folder', modified: '2024-01-15', icon: '📁' },
        { id: 'mo2', name: 'Updates', type: 'folder', modified: '2024-01-14', icon: '📁' },
        { id: 'mo3', name: 'setup.exe', type: 'file', size: '15.2 MB', modified: '2024-01-13', icon: '⚙️' },
      ];
    }
    
    // Default empty folder
    return [];
  };

  // Load files when path changes
  useEffect(() => {
    const currentPath = pathParts.join('/');
    fetchFiles(currentPath);
  }, [pathParts]);

  // Reset focus when path changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [pathParts]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (fileItems.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < fileItems.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : fileItems.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < fileItems.length) {
          const item = fileItems[focusedIndex];
          if (item) {
            handleItemClick(item);
          }
        }
        break;
      case 'Delete':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < fileItems.length) {
          const item = fileItems[focusedIndex];
          if (item) {
            handleContextMenuAction('delete', item);
          }
        }
        break;
      case 'Escape':
        setContextMenu(null);
        setPropertiesDialog({ isVisible: false, item: null });
        break;
    }
  };

  // Improved event handling
  const handleItemClick = (item: FileItem) => {
    if (item.type === 'folder') {
      setPathParts([...pathParts, item.name]);
    } else {
      // TODO: Implement file opening
      console.log('Opening file:', item.name);
    }
  };

  const handleItemSelect = (itemId: string, event?: React.SyntheticEvent) => {
    event?.stopPropagation();
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleContextMenu = (e: React.MouseEvent, item: FileItem) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  const handleContextMenuAction = async (action: string, item: FileItem) => {
    console.log(`${action} action for:`, item.name);
    
    try {
      switch (action) {
        case 'open':
          handleItemClick(item);
          break;
        case 'rename':
          const newName = prompt('Enter new name:', item.name);
          if (newName && newName.trim() && newName !== item.name) {
            const result = await apiOperation('rename', { itemId: item.id, name: newName });
            if (result.item) {
              // Refresh the file list
              fetchFiles(pathParts.join('/'));
            }
          }
          break;
        case 'copy':
          // TODO: Implement copy functionality with target selection
          console.log(`Copying ${item.name} to clipboard`);
          break;
        case 'cut':
          // TODO: Implement cut functionality
          console.log(`Cutting ${item.name} to clipboard`);
          break;
        case 'delete':
          if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
            const result = await deleteItemApi(item.id);
            if (result.success) {
              // Refresh the file list
              fetchFiles(pathParts.join('/'));
            }
          }
          break;
        case 'properties':
          setPropertiesDialog({ isVisible: true, item });
          break;
      }
    } catch (err) {
      console.error(`Error in ${action}:`, err);
      alert(`Failed to ${action} "${item.name}". Please try again.`);
    }
  };

  const goBack = () => {
    if (pathParts.length > 0) {
      setPathParts(pathParts.slice(0, -1));
    }
  };

  const navigateToPath = (index: number) => {
    setPathParts(pathParts.slice(0, index + 1));
  };

  return (
    <div 
      className="p-4 bg-white text-gray-800 h-full dark:bg-gray-800 dark:text-gray-200 flex flex-col"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Program Files</h2>
        <div className="flex space-x-2">
          <button
            type="button"
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
            onClick={async () => {
              const folderName = prompt('Enter folder name:');
              if (folderName && folderName.trim()) {
                try {
                  const result = await apiOperation('createFolder', { name: folderName });
                  if (result.folder) {
                    // Refresh the file list
                    fetchFiles(pathParts.join('/'));
                  }
                } catch (err) {
                  console.error('Error creating folder:', err);
                  alert('Failed to create folder. Please try again.');
                }
              }
            }}
          >
            New Folder
          </button>
          <button
            type="button"
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
            onClick={() => {
              // TODO: Implement file upload
              console.log('Upload file');
            }}
          >
            Upload
          </button>
        </div>
      </div>

      {/* Enhanced Breadcrumb */}
      <div className="mb-4 p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm">
        <button
          type="button"
          className={`text-blue-500 hover:text-blue-700 dark:text-blue-400 transition-colors ${
            pathParts.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:underline'
          }`}
          onClick={goBack}
          disabled={pathParts.length === 0}
        >
          ← Back
        </button>
        <span className="ml-2 text-gray-600 dark:text-gray-300">
          C:\Program Files\
          {pathParts.map((part, idx) => (
            <span key={idx}>
              <button
                type="button"
                onClick={() => navigateToPath(idx)}
                className="text-blue-500 hover:text-blue-700 hover:underline cursor-pointer ml-1 transition-colors"
              >
                {part}
              </button>
              <span>\</span>
            </span>
          ))}
        </span>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-4">⏳</div>
            <div className="text-lg font-medium mb-2">Loading...</div>
            <div className="text-sm">Fetching files from server</div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-red-500 dark:text-red-400">
            <div className="text-4xl mb-4">⚠️</div>
            <div className="text-lg font-medium mb-2">Error Loading Files</div>
            <div className="text-sm text-center max-w-md">{error}</div>
            <button
              type="button"
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              onClick={() => fetchFiles(pathParts.join('/'))}
            >
              Retry
            </button>
          </div>
        ) : fileItems.length > 0 ? (
          <VirtualScrolling
            items={fileItems}
            itemHeight={60}
            containerHeight={400}
            renderItem={(item, index) => (
              <div
                key={item.id}
                className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                  selectedItems.has(item.id)
                    ? 'bg-blue-100 dark:bg-blue-900'
                    : focusedIndex === index
                    ? 'bg-blue-50 dark:bg-blue-800 border border-blue-300 dark:border-blue-600'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                onClick={() => {
                  setFocusedIndex(index);
                  handleItemClick(item);
                }}
                onContextMenu={(e) => handleContextMenu(e, item)}
                role="treeitem"
                aria-label={`${item.type === 'folder' ? 'Folder' : 'File'}: ${item.name}`}
                tabIndex={-1}
              >
                <input
                  type="checkbox"
                  checked={selectedItems.has(item.id)}
                  onChange={(e) => handleItemSelect(item.id, e)}
                  className="mr-3"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-xl mr-3">{item.icon}</span>
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {item.type === 'file' && `${item.size} • `}
                    {item.modified}
                  </div>
                </div>
              </div>
            )}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-6xl mb-4">📁</div>
            <div className="text-lg font-medium mb-2">This folder is empty</div>
            <div className="text-sm">No files or folders found in this location</div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="mt-4 p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-600 dark:text-gray-300">
        {loading ? (
          <span className="text-blue-600 dark:text-blue-400">⏳ Loading files...</span>
        ) : error ? (
          <span className="text-red-600 dark:text-red-400">⚠️ {error}</span>
        ) : (
          <>
            {selectedItems.size > 0 
              ? `${selectedItems.size} item(s) selected`
              : `${fileItems.length} item${fileItems.length !== 1 ? 's' : ''}`
            }
            {focusedIndex >= 0 && (
              <span className="ml-4 text-blue-600 dark:text-blue-400">
                Press Enter to open, Delete to remove
              </span>
            )}
          </>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          item={contextMenu.item}
          onClose={() => setContextMenu(null)}
          onAction={handleContextMenuAction}
        />
      )}

      {/* Properties Dialog */}
      <PropertiesDialog
        isVisible={propertiesDialog.isVisible}
        item={propertiesDialog.item}
        onClose={() => setPropertiesDialog({ isVisible: false, item: null })}
      />
    </div>
  );
});

// Add import at the top
import { DragDropZone } from '../components/DragDropZone';
import { systemIntegration } from '../services/systemIntegration';

// Add after existing state declarations
const [fileMetadata, setFileMetadata] = useState<Map<string, any>>(new Map());
const [bulkOperationProgress, setBulkOperationProgress] = useState<{
  isActive: boolean;
  completed: number;
  total: number;
  operation: string;
}>({ isActive: false, completed: 0, total: 0, operation: '' });

// Enhanced file drop handler
const handleFilesDropped = useCallback(async (files: File[]) => {
  console.log('Files dropped:', files);
  
  // Extract metadata for all files
  const metadataMap = new Map();
  for (const file of files) {
    const metadata = await systemIntegration.extractFileMetadata(file);
    metadataMap.set(file.name, metadata);
  }
  setFileMetadata(metadataMap);
  
  // Process files based on type
  const categorizedFiles = files.reduce((acc, file) => {
    const metadata = metadataMap.get(file.name);
    if (!acc[metadata.category]) acc[metadata.category] = [];
    acc[metadata.category].push(file);
    return acc;
  }, {} as Record<string, File[]>);
  
  console.log('Categorized files:', categorizedFiles);
  
  // Refresh file list
  fetchFiles(pathParts.join('/'));
}, [pathParts]);

// Bulk operations handler
const handleBulkOperation = async (operation: 'copy' | 'move' | 'delete', selectedFiles: string[]) => {
  if (selectedFiles.length === 0) return;
  
  setBulkOperationProgress({
    isActive: true,
    completed: 0,
    total: selectedFiles.length,
    operation
  });
  
  try {
    // Convert selected IDs to File objects (this would need actual file handles in a real implementation)
    const files = selectedFiles.map(id => {
      const item = fileItems.find(f => f.id === id);
      return new File([''], item?.name || '', { type: 'application/octet-stream' });
    });
    
    const result = await systemIntegration.processBulkFiles(files, operation, {
      onProgress: (completed, total) => {
        setBulkOperationProgress(prev => ({ ...prev, completed, total }));
      },
      onError: (file, error) => {
        console.error(`Error ${operation}ing ${file.name}:`, error);
      }
    });
    
    console.log(`Bulk ${operation} completed:`, result);
    
    // Refresh file list
    fetchFiles(pathParts.join('/'));
    setSelectedItems(new Set());
  } catch (error) {
    console.error(`Bulk ${operation} failed:`, error);
  } finally {
    setBulkOperationProgress({ isActive: false, completed: 0, total: 0, operation: '' });
  }
};

// Enhanced context menu with bulk operations
const handleContextMenuAction = async (action: string, item: FileItem) => {
  console.log(`${action} action for:`, item.name);
  
  try {
    switch (action) {
      case 'open':
        handleItemClick(item);
        break;
      case 'rename':
        const newName = prompt('Enter new name:', item.name);
        if (newName && newName.trim() && newName !== item.name) {
          const result = await apiOperation('rename', { itemId: item.id, name: newName });
          if (result.item) {
            // Refresh the file list
            fetchFiles(pathParts.join('/'));
          }
        }
        break;
      case 'copy':
        // TODO: Implement copy functionality with target selection
        console.log(`Copying ${item.name} to clipboard`);
        break;
      case 'cut':
        // TODO: Implement cut functionality
        console.log(`Cutting ${item.name} to clipboard`);
        break;
      case 'delete':
        if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
          const result = await deleteItemApi(item.id);
          if (result.success) {
            // Refresh the file list
            fetchFiles(pathParts.join('/'));
          }
        }
        break;
      case 'properties':
        setPropertiesDialog({ isVisible: true, item });
        break;
    }
  } catch (err) {
    console.error(`Error in ${action}:`, err);
    alert(`Failed to ${action} "${item.name}". Please try again.`);
  }
};

// Wrap the file list with enhanced DragDropZone
<DragDropZone
  onFilesDropped={handleFilesDropped}
  acceptedTypes={['.txt', '.json', '.md', '.csv', '.jpg', '.png', '.pdf']}
  multiple={true}
  className="flex-1 min-h-0"
  enableFolderDrop={true}
  maxFileSize={50 * 1024 * 1024} // 50MB
  onProgress={(completed, total) => {
    console.log(`Processing: ${completed}/${total}`);
  }}
>
  {/* existing file list content */}
</DragDropZone>

// Add bulk operation progress indicator
{bulkOperationProgress.isActive && (
  <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border">
    <div className="flex items-center space-x-3">
      <div className="text-2xl">⏳</div>
      <div>
        <div className="font-medium">
          {bulkOperationProgress.operation.charAt(0).toUpperCase() + bulkOperationProgress.operation.slice(1)}ing files...
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {bulkOperationProgress.completed} of {bulkOperationProgress.total} completed
        </div>
        <div className="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(bulkOperationProgress.completed / bulkOperationProgress.total) * 100}%` }}
          />
        </div>
      </div>
    </div>
  </div>
)}