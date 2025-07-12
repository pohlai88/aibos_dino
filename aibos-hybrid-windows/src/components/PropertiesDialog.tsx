import React, { memo, useState, useEffect } from 'react';

// Updated to match Files.tsx interface
interface BaseItem {
  id: string;
  name: string;
  icon: string;
}

interface FolderItem extends BaseItem {
  type: 'folder';
  modified: string;
  itemCount?: number;
}

interface FileEntry extends BaseItem {
  type: 'file';
  size: string;
  modified: string;
  extension?: string;
}

type FileItem = FolderItem | FileEntry;

interface PropertiesDialogProps {
  isVisible: boolean;
  item: FileItem | null;
  onClose: () => void;
  onRename?: (newName: string) => void;
  onDelete?: () => void;
}

export const PropertiesDialog: React.FC<PropertiesDialogProps> = memo(({ 
  isVisible, 
  item, 
  onClose,
  onRename,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'details'>('general');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (item) {
      setEditName(item.name);
    }
  }, [item]);

  if (!isVisible || !item) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (size: string) => {
    // Convert size string to bytes and format nicely
    const sizeMap: Record<string, number> = {
      '1 KB': 1024,
      '1 MB': 1024 * 1024,
      '1 GB': 1024 * 1024 * 1024,
    };
    
    const bytes = sizeMap[size] || parseInt(size) || 0;
    
    if (bytes === 0) return size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const getFileType = () => {
    if (item.type === 'folder') return 'File Folder';
    const extension = item.name.split('.').pop()?.toUpperCase();
    return extension ? `${extension} File` : 'File';
  };

  const getMimeType = () => {
    if (item.type === 'folder') return 'inode/directory';
    const extension = item.name.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'txt': 'text/plain',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'mp3': 'audio/mpeg',
      'mp4': 'video/mp4',
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
    };
    return mimeTypes[extension || ''] || 'application/octet-stream';
  };

  const handleRename = () => {
    if (editName.trim() && editName !== item.name && onRename) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (onDelete) {
      setIsDeleting(true);
      try {
        await onDelete();
        onClose();
      } catch (error) {
        console.error('Failed to delete item:', error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleRename();
    } else if (event.key === 'Escape') {
      setIsEditing(false);
      setEditName(item.name);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600">
          <div className="flex items-center space-x-4">
            <span className="text-5xl">{item.icon}</span>
            <div>
              {isEditing ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleRename}
                  className="text-xl font-semibold bg-transparent border-b-2 border-blue-500 focus:outline-none text-gray-900 dark:text-gray-100"
                  autoFocus
                />
              ) : (
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {item.name}
                </h3>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {getFileType()}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Rename"
            >
              ✏️
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {(['general', 'security', 'details'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Type:</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">{getFileType()}</span>
                  </div>

                  {item.type === 'file' && item.size && (
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Size:</span>
                      <span className="text-gray-900 dark:text-gray-100 font-medium">{formatFileSize(item.size)}</span>
                    </div>
                  )}

                  {item.type === 'folder' && item.itemCount !== undefined && (
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Items:</span>
                      <span className="text-gray-900 dark:text-gray-100 font-medium">{item.itemCount} items</span>
                    </div>
                  )}

                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Modified:</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">{formatDate(item.modified)}</span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Created:</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">{formatDate(item.modified)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Location:</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">/Program Files</span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Attributes:</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                      {item.type === 'folder' ? 'Directory' : 'Archive'}
                    </span>
                  </div>

                  {item.type === 'file' && (
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Extension:</span>
                      <span className="text-gray-900 dark:text-gray-100 font-medium">
                        {item.name.split('.').pop()?.toUpperCase() || 'None'}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    <span className="text-green-600 dark:text-green-400 font-medium">✓ Available</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Permissions</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700 dark:text-blue-300">Owner:</span>
                    <span className="text-blue-900 dark:text-blue-100 font-medium">Administrator</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700 dark:text-blue-300">Group:</span>
                    <span className="text-blue-900 dark:text-blue-100 font-medium">Users</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700 dark:text-blue-300">Permissions:</span>
                    <span className="text-blue-900 dark:text-blue-100 font-medium">Read & Write</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">Access Control</h4>
                <div className="grid grid-cols-1 gap-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Read</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Write</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Execute</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">MIME Type:</span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium font-mono text-sm">{getMimeType()}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">File ID:</span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium font-mono text-sm">{item.id}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Encoding:</span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">UTF-8</span>
                </div>

                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Compression:</span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">None</span>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">File Hash</h4>
                <div className="font-mono text-xs text-gray-600 dark:text-gray-400 break-all">
                  SHA256: a1b2c3d4e5f6...
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="flex space-x-2">
            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center space-x-2"
              >
                {isDeleting ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <span>🗑️</span>
                    <span>Delete</span>
                  </>
                )}
              </button>
            )}
          </div>
          
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

PropertiesDialog.displayName = 'PropertiesDialog'; 