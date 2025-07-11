import React from 'react';

export const Window: React.FC<any> = ({ id, component, props, zIndex }) => {
  // Placeholder for draggable window
  return (
    <div
      className="absolute top-24 left-24 w-96 h-64 bg-window rounded-xl shadow-soft border border-border"
      style={{ zIndex }}
    >
      <div className="flex items-center justify-between px-4 py-2 bg-white bg-opacity-80 rounded-t-xl cursor-move border-b border-border">
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-red-400 rounded-full inline-block"></span>
          <span className="w-3 h-3 bg-yellow-300 rounded-full inline-block"></span>
          <span className="w-3 h-3 bg-green-400 rounded-full inline-block"></span>
        </div>
        <span className="text-xs text-text font-semibold">{component}</span>
        <button className="text-accent hover:bg-accentLight hover:text-white rounded p-1">×</button>
      </div>
      <div className="p-4 text-textMuted h-full">{component} app placeholder</div>
    </div>
  );
}; 