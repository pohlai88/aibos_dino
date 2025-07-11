import React from 'react';

const apps = [
  { name: 'Notepad', icon: '📝' },
  { name: 'Calculator', icon: '🧮' },
  { name: 'Files', icon: '📁' },
];

export const Dock: React.FC = () => {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex bg-black bg-opacity-30 rounded-2xl px-4 py-2 shadow-lg z-40 backdrop-blur-md">
      {apps.map(app => (
        <button
          key={app.name}
          className="mx-2 text-3xl transition-transform hover:-translate-y-2 hover:scale-110 duration-150"
          title={app.name}
        >
          {app.icon}
        </button>
      ))}
    </div>
  );
}; 