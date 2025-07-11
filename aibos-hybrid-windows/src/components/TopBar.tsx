import React from 'react';

export const TopBar: React.FC = () => {
  return (
    <div className="fixed top-0 left-0 w-full h-10 bg-black bg-opacity-40 backdrop-blur-md flex items-center px-4 z-50">
      <div className="flex space-x-4 text-sm font-medium">
        <span className="hover:underline cursor-pointer">File</span>
        <span className="hover:underline cursor-pointer">Edit</span>
        <span className="hover:underline cursor-pointer">View</span>
      </div>
      <div className="flex-1 text-center text-xs text-gray-200">
        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="flex items-center space-x-2">
        <div className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center text-white">U</div>
      </div>
    </div>
  );
}; 