import React from 'react';
import { Dock } from './Dock';
import { TopBar } from './TopBar';
import { StartMenu } from './StartMenu';
import { Window } from './Window';
import { Spotlight } from './Spotlight';
import { useUIState } from '../store/uiState';

export const Desktop: React.FC = () => {
  const { openWindows, spotlightVisible } = useUIState();
  return (
    <div className="w-screen h-screen bg-gradient-to-br from-[#4c1d95] to-[#7e22ce] relative overflow-hidden">
      <TopBar />
      <Dock />
      <div className="absolute inset-0 pointer-events-none">
        {openWindows.map(win => (
          <Window key={win.id} {...win} />
        ))}
      </div>
      <StartMenu />
      {spotlightVisible && <Spotlight />}
    </div>
  );
}; 