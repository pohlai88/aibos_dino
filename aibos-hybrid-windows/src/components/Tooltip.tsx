import React, { useState } from 'react';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  shortcut?: string;
  position?: 'top' | 'bottom';
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  shortcut,
  position = 'top'
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = position === 'bottom' 
    ? 'top-full left-1/2 transform -translate-x-1/2 mt-2' 
    : 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';

  const arrowClasses = position === 'bottom'
    ? 'top-0 left-1/2 transform -translate-x-1/2 -translate-y-full border-b-gray-800'
    : 'bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full border-t-gray-800';

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      
      {isVisible && (
        <div className={`absolute z-[9999] ${positionClasses}`} role="tooltip">
          {/* Arrow */}
          <div className={`absolute w-0 h-0 border-4 border-transparent ${arrowClasses}`} />
          
          {/* Tooltip content */}
          <div className="bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-gray-700 whitespace-nowrap">
            <div className="flex items-center space-x-2">
              <span>{content}</span>
              {shortcut && (
                <>
                  <span className="text-gray-400">•</span>
                  <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs font-mono border border-gray-600">
                    {shortcut}
                  </kbd>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 