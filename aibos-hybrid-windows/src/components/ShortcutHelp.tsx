import React, { memo } from 'react';
import { useUIState } from '../store/uiState.ts';

interface ShortcutItem {
  key: string;
  description: string;
  category: string;
}

const SHORTCUTS: ShortcutItem[] = [
  { key: 'Ctrl/Cmd + Space', description: 'Toggle Spotlight Search', category: 'Navigation' },
  { key: 'Ctrl/Cmd + Escape', description: 'Toggle Start Menu', category: 'Navigation' },
  { key: 'Ctrl/Cmd + H', description: 'Navigate to Home', category: 'Navigation' },
  { key: 'Ctrl/Cmd + U', description: 'Toggle User Menu', category: 'User' },
  { key: 'Ctrl/Cmd + T', description: 'Cycle Theme (10 beautiful themes)', category: 'Appearance' },
  { key: 'F1', description: 'Show Keyboard Shortcuts', category: 'Help' },
];

interface ShortcutHelpProps {
  isVisible: boolean;
  onClose: () => void;
}

export const ShortcutHelp: React.FC<ShortcutHelpProps> = memo(({ isVisible, onClose }) => {
  if (!isVisible) return null;

  const groupedShortcuts = SHORTCUTS.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutItem[]>);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-white text-lg font-semibold">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close shortcuts help"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
            <div key={category} className="mb-6 last:mb-0">
              <h3 className="text-gray-300 text-sm font-medium mb-3 uppercase tracking-wide">
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts.map((shortcut) => (
                  <div key={shortcut.key} className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">{shortcut.description}</span>
                    <kbd className="px-2 py-1 bg-gray-800 text-gray-300 text-xs font-mono rounded border border-gray-600">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-800 rounded-b-lg">
          <p className="text-gray-400 text-xs text-center">
            Press <kbd className="px-1 py-0.5 bg-gray-700 text-gray-300 text-xs font-mono rounded border border-gray-600">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
});

ShortcutHelp.displayName = 'ShortcutHelp'; 