import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIState } from '../store/uiState.ts';
import { getColor } from '../utils/themeHelpers.ts';
import { useDeviceInfo } from '../utils/responsive.ts';
import { notificationManager } from '../services/notificationManager.ts';

interface NotificationCenterProps {
  isVisible: boolean;
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ isVisible, onClose }) => {
  const { colorMode } = useUIState();
  const deviceInfo = useDeviceInfo();
  const { isMobile, isTablet } = deviceInfo;
  
  const [notifications, setNotifications] = useState(() => notificationManager.getNotifications());
  const [showSettings, setShowSettings] = useState(false);

  // Refresh notifications
  const refreshNotifications = useCallback(() => {
    setNotifications(notificationManager.getNotifications());
  }, []);

  const handleMarkAsRead = useCallback((id: string) => {
    notificationManager.markAsRead(id);
    refreshNotifications();
  }, [refreshNotifications]);

  const handleRemove = useCallback((id: string) => {
    notificationManager.remove(id);
    refreshNotifications();
  }, [refreshNotifications]);

  const handleClearAll = useCallback(() => {
    notificationManager.clearAll();
    refreshNotifications();
  }, [refreshNotifications]);

  const getTypeColor = useCallback((type: string) => {
    switch (type) {
      case 'success': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-blue-500';
    }
  }, []);

  const getTypeBg = useCallback((type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 dark:bg-green-900';
      case 'warning': return 'bg-yellow-100 dark:bg-yellow-900';
      case 'error': return 'bg-red-100 dark:bg-red-900';
      default: return 'bg-blue-100 dark:bg-blue-900';
    }
  }, []);

  // Performance: Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => 
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, 
    []
  );

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
      className="fixed top-0 right-0 h-full w-80 z-50"
      style={{
        backgroundColor: getColor('glass.dark.20', colorMode),
        backdropFilter: 'blur(16px)',
        borderLeft: `1px solid ${getColor('glass.dark.30', colorMode)}`,
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 border-b"
        style={{ borderBottom: `1px solid ${getColor('glass.dark.30', colorMode)}` }}
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Notifications ({notificationManager.getUnreadCount()})
        </h2>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
            aria-label="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
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
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {showSettings ? (
          <NotificationSettings onClose={() => setShowSettings(false)} />
        ) : (
          <div className="p-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <div className="text-4xl mb-4">🔔</div>
                <div className="text-lg font-medium">No notifications</div>
                <div className="text-sm">You're all caught up!</div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-sm text-red-500 hover:text-red-700 transition-colors"
                  >
                    Clear all
                  </button>
                </div>

                <AnimatePresence>
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
                      className={`
                        p-3 rounded-lg border transition-all cursor-pointer
                        ${notification.isRead 
                          ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700' 
                          : 'bg-white dark:bg-gray-700 border-blue-200 dark:border-blue-600'
                        }
                      `}
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`text-2xl ${getTypeColor(notification.type)}`}>
                          {notification.icon || '📢'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-900 dark:text-white truncate">
                              {notification.title}
                            </h3>
                            <div className="flex items-center space-x-1">
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemove(notification.id);
                                }}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500 dark:text-gray-500">
                              {new Date(notification.timestamp).toLocaleTimeString()}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${getTypeBg(notification.type)} ${getTypeColor(notification.type)}`}>
                              {notification.type}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Notification Settings Component
const NotificationSettings: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { colorMode } = useUIState();
  const [settings, setSettings] = useState(() => notificationManager.getSettings());

  const handleSettingChange = useCallback((key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    notificationManager.updateSettings(newSettings);
  }, [settings]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-md font-medium text-gray-900 dark:text-white">Notification Settings</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-3">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => handleSettingChange('enabled', e.target.checked)}
            className="mr-3"
          />
          <span className="text-sm text-gray-900 dark:text-white">Enable notifications</span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={settings.sound}
            onChange={(e) => handleSettingChange('sound', e.target.checked)}
            className="mr-3"
          />
          <span className="text-sm text-gray-900 dark:text-white">Play notification sounds</span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={settings.desktop}
            onChange={(e) => handleSettingChange('desktop', e.target.checked)}
            className="mr-3"
          />
          <span className="text-sm text-gray-900 dark:text-white">Show desktop notifications</span>
        </label>

        <div>
          <label className="block text-sm text-gray-900 dark:text-white mb-2">
            Notification duration (seconds)
          </label>
          <input
            type="range"
            min="1"
            max="30"
            value={settings.duration / 1000}
            onChange={(e) => handleSettingChange('duration', parseInt(e.target.value) * 1000)}
            className="w-full"
          />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {settings.duration / 1000} seconds
          </span>
        </div>

        <div>
          <label className="block text-sm text-gray-900 dark:text-white mb-2">
            Position
          </label>
          <select
            value={settings.position}
            onChange={(e) => handleSettingChange('position', e.target.value)}
            className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="top-right">Top Right</option>
            <option value="top-left">Top Left</option>
            <option value="bottom-right">Bottom Right</option>
            <option value="bottom-left">Bottom Left</option>
          </select>
        </div>
      </div>
    </div>
  );
}; 