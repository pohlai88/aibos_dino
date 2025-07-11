import React from 'react';

export const Window: React.FC<any> = ({ id, component, props, zIndex }) => {
  // Placeholder for draggable window
  return (
    <div
      className="absolute top-24 left-24 w-96 h-64 bg-[#1f2937] rounded-xl shadow-2xl border border-gray-700"
      style={{ zIndex }}
    >
      <div className="flex items-center justify-between px-4 py-2 bg-[#111827] rounded-t-xl cursor-move">
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-red-500 rounded-full inline-block"></span>
          <span className="w-3 h-3 bg-yellow-400 rounded-full inline-block"></span>
          <span className="w-3 h-3 bg-green-500 rounded-full inline-block"></span>
        </div>
        <span className="text-xs text-gray-200 font-semibold">{component}</span>
        <button className="text-gray-400 hover:text-red-400">×</button>
      </div>
      <div className="p-4 text-gray-200 h-full">{component} app placeholder</div>
    </div>
  );
}; 