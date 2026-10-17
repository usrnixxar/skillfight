import React, { useEffect } from 'react';
import { Swords, Users, GraduationCap, ArrowLeft } from 'lucide-react';
import { TopLogo } from '../components/TopLogo';
import { SideCharacters } from '../components/SideCharacters';
import { soundManager } from '../audio/soundManager';
import { BotDifficulty, GameScreen } from '../types/game';
import { framePreloader } from '../game/framePreloader';

interface ModeSelectScreenProps {
  onSelectDifficulty: (difficulty: BotDifficulty) => void;
  onNavigate: (screen: GameScreen) => void;
}

export const ModeSelectScreen: React.FC<ModeSelectScreenProps> = ({
  onSelectDifficulty,
  onNavigate
}) => {
  useEffect(() => {
    framePreloader.preloadAll();
  }, []);

  const handleHover = () => {
    soundManager.playHover();
  };

  const handleDifficultyClick = (diff: BotDifficulty) => {
    soundManager.playClick();
    onSelectDifficulty(diff);
  };

  const handleStudentClick = () => {
    soundManager.playClick();
    onNavigate('student');
  };

  const handleBack = () => {
    soundManager.playClick();
    onNavigate('home');
  };

  return (
    <div className="screen-wrapper">
      <TopLogo />

      <SideCharacters leftState="idle" rightState="idle" />

      <div className="mode-select-container">
        {/* CARD 1: NORMAL PLAY */}
        <div className="mode-card">
          <div className="mode-card-left">
            <div className="mode-icon-box">
              <div className="mode-icon-inner">
                <Swords size={22} color="#1f68ba" />
              </div>
            </div>
            <div>
              <div className="mode-text-title">NORMAL PLAY</div>
              <div className="mode-text-desc">Fight a random bot based on WPM</div>
              <div className="difficulty-btn-row">
                <button
                  id="btn-diff-easy"
                  className="diff-btn easy"
                  onMouseEnter={handleHover}
                  onClick={() => handleDifficultyClick('easy')}
                >
                  EASY
                </button>
                <button
                  id="btn-diff-medium"
                  className="diff-btn medium"
                  onMouseEnter={handleHover}
                  onClick={() => handleDifficultyClick('medium')}
                >
                  MEDIUM
                </button>
                <button
                  id="btn-diff-hard"
                  className="diff-btn hard"
                  onMouseEnter={handleHover}
                  onClick={() => handleDifficultyClick('hard')}
                >
                  HARD
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: MULTIPLAYER */}
        <div className="mode-card">
          <div className="mode-card-left">
            <div className="mode-icon-box">
              <div className="mode-icon-inner">
                <Users size={22} color="#455566" />
              </div>
            </div>
            <div>
              <div className="mode-text-title">MULTIPLAYER</div>
              <div className="mode-text-desc">API will be activated later</div>
            </div>
          </div>
          <button className="btn-coming-soon" disabled>
            COMING SOON
          </button>
        </div>

        {/* CARD 3: SKILLENCE ACADEMY STUDENT */}
        <div className="mode-card">
          <div className="mode-card-left">
            <div className="mode-icon-box purple-theme">
              <div className="mode-icon-inner">
                <GraduationCap size={22} color="#5844a4" />
              </div>
            </div>
            <div>
              <div className="mode-text-title">SKILLENCE ACADEMY STUDENT</div>
              <div className="mode-text-desc">Login with student PIN to play</div>
            </div>
          </div>
          <button
            id="btn-mode-student"
            className="btn-enter-student"
            onMouseEnter={handleHover}
            onClick={handleStudentClick}
          >
            ENTER
          </button>
        </div>
      </div>

      {/* Bottom Left Back Button */}
      <button
        id="btn-mode-back"
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
