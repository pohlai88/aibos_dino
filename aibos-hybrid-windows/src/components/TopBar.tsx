import React, { memo, useState, useEffect } from 'react';
import { Clock } from './Clock.tsx';
import { useUIState } from '../store/uiState.ts';
import { Tooltip } from './Tooltip.tsx';

// cSpell:disable-next-line
const TOPBAR_HEIGHT = 'h-10';
// cSpell:disable-next-line
const TOPBAR_Z_INDEX = 'z-50';
const LOGO_TEXT = 'AI-BOS';

// System status types
interface SystemStatus {
  cpu: number;
  memory: number;
  network: 'online' | 'offline' | 'slow';
  battery: number;
  notifications: number;
}

const UserAvatar: React.FC = memo(() => {
  const { toggleUserMenu } = useUIState();

  const handleUserMenu = () => {
    toggleUserMenu();
  };

  return (
    <Tooltip content="User menu" shortcut="Ctrl+U" position="bottom">
      <div
        className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 transition-all duration-200 flex items-center justify-center text-white text-sm font-medium cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105"
        role="button"
        tabIndex={0}
        aria-label="User menu"
        onClick={handleUserMenu}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleUserMenu();
          }
        }}
      >
        U
      </div>
    </Tooltip>
  );
});

const Logo: React.FC = memo(() => {
  const { navigateHome } = useUIState();

  const handleHome = () => {
    navigateHome();
  };

  return (
    <Tooltip content="AI-BOS Home" shortcut="Ctrl+H">
      <div
        className="text-white text-lg font-bold tracking-widest hover:text-gray-200 transition-all duration-200 cursor-pointer select-none transform hover:scale-105"
        role="link"
        tabIndex={0}
        aria-label="Go to AI-BOS home screen"
        onClick={handleHome}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleHome();
          }
        }}
      >
        {LOGO_TEXT}
      </div>
    </Tooltip>
  );
});

const ClockWrapper: React.FC = memo(() => (
  <div
    className="text-xs text-gray-200 bg-black bg-opacity-20 px-3 py-1 rounded-full backdrop-blur-sm border border-white border-opacity-10"
    role="status"
    aria-live="polite"
    aria-label="Current time and date"
  >
    <Clock />
  </div>
));

const ThemeToggle: React.FC = memo(() => {
  const { theme, cycleTheme } = useUIState();

  const getThemeIcon = () => {
    // Return a generic theme icon since we have many theme variants
    return '🎨';
  };

  return (
    <Tooltip content={`Cycle theme (${theme})`} shortcut="Ctrl+T" position="bottom">
      <button
        type="button"
        onClick={cycleTheme}
        className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 transition-all duration-200 flex items-center justify-center text-white text-sm font-medium cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105"
        aria-label={`Cycle theme (current: ${theme})`}
      >
        {getThemeIcon()}
      </button>
    </Tooltip>
  );
});

