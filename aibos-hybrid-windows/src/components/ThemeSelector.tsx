import React, { memo } from 'react';
import { useUIState } from '../store/uiState.ts';
import { themeConfigs, getThemesByCategory, ThemeVariant } from '../utils/themeManager.ts';

interface ThemeSelectorProps {
  onClose?: () => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = memo(({ onClose }) => {
  const { theme, setTheme } = useUIState();
  const themesByCategory = getThemesByCategory();

  const handleThemeSelect = (selectedTheme: ThemeVariant) => {
    setTheme(selectedTheme);
    onClose?.();
  };

  return (
    <div className="p-4 bg-white text-gray-800 h-full dark:bg-gray-800 dark:text-gray-200 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Theme Selector</h2>
        {onClose && (
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            onClick={onClose}
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {Object.entries(themesByCategory).map(([category, themes]) => (
          <div key={category} className="mb-6">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">
              {category}
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {themes.map((themeVariant) => {
                const config = themeConfigs[themeVariant];
                const isSelected = theme === themeVariant;
                
                return (
                  <button
                    key={themeVariant}
                    type="button"
                    onClick={() => handleThemeSelect(themeVariant)}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{config.icon}</div>
                      <div className="flex-1">
                        <div className="font-medium">{config.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {config.description}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="text-blue-500">✓</div>
                      )}
                    </div>
                    
                    {/* Theme preview */}
                    <div className={`mt-2 h-8 rounded ${config.gradient} opacity-80`} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <strong>Tip:</strong> Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs">Ctrl+T</kbd> to cycle through themes quickly.
        </div>
      </div>
    </div>
  );
});

ThemeSelector.displayName = 'ThemeSelector'; 