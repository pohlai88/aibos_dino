import React, { memo, useState } from 'react';

interface FileItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  size?: string;
  modified?: string;
  icon: string;
}

export const Files: React.FC = memo(() => {
  const [currentPath, setCurrentPath] = useState('/');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const fileItems: FileItem[] = [
    { id: '1', name: 'Documents', type: 'folder', modified: '2024-01-15', icon: '📁' },
    { id: '2', name: 'Downloads', type: 'folder', modified: '2024-01-14', icon: '📁' },
    { id: '3', name: 'Pictures', type: 'folder', modified: '2024-01-13', icon: '📁' },
    { id: '4', name: 'Music', type: 'folder', modified: '2024-01-12', icon: '📁' },
    { id: '5', name: 'Videos', type: 'folder', modified: '2024-01-11', icon: '📁' },
    { id: '6', name: 'readme.txt', type: 'file', size: '2.3 KB', modified: '2024-01-10', icon: '📄' },
    { id: '7', name: 'config.json', type: 'file', size: '1.1 KB', modified: '2024-01-09', icon: '⚙️' },
  ];

  const handleItemClick = (item: FileItem) => {
    if (item.type === 'folder') {
      setCurrentPath(currentPath + item.name + '/');
    } else {
      // TODO: Implement file opening
      console.log('Opening file:', item.name);
    }
  };

  const handleItemSelect = (itemId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const goBack = () => {
    if (currentPath !== '/') {
      const pathParts = currentPath.split('/').filter(Boolean);
      pathParts.pop();
      setCurrentPath('/' + pathParts.join('/') + '/');
    }
  };

  return (
    <div className="p-4 bg-white text-gray-800 h-full dark:bg-gray-800 dark:text-gray-200 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Files</h2>
        <div className="flex space-x-2">
          <button
            type="button"
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
            onClick={() => {
              // TODO: Implement new folder creation
              console.log('Create new folder');
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

      {/* Breadcrumb */}
      <div className="mb-4 p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm">
        <button
          type="button"
          className="text-blue-500 hover:text-blue-700 dark:text-blue-400"
          onClick={goBack}
          disabled={currentPath === '/'}
        >
          ← Back
        </button>
        <span className="ml-2 text-gray-600 dark:text-gray-300">{currentPath}</span>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-auto">
        <div className="space-y-1">
          {fileItems.map((item) => (
            <div
              key={item.id}
              className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                selectedItems.has(item.id)
                  ? 'bg-blue-100 dark:bg-blue-900'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              onClick={() => handleItemClick(item)}
              onContextMenu={(e) => {
                e.preventDefault();
                handleItemSelect(item.id, e);
              }}
            >
              <input
                type="checkbox"
                checked={selectedItems.has(item.id)}
                onChange={() => handleItemSelect(item.id, {} as React.MouseEvent)}
                className="mr-3"
                onClick={(e) => e.stopPropagation()}
              />
              <span className="text-xl mr-3">{item.icon}</span>
              <div className="flex-1">
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {item.size && `${item.size} • `}
                  {item.modified}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status bar */}
      <div className="mt-4 p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-600 dark:text-gray-300">
        {selectedItems.size > 0 
          ? `${selectedItems.size} item(s) selected`
          : `${fileItems.length} items`
        }
      </div>
    </div>
  );
});

Files.displayName = 'Files'; 