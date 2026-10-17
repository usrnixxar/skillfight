import React from 'react';
import { ArrowLeft, Volume2, VolumeX, Music, Shield, Sparkles } from 'lucide-react';
import { TopLogo } from '../components/TopLogo';
import { SideCharacters } from '../components/SideCharacters';
import { soundManager } from '../audio/soundManager';
import { GameSettings, GameScreen } from '../types/game';

interface SettingsScreenProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
  onNavigate: (screen: GameScreen) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onUpdateSettings,
  onNavigate
}) => {
  const handleHover = () => {
    soundManager.playHover();
  };

  const handleChange = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    const updated = { ...settings, [key]: value };
    onUpdateSettings(updated);
    soundManager.updateSettings(updated);
  };

  const toggleFullscreen = () => {
    soundManager.playClick();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      handleChange('fullscreen', true);
    } else {
      document.exitFullscreen().catch(() => {});
      handleChange('fullscreen', false);
    }
  };

  const handleBack = () => {
    soundManager.playClick();
    onNavigate('home');
  };

  return (
    <div className="screen-wrapper">
      <TopLogo />
      <SideCharacters leftState="idle" rightState="idle" />

      <div className="home-menu-center" style={{ width: '38vw', maxWidth: '580px', top: '52%' }}>
        <div className="settings-panel">
          <h2 style={{
            fontSize: '1.4vw',
            fontWeight: 900,
            color: '#173860',
            textAlign: 'center',
            marginBottom: '1vw',
            letterSpacing: '0.08em'
          }}>
            SETTINGS
          </h2>

          {/* Player Name */}
          <div className="settings-row">
            <span className="settings-label">Player Name</span>
            <input
              type="text"
              maxLength={15}
              value={settings.playerName}
              onChange={(e) => handleChange('playerName', e.target.value)}
              style={{
                padding: '0.4vw 0.8vw',
                borderRadius: '6px',
                border: '1.5px solid #a4c4e8',
                fontFamily: 'inherit',
                fontSize: '0.95vw',
                fontWeight: 700,
                width: '14vw',
                outline: 'none'
              }}
            />
          </div>

          {/* Master Volume */}
          <div className="settings-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5vw' }}>
              <Volume2 size={18} color="#2b7edc" />
              <span className="settings-label">Master Volume</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6vw' }}>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.masterVolume}
                onChange={(e) => handleChange('masterVolume', Number(e.target.value))}
                className="settings-slider"
              />
              <span style={{ fontSize: '0.9vw', fontWeight: 800, width: '2.5vw', textAlign: 'right' }}>
                {settings.masterVolume}%
              </span>
            </div>
          </div>

          {/* Music Volume */}
          <div className="settings-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5vw' }}>
              <Music size={18} color="#2b7edc" />
              <span className="settings-label">Music Volume</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6vw' }}>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.musicVolume}
                onChange={(e) => handleChange('musicVolume', Number(e.target.value))}
                className="settings-slider"
              />
              <span style={{ fontSize: '0.9vw', fontWeight: 800, width: '2.5vw', textAlign: 'right' }}>
                {settings.musicVolume}%
              </span>
            </div>
          </div>

          {/* SFX Volume */}
          <div className="settings-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5vw' }}>
              <Volume2 size={18} color="#2b7edc" />
              <span className="settings-label">SFX Volume</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6vw' }}>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.sfxVolume}
                onChange={(e) => handleChange('sfxVolume', Number(e.target.value))}
                className="settings-slider"
              />
              <span style={{ fontSize: '0.9vw', fontWeight: 800, width: '2.5vw', textAlign: 'right' }}>
                {settings.sfxVolume}%
              </span>
            </div>
          </div>

          {/* Music Toggle */}
          <div className="settings-row">
            <span className="settings-label">Background Music</span>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.4vw' }}>
              <input
                type="checkbox"
                checked={settings.musicEnabled}
                onChange={(e) => handleChange('musicEnabled', e.target.checked)}
                style={{ width: '1.2vw', height: '1.2vw', accentColor: '#2b7edc' }}
              />
              <span style={{ fontSize: '0.9vw', fontWeight: 700 }}>
                {settings.musicEnabled ? 'ON' : 'OFF'}
              </span>
            </label>
          </div>

          {/* SFX Toggle */}
          <div className="settings-row">
            <span className="settings-label">Sound Effects</span>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.4vw' }}>
              <input
                type="checkbox"
                checked={settings.sfxEnabled}
                onChange={(e) => handleChange('sfxEnabled', e.target.checked)}
                style={{ width: '1.2vw', height: '1.2vw', accentColor: '#2b7edc' }}
              />
              <span style={{ fontSize: '0.9vw', fontWeight: 700 }}>
                {settings.sfxEnabled ? 'ON' : 'OFF'}
              </span>
            </label>
          </div>

          {/* Reduced Motion Toggle */}
          <div className="settings-row">
            <span className="settings-label">Reduced Motion</span>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.4vw' }}>
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(e) => handleChange('reducedMotion', e.target.checked)}
                style={{ width: '1.2vw', height: '1.2vw', accentColor: '#2b7edc' }}
              />
              <span style={{ fontSize: '0.9vw', fontWeight: 700 }}>
                {settings.reducedMotion ? 'ON' : 'OFF'}
              </span>
            </label>
          </div>

          {/* Fullscreen Button */}
          <div style={{ display: 'flex', gap: '0.8vw', marginTop: '1.2vw' }}>
            <button
              className="btn-popup-secondary"
              style={{ flex: 1, fontSize: '0.95vw' }}
              onClick={toggleFullscreen}
              onMouseEnter={handleHover}
            >
              Toggle Fullscreen
            </button>
            <button
              className="btn-popup-primary"
              style={{ flex: 1, fontSize: '0.95vw' }}
              onClick={handleBack}
              onMouseEnter={handleHover}
            >
              SAVE & BACK
            </button>
          </div>
        </div>
      </div>

      <button
        className="btn-back-bottom"
        onMouseEnter={handleHover}
        onClick={handleBack}
      >
        <ArrowLeft size={18} />
        <span>BACK</span>
      </button>
    </div>
  );
};
