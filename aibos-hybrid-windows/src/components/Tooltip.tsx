import React, { useState, useRef, useEffect, useCallback } from 'react';

interface TooltipProps {
  children: React.ReactNode;
  content: string | React.ReactNode;
  shortcut?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  delay?: number;
  maxWidth?: number;
  className?: string;
  disabled?: boolean;
  showArrow?: boolean;
  theme?: 'dark' | 'light' | 'auto';
  size?: 'sm' | 'md' | 'lg';
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  shortcut,
  position = 'top',
  delay = 300,
  maxWidth = 300,
  className = '',
  disabled = false,
  showArrow = true,
  theme = 'dark',
  size = 'md'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDelayed, setIsDelayed] = useState(false);
  const timeoutRef = useRef<number>();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Position classes mapping
  const positionClasses = {
    'top': 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    'bottom': 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    'left': 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    'right': 'left-full top-1/2 transform -translate-y-1/2 ml-2',
    'top-left': 'bottom-full right-0 mb-2',
    'top-right': 'bottom-full left-0 mb-2',
    'bottom-left': 'top-full right-0 mt-2',
    'bottom-right': 'top-full left-0 mt-2'
  };

  // Arrow classes mapping
  const arrowClasses = {
    'top': 'bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full border-t-gray-800',
    'bottom': 'top-0 left-1/2 transform -translate-x-1/2 -translate-y-full border-b-gray-800',
    'left': 'right-0 top-1/2 transform -translate-y-1/2 translate-x-full border-l-gray-800',
    'right': 'left-0 top-1/2 transform -translate-y-1/2 -translate-x-full border-r-gray-800',
    'top-left': 'bottom-0 right-2 translate-y-full border-t-gray-800',
    'top-right': 'bottom-0 left-2 translate-y-full border-t-gray-800',
    'bottom-left': 'top-0 right-2 -translate-y-full border-b-gray-800',
    'bottom-right': 'top-0 left-2 -translate-y-full border-b-gray-800'
  };

  // Theme classes
  const themeClasses = {
    dark: 'bg-gray-800 text-white border-gray-700',
    light: 'bg-white text-gray-900 border-gray-200 shadow-lg',
    auto: 'bg-gray-800 text-white border-gray-700 dark:bg-white dark:text-gray-900 dark:border-gray-200'
  };

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-3'
  };

  // Handle mouse enter with delay
  const handleMouseEnter = useCallback(() => {
    if (disabled) return;
    
    timeoutRef.current = setTimeout(() => {
      setIsDelayed(true);
      setIsVisible(true);
    }, delay);
  }, [disabled, delay]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsDelayed(false);
    setIsVisible(false);
  }, []);

  // Handle focus/blur for accessibility
  const handleFocus = useCallback(() => {
    if (disabled) return;
    setIsVisible(true);
  }, [disabled]);

  const handleBlur = useCallback(() => {
    setIsVisible(false);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        setIsVisible(false);
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
    
    return undefined;
  }, [isVisible]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Auto-position adjustment based on viewport
  useEffect(() => {
    if (isVisible && tooltipRef.current && triggerRef.current) {
      const tooltip = tooltipRef.current;
      const tooltipRect = tooltip.getBoundingClientRect();
      
      // Check if tooltip goes outside viewport and adjust position
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      if (tooltipRect.right > viewportWidth) {
        tooltip.style.left = 'auto';
        tooltip.style.right = '0';
      }
      
      if (tooltipRect.bottom > viewportHeight) {
        tooltip.style.top = 'auto';
        tooltip.style.bottom = '100%';
        tooltip.style.marginBottom = '0.5rem';
        tooltip.style.marginTop = '0';
      }
    }
  }, [isVisible, position]);

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <div
      ref={triggerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      tabIndex={0}
      role="button"
      aria-describedby={isVisible ? 'tooltip-content' : undefined}
    >
      {children}
      
      {isVisible && (
        <div
          ref={tooltipRef}
          id="tooltip-content"
          className={`
            absolute z-[9999] ${positionClasses[position]}
            transition-all duration-200 ease-out
            ${isDelayed ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
            ${themeClasses[theme]}
            ${sizeClasses[size]}
            rounded-lg border shadow-lg
            max-w-[${maxWidth}px]
            whitespace-normal
          `}
          role="tooltip"
          aria-hidden={!isVisible}
        >
          {/* Arrow */}
          {showArrow && (
            <div 
              className={`
                absolute w-0 h-0 border-4 border-transparent
                ${arrowClasses[position]}
              `} 
            />
          )}
          
          {/* Tooltip content */}
          <div className="flex items-center space-x-2">
            <span>{content}</span>
            {shortcut && (
              <>
                <span className="text-gray-400 dark:text-gray-500">•</span>
                <kbd className="px-1.5 py-0.5 bg-gray-700 dark:bg-gray-600 rounded text-xs font-mono border border-gray-600 dark:border-gray-500">
                  {shortcut}
                </kbd>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 