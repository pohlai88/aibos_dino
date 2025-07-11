import React from 'react';

export const Spotlight: React.FC = () => (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
    <div className="bg-[#1f2937] rounded-2xl shadow-2xl p-8 w-1/2 max-w-lg text-center">
      <div className="text-2xl mb-2">Spotlight Search</div>
      <input
        className="w-full p-2 rounded bg-gray-800 text-white border border-gray-600"
        placeholder="Type to search (prototype only)"
        disabled
      />
      <div className="text-xs text-gray-400 mt-2">(CMD+Space to open, non-functional in prototype)</div>
    </div>
  </div>
); 