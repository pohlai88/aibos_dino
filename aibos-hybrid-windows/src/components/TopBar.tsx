import React, { memo } from 'react';
import { Clock } from './Clock.tsx';
import { useUIState } from '../store/uiState.ts';
import { Tooltip } from './Tooltip.tsx';

// cSpell:disable-next-line
const TOPBAR_HEIGHT = 'h-10';
// cSpell:disable-next-line
const TOPBAR_Z_INDEX = 'z-50';
const LOGO_TEXT = 'AI-BOS';

const UserAvatar: React.FC = memo(() => {
  const { toggleUserMenu } = useUIState();

  const handleUserMenu = () => {
    toggleUserMenu();
  };

  return (
    <Tooltip content="User menu" shortcut="Ctrl+U" position="bottom">
      <div
        className="w-7 h-7 rounded-full bg-gray-600 hover:bg-gray-500 transition-colors duration-200 flex items-center justify-center text-white text-sm font-medium cursor-pointer"
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
        className="text-white text-lg font-bold tracking-widest hover:text-gray-200 transition-colors duration-200 cursor-pointer select-none"
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
    className="text-xs text-gray-200"
    role="status"
    aria-live="polite"
    aria-label="Current time and date"
  >
    <Clock />
  </div>
));

const ThemeToggle: React.FC = memo(() => {
  const { theme, cycleTheme } = useUIState();

  return (
    <Tooltip content={`Cycle theme (${theme})`} shortcut="Ctrl+T" position="bottom">
      <button
        type="button"
        onClick={cycleTheme}
        className="w-7 h-7 rounded-full bg-gray-600 hover:bg-gray-500 transition-colors duration-200 flex items-center justify-center text-white text-sm font-medium cursor-pointer"
        aria-label={`Cycle theme (current: ${theme})`}
      >
        🎨
      </button>
    </Tooltip>
  );
});

export const TopBar: React.FC = memo(() => {
  return (
    <header
      // cSpell:disable-next-line
      className={`fixed top-0 left-0 w-full ${TOPBAR_HEIGHT} bg-black bg-opacity-40 backdrop-blur-md flex items-center justify-between px-4 ${TOPBAR_Z_INDEX} border-b border-white border-opacity-10`}
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
      <div className="flex items-center space-x-2">
        <div
          className="hidden sm:flex items-center space-x-1"
          aria-hidden="true"
        >
          <Tooltip content="System Status" position="bottom">
            <div
              className="w-4 h-4 rounded-full bg-green-500 opacity-60 cursor-help"
            />
          </Tooltip>
        </div>
        
        {/* Theme Toggle Button */}
        <ThemeToggle />
        
        <UserAvatar />
      </div>
    </header>
  );
});

TopBar.displayName = 'TopBar';
UserAvatar.displayName = 'UserAvatar';
Logo.displayName = 'Logo';
ClockWrapper.displayName = 'ClockWrapper';
