import React from 'react';
import { ArrowLeft, Home } from 'lucide-react';
import { TopLogo } from '../components/TopLogo';
import { SideCharacters } from '../components/SideCharacters';
import { soundManager } from '../audio/soundManager';
import { GameScreen } from '../types/game';

interface QuitScreenProps {
  onNavigate: (screen: GameScreen) => void;
}

export const QuitScreen: React.FC<QuitScreenProps> = ({ onNavigate }) => {
  const handleHover = () => {
    soundManager.playHover();
  };

  const handleReturn = () => {
    soundManager.playClick();
    onNavigate('home');
  };

  return (
    <div className="screen-wrapper">
      <TopLogo />
      <SideCharacters leftState="idle" rightState="idle" />

      <div className="home-menu-center" style={{ width: '36vw', maxWidth: '520px', top: '50%' }}>
        <div className="settings-panel" style={{ textAlign: 'center' }}>
          <h2 style={{
            fontSize: '1.6vw',
            fontWeight: 900,
            color: '#173860',
            marginBottom: '0.8vw',
            letterSpacing: '0.06em'
          }}>
            THANKS FOR PLAYING!
          </h2>

          <p style={{
            fontSize: '1vw',
            color: '#526e8e',
            lineHeight: 1.5,
            marginBottom: '1.4vw'
          }}>
            Modern web browsers prevent scripts from forcibly closing tabs to protect your browsing session. You may safely close this tab or return to the main arena!
          </p>

          <button
            id="btn-quit-return"
            className="btn-play-master"
            style={{ fontSize: '1.2vw', width: '100%', padding: '0.8vw 1.5vw' }}
            onMouseEnter={handleHover}
            onClick={handleReturn}
          >
            <Home size={20} />
            <span>RETURN TO MENU</span>
          </button>
        </div>
      </div>

      <button
        className="btn-back-bottom"
        onMouseEnter={handleHover}
        onClick={handleReturn}
      >
        <ArrowLeft size={18} />
        <span>BACK</span>
      </button>
    </div>
  );
};
