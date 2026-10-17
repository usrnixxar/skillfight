import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Heart, Check, ArrowRight, Trophy, Skull } from 'lucide-react';
import { TopLogo } from '../components/TopLogo';
import { SideCharacters, CharacterActionState } from '../components/SideCharacters';
import { BattleFxCanvas } from '../components/BattleFxCanvas';
import { soundManager } from '../audio/soundManager';
import { getRandomWord } from '../game/wordBank';
import {
  BotDifficulty,
  DIFFICULTY_CONFIGS,
  GameScreen,
  BattleState
} from '../types/game';

interface BattleScreenProps {
  difficulty: BotDifficulty;
  playerName: string;
  onNavigate: (screen: GameScreen) => void;
  reducedMotion?: boolean;
}

export const BattleScreen: React.FC<BattleScreenProps> = ({
  difficulty,
  playerName,
  onNavigate,
  reducedMotion = false
}) => {
  const diffConfig = DIFFICULTY_CONFIGS[difficulty];

  // Pick random initial bot WPM within difficulty range
  const pickBotWpm = useCallback(() => {
    return Math.floor(
      diffConfig.minWpm + Math.random() * (diffConfig.maxWpm - diffConfig.minWpm + 1)
    );
  }, [diffConfig]);

  const [state, setState] = useState<BattleState>(() => {
    const firstWord = getRandomWord(difficulty);
    return {
      round: 1,
      playerKills: 0,
      botKills: 0,
      currentWord: firstWord,
      playerInput: '',
      botInput: '',
      botWpm: pickBotWpm(),
      botProgress: 0,
      phase: 'countdown', // First round must start with 3-second countdown
      countdownValue: 3,
      roundWinner: null,
      matchWinner: null,
      shakeActive: false,
      bulletActive: false,
      bulletDirection: 'player-to-bot',
      bulletProgress: 0,
      impactActive: false
    };
  });

  const [inputError, setInputError] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Character poses
  const [leftPose, setLeftPose] = useState<CharacterActionState>('idle');
  const [rightPose, setRightPose] = useState<CharacterActionState>('idle');

  // Timers refs
  const botIntervalRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const roundTransitionTimeoutRef = useRef<number | null>(null);
  const roundLockRef = useRef(false);

  // Clean all timers
  const clearAllTimers = useCallback(() => {
    if (botIntervalRef.current) {
      clearInterval(botIntervalRef.current);
      botIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (roundTransitionTimeoutRef.current) {
      clearTimeout(roundTransitionTimeoutRef.current);
      roundTransitionTimeoutRef.current = null;
    }
  }, []);

  // Launch Bot Typing Simulation
  const startBotTyping = useCallback((targetWord: string, wpm: number) => {
    if (botIntervalRef.current) {
      clearInterval(botIntervalRef.current);
    }

    // Formula: typing time for word = (CharCount / 5 / WPM) * 60 seconds
    // Delay per character = (60000 / (WPM * 5))
    const baseCharDelay = 60000 / (wpm * 5);
    let currentChars = 0;

    const botStep = () => {
      if (roundLockRef.current) return;

      currentChars++;
      const progress = currentChars / targetWord.length;

      // Update right character typing excitement
      if (progress < 0.4) {
        setRightPose('typing-low');
      } else if (progress < 0.8) {
        setRightPose('typing-mid');
      } else {
        setRightPose('typing-high');
      }

      setState(prev => {
        if (prev.phase !== 'typing' || roundLockRef.current) return prev;
        const newBotInput = targetWord.slice(0, currentChars);

        // Check if bot completed word
        if (currentChars >= targetWord.length) {
          handleRoundWin('bot');
        }

        return {
          ...prev,
          botInput: newBotInput,
          botProgress: currentChars
        };
      });

      // Natural jitter for next character (0.85x to 1.18x variation + occasional slight pause)
      if (currentChars < targetWord.length && !roundLockRef.current) {
        const pauseChance = Math.random() < 0.15 ? 120 : 0;
        const nextDelay = baseCharDelay * (0.85 + Math.random() * 0.33) + pauseChance;
        botIntervalRef.current = window.setTimeout(botStep, nextDelay);
      }
    };

    // Bot initial start reaction latency (150-300ms)
    botIntervalRef.current = window.setTimeout(botStep, 180 + Math.random() * 120);
  }, []);

  // Handle Win of a single word round
  const handleRoundWin = useCallback((winner: 'player' | 'bot') => {
    if (roundLockRef.current) return;
    roundLockRef.current = true;

    clearAllTimers();

    const isPlayer = winner === 'player';
    const bulletDir = isPlayer ? 'player-to-bot' : 'bot-to-player';

    // Play attack sound and set attacker pose
    soundManager.playShoot(isPlayer);
    if (isPlayer) {
      setLeftPose('attack');
      setRightPose('idle');
    } else {
      setRightPose('attack');
      setLeftPose('idle');
    }

    setState(prev => {
      const nextPlayerKills = isPlayer ? prev.playerKills + 1 : prev.playerKills;
      const nextBotKills = !isPlayer ? prev.botKills + 1 : prev.botKills;
      const matchWon = nextPlayerKills >= 3 ? 'player' : nextBotKills >= 3 ? 'bot' : null;

      return {
        ...prev,
        phase: 'attack',
        roundWinner: winner,
        matchWinner: matchWon,
        playerKills: nextPlayerKills,
        botKills: nextBotKills,
        bulletActive: true,
        bulletDirection: bulletDir
      };
    });
  }, [clearAllTimers]);

  // Handle Projectile Impact callback from Canvas FX
  const handleProjectileImpact = useCallback(() => {
    const isPlayer = state.roundWinner === 'player';

    // Play hit sound + screen shake
    soundManager.playImpact(isPlayer);
    if (isPlayer) {
      setRightPose('hit');
    } else {
      setLeftPose('hit');
    }

    setState(prev => ({
      ...prev,
      shakeActive: !reducedMotion,
      phase: 'hit'
    }));

    // Stop screen shake after 320ms
    setTimeout(() => {
      setState(prev => ({ ...prev, shakeActive: false, bulletActive: false }));

      // Check if match ended
      if (state.matchWinner) {
        setState(prev => ({ ...prev, phase: 'finished' }));
        if (state.matchWinner === 'player') {
          setLeftPose('victory');
          setRightPose('idle');
          soundManager.playVictory();

          // Confetti celebration
          confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.6 }
          });
        } else {
          setRightPose('victory');
          setLeftPose('idle');
          soundManager.playDefeat();
        }
      } else {
        // Prepare next round without countdown
        soundManager.playRoundWin();
        roundTransitionTimeoutRef.current = window.setTimeout(() => {
          advanceToNextRound();
        }, 850);
      }
    }, 350);
  }, [state.roundWinner, state.matchWinner, reducedMotion]);

  // Advance to next round (no countdown for round 2, 3...)
  const advanceToNextRound = useCallback(() => {
    roundLockRef.current = false;
    setLeftPose('idle');
    setRightPose('idle');
    setInputError(false);

    setState(prev => {
      const nextWord = getRandomWord(difficulty, prev.currentWord);
      const nextWpm = pickBotWpm();

      // Launch bot for the new word immediately
      setTimeout(() => {
        startBotTyping(nextWord, nextWpm);
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);

      return {
        ...prev,
        round: prev.round + 1,
        currentWord: nextWord,
        playerInput: '',
        botInput: '',
        botProgress: 0,
        botWpm: nextWpm,
        phase: 'typing',
        roundWinner: null
      };
    });
  }, [difficulty, pickBotWpm, startBotTyping]);

  // Mandatory 3-second countdown for the FIRST round of match
  const runFirstRoundCountdown = useCallback(() => {
    clearAllTimers();
    roundLockRef.current = true;
    let count = 3;

    setState(prev => ({
      ...prev,
      phase: 'countdown',
      countdownValue: 3
    }));
    soundManager.playCountdownTick(3);

    countdownIntervalRef.current = window.setInterval(() => {
      count--;
      if (count > 0) {
        setState(prev => ({ ...prev, countdownValue: count }));
        soundManager.playCountdownTick(count);
      } else if (count === 0) {
        setState(prev => ({ ...prev, countdownValue: 0 }));
        soundManager.playGoSound();
      } else {
        clearInterval(countdownIntervalRef.current!);
        countdownIntervalRef.current = null;
        roundLockRef.current = false;

        setState(prev => {
          // Start bot typing right after GO
          startBotTyping(prev.currentWord, prev.botWpm);
          setTimeout(() => inputRef.current?.focus(), 50);
          return {
            ...prev,
            phase: 'typing'
          };
        });
      }
    }, 1000);
  }, [clearAllTimers, startBotTyping]);

  // Initialize first round on mount
  useEffect(() => {
    runFirstRoundCountdown();
    return () => {
      clearAllTimers();
    };
  }, []);

  // Handle Player Typing Input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (state.phase !== 'typing' || roundLockRef.current) return;

    const typed = e.target.value.toUpperCase();
    const target = state.currentWord;

    // Check if typed string is prefix of target word
    if (target.startsWith(typed)) {
      soundManager.playTypingKey();
      setInputError(false);

      // Update excitement level as progress increases
      const progress = typed.length / target.length;
      if (progress < 0.4) {
        setLeftPose('typing-low');
      } else if (progress < 0.8) {
        setLeftPose('typing-mid');
      } else {
        setLeftPose('typing-high');
      }

      setState(prev => ({ ...prev, playerInput: typed }));

      // Complete word match -> Win immediately without requiring Enter!
      if (typed === target) {
        handleRoundWin('player');
      }
    } else {
      // Incorrect character
      soundManager.playTypeError();
      setInputError(true);
      setState(prev => ({ ...prev, playerInput: typed }));
    }
  };

  // Restart Match from scratch with fresh countdown (Section 13)
  const handlePlayAgain = () => {
    soundManager.playClick();
    clearAllTimers();
    roundLockRef.current = false;
    const firstWord = getRandomWord(difficulty);
    const firstWpm = pickBotWpm();

    setState({
      round: 1,
      playerKills: 0,
      botKills: 0,
      currentWord: firstWord,
      playerInput: '',
      botInput: '',
      botWpm: firstWpm,
      botProgress: 0,
      phase: 'countdown',
      countdownValue: 3,
      roundWinner: null,
      matchWinner: null,
      shakeActive: false,
      bulletActive: false,
      bulletDirection: 'player-to-bot',
      bulletProgress: 0,
      impactActive: false
    });

    setLeftPose('idle');
    setRightPose('idle');
    setInputError(false);

    // Run 3s countdown again
    setTimeout(() => {
      runFirstRoundCountdown();
    }, 50);
  };

  const handleExitMatch = () => {
    soundManager.playClick();
    clearAllTimers();
    onNavigate('modes');
  };

  // 3 Hearts for each side:
  // Player has 3 hearts, loses 1 each time bot gets a kill (heartsLeft = 3 - botKills)
  // Bot has 3 hearts, loses 1 each time player gets a kill (heartsLeft = 3 - playerKills)
  const playerHeartsLeft = Math.max(0, 3 - state.botKills);
  const botHeartsLeft = Math.max(0, 3 - state.playerKills);

  return (
    <div className={`screen-wrapper ${state.shakeActive ? 'screen-shake' : ''}`}>
      {/* TOP HUD BAR */}
      <div className="battle-hud-top">
        {/* P1 HUD (LEFT) */}
        <div className="hud-card-p1">
          <div className="hud-avatar-box">
            <img
              src="/assets/extracted/p1_portrait.png"
              alt="Player 1 Avatar"
              className="hud-avatar-img"
            />
          </div>
          <div className="hud-info-col">
            <div className="hud-name-hearts">
              <span className="hud-player-tag">{playerName || 'P1'}</span>
              <div className="hud-hearts-row">
                {[1, 2, 3].map(h => (
                  <Heart
                    key={h}
                    className={`heart-icon ${h <= playerHeartsLeft ? 'heart-full' : 'heart-empty'}`}
                  />
                ))}
              </div>
            </div>
            <div className="hud-kills-text">
              KILLS: <strong style={{ color: '#ffffff' }}>{state.playerKills}</strong>
            </div>
          </div>
        </div>

        {/* TOP CENTER LOGO & ROUND BADGE */}
        <div className="battle-center-top">
          <TopLogo className="battle-logo-mini" />
          <div className="battle-round-badge">
            ROUND {state.round}
          </div>
        </div>

        {/* P2 HUD (RIGHT) */}
        <div className="hud-card-p2">
          <div className="hud-info-col">
            <div className="hud-name-hearts" style={{ justifyContent: 'flex-end' }}>
              <div className="hud-hearts-row">
                {[1, 2, 3].map(h => (
                  <Heart
                    key={h}
                    className={`heart-icon ${h <= botHeartsLeft ? 'heart-full' : 'heart-empty'}`}
                  />
                ))}
              </div>
              <span className="hud-player-tag">{diffConfig.name} BOT</span>
            </div>
            <div className="hud-kills-text">
              KILLS: <strong style={{ color: '#ffffff' }}>{state.botKills}</strong>
            </div>
          </div>
          <div className="hud-avatar-box">
            <img
              src="/assets/extracted/p2_portrait.png"
              alt="Bot Avatar"
              className="hud-avatar-img"
            />
          </div>
        </div>
      </div>

      {/* CENTER WORD CARD */}
      <div className="center-word-card">
        <div className="word-card-label">TYPE THIS WORD:</div>
        <div className="word-card-target">{state.currentWord}</div>
      </div>

      {/* PERSISTENT COMBAT SIDE CHARACTERS */}
      <SideCharacters
        isBattle={true}
        leftState={leftPose}
        rightState={rightPose}
      />

      {/* 60 FPS PROJECTILE & PARTICLE FX CANVAS */}
      <BattleFxCanvas
        bulletActive={state.bulletActive}
        bulletDirection={state.bulletDirection}
        onImpact={handleProjectileImpact}
      />

      {/* 3-SECOND PRE-MATCH COUNTDOWN OVERLAY */}
      {state.phase === 'countdown' && (
        <div className="countdown-overlay-modal">
          <div className="countdown-giant-number">
            {state.countdownValue === 0 ? 'GO!' : state.countdownValue}
          </div>
          <div className="countdown-subtext">GET READY TO TYPE</div>
        </div>
      )}

      {/* BOTTOM TYPING BAR */}
      <div className="battle-bottom-bar">
        {/* PLAYER 1 TYPING BOX */}
        <div className="typing-box-p1">
          <div className="typing-icon-diamond">◆</div>
          <input
            ref={inputRef}
            type="text"
            id="type-input-field"
            value={state.playerInput}
            onChange={handleInputChange}
            disabled={state.phase !== 'typing'}
            placeholder="Type here..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            className={`typing-input-field ${inputError ? 'error' : ''}`}
          />
          <Check size={22} color={state.playerInput === state.currentWord ? '#18a880' : '#4579ad'} />
        </div>

        {/* BOT TYPING PROGRESS BOX */}
        <div className="typing-box-p2">
          <div className="bot-progress-display">
            <span>{state.botInput || 'Type here...'}</span>
            <span className="bot-wpm-badge">{state.botWpm} WPM</span>
          </div>
          <ArrowRight size={22} color="#c94979" />
        </div>
      </div>

      {/* BOTTOM CENTER KILL TARGET */}
      <div className="bottom-kill-target">
        FIRST TO 3 KILLS WINS
      </div>

      {/* VICTORY POPUP MODAL */}
      {state.phase === 'finished' && state.matchWinner === 'player' && (
        <div className="popup-modal-backdrop">
          <div className="popup-modal-panel">
            <Trophy size={54} color="#f5b838" style={{ margin: 'auto' }} />
            <h2 className="popup-title">YOU WIN!</h2>
            <p className="popup-subtitle">You won the battle with 3 kills!</p>
            <div className="popup-btn-row">
              <button
                id="btn-victory-play-again"
                className="btn-popup-primary"
                onClick={handlePlayAgain}
                onMouseEnter={() => soundManager.playHover()}
              >
                PLAY AGAIN
              </button>
              <button
                id="btn-victory-exit"
                className="btn-popup-secondary"
                onClick={handleExitMatch}
                onMouseEnter={() => soundManager.playHover()}
              >
                EXIT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEFEAT POPUP MODAL */}
      {state.phase === 'finished' && state.matchWinner === 'bot' && (
        <div className="popup-modal-backdrop">
          <div className="popup-modal-panel defeat">
            <Skull size={54} color="#ea5e92" style={{ margin: 'auto' }} />
            <h2 className="popup-title">YOU LOST!</h2>
            <p className="popup-subtitle">The opponent won this match. Try again!</p>
            <div className="popup-btn-row">
              <button
                id="btn-defeat-try-again"
                className="btn-popup-primary defeat"
                onClick={handlePlayAgain}
                onMouseEnter={() => soundManager.playHover()}
              >
                TRY AGAIN
              </button>
              <button
                id="btn-defeat-exit"
                className="btn-popup-secondary"
                onClick={handleExitMatch}
                onMouseEnter={() => soundManager.playHover()}
              >
                EXIT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
