import React from 'react';
import { motion } from 'framer-motion';

// If you need to import other components, use the .tsx extension, e.g.:
// import { TopBar } from './TopBar.tsx';
// import { StartMenu } from './StartMenu.tsx';
// import { Window } from './Window.tsx';
// import { Spotlight } from './Spotlight.tsx';

type App = { name: string; icon: string };
const apps: App[] = [
  { name: 'Notepad', icon: '📝' },
  { name: 'Calculator', icon: '🧮' },
  { name: 'Files', icon: '📁' },
];

interface DockProps {
  onAppClick?: (appName: string) => void;
}

export const Dock: React.FC<DockProps> = ({ onAppClick }) => {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex bg-black bg-opacity-30 rounded-2xl px-4 py-2 shadow-lg z-40 backdrop-blur-md">
      {apps.map(app => (
        <motion.button
          key={app.name}
          whileHover={{ scale: 1.4 }}
          className="mx-2 text-3xl"
          title={app.name}
          aria-label={app.name}
          type="button"
          onClick={() => onAppClick?.(app.name)}
        >
          {app.icon}
        </motion.button>
      ))}
    </div>
  );
};