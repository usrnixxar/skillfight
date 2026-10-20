import React, { useState, useEffect } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { ModeSelectScreen } from './screens/ModeSelectScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { QuitScreen } from './screens/QuitScreen';
import { StudentScreen } from './screens/StudentScreen';
import { BattleScreen } from './screens/BattleScreen';
import { soundManager } from './audio/soundManager';
import { framePreloader } from './game/framePreloader';
import { BotDifficulty, GameScreen, GameSettings } from './types/game';

const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 80,
  musicVolume: 50,
  sfxVolume: 80,
  musicEnabled: true,
  sfxEnabled: true,
  fullscreen: false,
  reducedMotion: false,
  playerName: 'Player 1'
};

export const App: React.FC = () => {
  const [screen, setScreen] = useState<GameScreen>('home');
  const [difficulty, setDifficulty] = useState<BotDifficulty>('easy');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Loading...');
  const transitionId = React.useRef(0);

  const navigate = (next: GameScreen) => {
    if (next === screen) return;
    const id = ++transitionId.current;
    setLoadingText(next === 'battle' ? 'PREPARING ARENA...' : 'LOADING ' + next.toUpperCase() + '...');
    setLoading(true);
    const path = next === 'battle' ? '/assets/backgrounds/level-surface.png' : '/assets/backgrounds/home_bg.jpg';
    const image = new Image();
    const complete = () => {
      if (id !== transitionId.current) return;
      setScreen(next);
      setLoading(false);
    };
    image.onload = complete;
    image.onerror = complete;
    image.src = path;
    if (image.complete) complete();
  };

  useEffect(() => {
    void framePreloader.preloadAll();
    return () => { transitionId.current++; };
  }, []);

  // Load persisted settings
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem('skillence_typing_battle_settings');
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {}
    return DEFAULT_SETTINGS;
  });

  // Apply audio and motion settings
  useEffect(() => {
    soundManager.updateSettings(settings);
    if (settings.reducedMotion) {
      document.body.classList.add('reduced-motion');
    } else {
      document.body.classList.remove('reduced-motion');
    }
  }, [settings]);

  const handleUpdateSettings = (newSettings: GameSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('skillence_typing_battle_settings', JSON.stringify(newSettings));
    } catch {}
  };

  const handleStartBattle = (diff: BotDifficulty) => {
    setDifficulty(diff);
    navigate('battle');
  };

  // Keyboard navigation: Escape key goes back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (screen === 'battle') {
          // Battle owns its pause / resume keyboard interaction.
          return;
        } else if (screen === 'modes' || screen === 'settings' || screen === 'quit' || screen === 'student') {
          soundManager.playClick();
          navigate('home');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen]);

  // Determine original 2D background image based on screen
  const getBackgroundImage = () => {
    switch (screen) {
      case 'battle':
        return "url('/assets/backgrounds/level-surface.png')";
      case 'modes':
      case 'student':
      case 'home':
      case 'settings':
      case 'quit':
      default:
        return "url('/assets/backgrounds/home_bg.jpg')";
    }
  };

  return (
    <div
      className="game-viewport"
      style={{ backgroundImage: getBackgroundImage() }}
    >
      {loading && <div className="skillfight-transition" role="status" aria-live="polite"><div className="skillfight-spinner" /><strong>{loadingText}</strong></div>}
      {(screen === 'home' || screen === 'modes') && (
        <video className="menu-loop-video" src="/assets/video/menu-loop.mp4" autoPlay muted loop playsInline preload="auto" aria-hidden="true" />
      )}
      {screen === 'home' && (
        <HomeScreen onNavigate={navigate} />
      )}

      {screen === 'modes' && (
        <ModeSelectScreen
          onSelectDifficulty={handleStartBattle}
          onNavigate={setScreen}
        />
      )}

      {screen === 'settings' && (
        <SettingsScreen
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onNavigate={setScreen}
        />
      )}

      {screen === 'quit' && (
        <QuitScreen onNavigate={setScreen} />
      )}

      {screen === 'student' && (
        <StudentScreen
          onNavigate={setScreen}
          playerName={settings.playerName}
          onPlayBot={() => handleStartBattle('easy')}
        />
      )}

      {screen === 'battle' && (
        <BattleScreen
          difficulty={difficulty}
          playerName={settings.playerName}
          onNavigate={setScreen}
          reducedMotion={settings.reducedMotion}
          audioSettings={settings}
          onUpdateAudioSettings={handleUpdateSettings}
        />
      )}
    </div>
  );
};
export default App;