const SystemStatusIndicator: React.FC = memo(() => {
  const [status, setStatus] = useState<SystemStatus>({
    cpu: 45,
    memory: 62,
    network: 'online',
    battery: 87,
    notifications: 3
  });

  // Simulate system status updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(prev => ({
        ...prev,
        cpu: Math.floor(Math.random() * 30) + 30,
        memory: Math.floor(Math.random() * 20) + 50,
        battery: Math.max(0, prev.battery - Math.random() * 0.1)
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (type: 'cpu' | 'memory' | 'network' | 'battery') => {
    switch (type) {
      case 'cpu':
        return status.cpu > 80 ? 'bg-red-500' : status.cpu > 60 ? 'bg-yellow-500' : 'bg-green-500';
      case 'memory':
        return status.memory > 80 ? 'bg-red-500' : status.memory > 60 ? 'bg-yellow-500' : 'bg-green-500';
      case 'network':
        return status.network === 'online' ? 'bg-green-500' : status.network === 'slow' ? 'bg-yellow-500' : 'bg-red-500';
      case 'battery':
        return status.battery > 20 ? 'bg-green-500' : status.battery > 10 ? 'bg-yellow-500' : 'bg-red-500';
      default:
        return 'bg-green-500';
    }
  };

  const getNetworkIcon = () => {
    switch (status.network) {
      case 'online': return '📶';
      case 'slow': return '📶';
      case 'offline': return '❌';
      default: return '📶';
    }
  };

  const getBatteryIcon = () => {
    if (status.battery > 80) return '🔋';
    if (status.battery > 60) return '🔋';
    if (status.battery > 40) return '🔋';
    if (status.battery > 20) return '🔋';
    return '🔋';
  };

  return (
    <div className="hidden sm:flex items-center space-x-2">
      {/* CPU Usage */}
      <Tooltip content={`CPU: ${status.cpu}%`} position="bottom">
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${getStatusColor('cpu')} opacity-80`} />
          <span className="text-xs text-gray-300">{status.cpu}%</span>
        </div>
      </Tooltip>

      {/* Memory Usage */}
      <Tooltip content={`Memory: ${status.memory}%`} position="bottom">
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${getStatusColor('memory')} opacity-80`} />
          <span className="text-xs text-gray-300">{status.memory}%</span>
        </div>
      </Tooltip>

      {/* Network Status */}
      <Tooltip content={`Network: ${status.network}`} position="bottom">
        <div className="flex items-center space-x-1">
          <span className="text-xs">{getNetworkIcon()}</span>
          <div className={`w-2 h-2 rounded-full ${getStatusColor('network')} opacity-80`} />
        </div>
      </Tooltip>

      {/* Battery Status */}
      <Tooltip content={`Battery: ${Math.round(status.battery)}%`} position="bottom">
        <div className="flex items-center space-x-1">
          <span className="text-xs">{getBatteryIcon()}</span>
          <span className="text-xs text-gray-300">{Math.round(status.battery)}%</span>
        </div>
      </Tooltip>
    </div>
  );
});

const NotificationIndicator: React.FC = memo(() => {
  const [notifications, setNotifications] = useState(3);
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (notifications > 0) {
      setNotifications(0);
    }
  };

  return (
    <Tooltip content={`${notifications} notifications`} position="bottom">
      <div className="relative">
        <button
          type="button"
          onClick={handleToggle}
          className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 transition-all duration-200 flex items-center justify-center text-white text-sm font-medium cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105 relative"
          aria-label={`${notifications} notifications`}
        >
          🔔
          {notifications > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
              {notifications > 9 ? '9+' : notifications}
            </span>
          )}
        </button>
      </div>
    </Tooltip>
  );
});

const SearchButton: React.FC = memo(() => {
  const { toggleSpotlight } = useUIState();

  const handleSearch = () => {
    toggleSpotlight();
  };

  return (
    <Tooltip content="Search" shortcut="Ctrl+K" position="bottom">
      <button
        type="button"
        onClick={handleSearch}
        className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 transition-all duration-200 flex items-center justify-center text-white text-sm font-medium cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105"
        aria-label="Search"
      >
        🔍
      </button>
    </Tooltip>
  );
});

export const TopBar: React.FC = memo(() => {
  return (
    <header
      // cSpell:disable-next-line
      className={`fixed top-0 left-0 w-full ${TOPBAR_HEIGHT} bg-black bg-opacity-40 backdrop-blur-md flex items-center justify-between px-4 ${TOPBAR_Z_INDEX} border-b border-white border-opacity-10 shadow-lg`}
      role="banner"
      aria-label="Top navigation bar"
    >
      {/* Left side - Logo */}
      <div className="flex items-center">
        <Logo />
      </div>

      {/* Center - Clock */}
      <div className="flex items-center justify-center flex-1 max-w-xs">
        <ClockWrapper />
      </div>

      {/* Right side - System icons + User */}
      <div className="flex items-center space-x-3">
        {/* System Status Indicators */}
        <SystemStatusIndicator />
        
        {/* Search Button */}
        <SearchButton />
        
        {/* Notification Indicator */}
        <NotificationIndicator />
        
        {/* Theme Toggle Button */}
        <ThemeToggle />
        
        {/* User Avatar */}
        <UserAvatar />
      </div>
    </header>
  );
});

TopBar.displayName = 'TopBar';
UserAvatar.displayName = 'UserAvatar';
Logo.displayName = 'Logo';
ClockWrapper.displayName = 'ClockWrapper';
ThemeToggle.displayName = 'ThemeToggle';
SystemStatusIndicator.displayName = 'SystemStatusIndicator';
NotificationIndicator.displayName = 'NotificationIndicator';
SearchButton.displayName = 'SearchButton';
