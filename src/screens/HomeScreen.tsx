import React from 'react';
import { Settings, Power } from 'lucide-react';
import { TopLogo } from '../components/TopLogo';
import { SideCharacters } from '../components/SideCharacters';
import { soundManager } from '../audio/soundManager';
import { GameScreen } from '../types/game';

interface HomeScreenProps {
  onNavigate: (screen: GameScreen) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const handleHover = () => {
    soundManager.playHover();
  };

  const handleClick = (screen: GameScreen) => {
    soundManager.playClick();
    onNavigate(screen);
  };

  return (
    <div className="screen-wrapper">
      <TopLogo />

      {/* Persistent Animated Side Characters */}
      <SideCharacters leftState="idle" rightState="idle" />

      {/* Center 3 Action Buttons */}
      <div className="home-menu-center">
        <button
          id="btn-home-play"
          className="btn-play-master"
          onMouseEnter={handleHover}
          onClick={() => handleClick('modes')}
        >
          <span>→</span>
          <span>PLAY</span>
          <span>←</span>
        </button>

        <button
          id="btn-home-settings"
          className="btn-slate-menu"
          onMouseEnter={handleHover}
          onClick={() => handleClick('settings')}
        >
          <Settings size={20} />
          <span>SETTINGS</span>
        </button>

        <button
          id="btn-home-quit"
          className="btn-slate-menu"
          onMouseEnter={handleHover}
          onClick={() => handleClick('quit')}
        >
          <Power size={20} />
          <span>QUIT</span>
        </button>
      </div>
    </div>
  );
};
