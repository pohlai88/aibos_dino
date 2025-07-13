import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIState } from '../store/uiState.ts';
import { getColor } from '../utils/themeHelpers.ts';
import { useDeviceInfo } from '../utils/responsive.ts';

interface WindowGroupManagerProps {
  isVisible: boolean;
  onClose: () => void;
}

export const WindowGroupManager: React.FC<WindowGroupManagerProps> = ({ isVisible, onClose }) => {
  const { 
    colorMode, 
    windowGroups, 
    openWindows, 
    createWindowGroup, 
    addWindowToGroup, 
    removeWindowFromGroup,
    setActiveGroup,
    closeGroup 
  } = useUIState();
  
  const deviceInfo = useDeviceInfo();
  const { isMobile, isTablet } = deviceInfo;
  
  const [selectedWindows, setSelectedWindows] = useState<Set<string>>(new Set());
  const [newGroupName, setNewGroupName] = useState('');

  // Get ungrouped windows
  const ungroupedWindows = useMemo(() => {
    return openWindows.filter(win => !win.groupId);
  }, [openWindows]);

  // Get grouped windows
  const groupedWindows = useMemo(() => {
    return openWindows.filter(win => win.groupId);
  }, [openWindows]);

  const handleWindowSelect = useCallback((windowId: string) => {
    setSelectedWindows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(windowId)) {
        newSet.delete(windowId);
      } else {
        newSet.add(windowId);
      }
      return newSet;
    });
  }, []);

  const handleCreateGroup = useCallback(() => {
    if (!newGroupName.trim() || selectedWindows.size === 0) return;
    
    const groupId = createWindowGroup(newGroupName.trim(), Array.from(selectedWindows));
    
    // Add selected windows to the group
    selectedWindows.forEach(windowId => {
      addWindowToGroup(windowId, groupId);
    });
    
    setNewGroupName('');
    setSelectedWindows(new Set());
    onClose();
  }, [newGroupName, selectedWindows, createWindowGroup, addWindowToGroup, onClose]);

  const handleRemoveFromGroup = useCallback((windowId: string) => {
    removeWindowFromGroup(windowId);
  }, [removeWindowFromGroup]);

  const handleCloseGroup = useCallback((groupId: string) => {
    closeGroup(groupId);
  }, [closeGroup]);

  const handleActivateGroup = useCallback((groupId: string) => {
    setActiveGroup(groupId);
  }, [setActiveGroup]);

  // Performance: Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => 
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, 
    []
  );

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        exit={{ y: 20 }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
        className={`
          bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4
          ${isMobile ? 'max-h-[90vh]' : 'max-h-[80vh]'}
        `}
        style={{
          backgroundColor: getColor('glass.dark.20', colorMode),
          backdropFilter: 'blur(16px)',
          border: `1px solid ${getColor('glass.dark.30', colorMode)}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4 border-b"
          style={{ borderBottom: `1px solid ${getColor('glass.dark.30', colorMode)}` }}
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Window Groups & Tabs
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Create New Group */}
          <div className="space-y-3">
            <h3 className="text-md font-medium text-gray-900 dark:text-white">
              Create New Group
            </h3>
            
            <div className="space-y-2">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter group name..."
                className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                style={{ borderColor: getColor('glass.dark.30', colorMode) }}
              />
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Select windows to group:
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {ungroupedWindows.map((window) => (
                  <label
                    key={window.id}
                    className={`
                      flex items-center p-2 rounded cursor-pointer transition-colors
                      ${selectedWindows.has(window.id)
                        ? 'bg-blue-100 dark:bg-blue-900'
                        : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={selectedWindows.has(window.id)}
                      onChange={() => handleWindowSelect(window.id)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-900 dark:text-white truncate">
                      {window.component}
                    </span>
                  </label>
                ))}
              </div>
              
              <button
                type="button"
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || selectedWindows.size === 0}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create Group ({selectedWindows.size} windows)
              </button>
            </div>
          </div>

          {/* Existing Groups */}
          <div className="space-y-3">
            <h3 className="text-md font-medium text-gray-900 dark:text-white">
              Existing Groups ({Object.keys(windowGroups).length})
            </h3>
            
            <div className="space-y-2">
              {Object.values(windowGroups).map((group) => {
                const groupWindows = openWindows.filter(win => group.windowIds.includes(win.id));
                return (
                  <div
                    key={group.id}
                    className="p-3 border rounded-md"
                    style={{ borderColor: getColor('glass.dark.30', colorMode) }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {group.name} ({groupWindows.length})
                      </h4>
                      <div className="flex space-x-1">
                        <button
                          type="button"
                          onClick={() => handleActivateGroup(group.id)}
                          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        >
                          Activate
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCloseGroup(group.id)}
                          className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      {groupWindows.map((window) => (
                        <div
                          key={window.id}
                          className="flex items-center justify-between p-1 text-sm"
                        >
                          <span className="text-gray-700 dark:text-gray-300">
                            {window.component}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFromGroup(window.id)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              
              {Object.keys(windowGroups).length === 0 && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                  No window groups created yet
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}; 