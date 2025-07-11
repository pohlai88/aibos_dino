import React from 'react';
import { useUIState } from '../store/uiState.ts';

const apps = [
  { name: 'Notepad', icon: '📝' },
  { name: 'Calculator', icon: '🧮' },
  { name: 'Files', icon: '📁' },
];

export const StartMenu: React.FC = () => {
  const { startMenuVisible, closeStartMenu } = useUIState();

  if (!startMenuVisible) return null;

  return (
    <div className="fixed left-4 bottom-20 w-64 bg-gray-900 bg-opacity-95 rounded-xl shadow-2xl border border-gray-700 z-50 p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-lg font-bold text-white">Start Menu</span>
        <button
          type="button"
          className="text-gray-400 hover:text-red-400"
          aria-label="Close start menu"
          onClick={closeStartMenu}
        >
          ×
        </button>
      </div>
      <ul>
        {apps.map(app => (
          <li key={app.name} className="flex items-center space-x-2 py-2 px-2 rounded hover:bg-gray-800 cursor-pointer">
            <span className="text-2xl">{app.icon}</span>
            <span className="text-white">{app.name}</span>
            <button type="button" className="ml-auto text-xs text-gray-400 hover:text-blue-400">Open</button>
          </li>
        ))}
      </ul>
    </div>
  );
};
