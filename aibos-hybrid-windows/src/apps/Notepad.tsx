import React, { memo, useState } from 'react';

export const Notepad: React.FC = memo(() => {
  const [content, setContent] = useState('');

  return (
    <div className="p-4 bg-white text-gray-800 h-full dark:bg-gray-800 dark:text-gray-200 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Notepad</h2>
        <div className="flex space-x-2">
          <button
            type="button"
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
            onClick={() => setContent('')}
          >
            New
          </button>
          <button
            type="button"
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
            onClick={() => {
              // TODO: Implement save functionality
              console.log('Save content:', content);
            }}
          >
            Save
          </button>
        </div>
      </div>
      
      <textarea 
        className="flex-1 w-full p-3 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
        placeholder="Start typing..."
        value={content}
        onChange={(e) => setContent((e.target as any).value)}
      />
      
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {content.length} characters
      </div>
    </div>
  );
});

Notepad.displayName = 'Notepad'; 