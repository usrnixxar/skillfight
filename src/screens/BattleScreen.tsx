import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Heart, Check, ArrowRight, Trophy, Skull } from 'lucide-react';
import { TopLogo } from '../components/TopLogo';
import { SideCharacters, CharacterActionState } from '../components/SideCharacters';
import { BattleFxCanvas } from '../components/BattleFxCanvas';
import { soundManager } from '../audio/soundManager';
import { getRandomWord } from '../game/wordBank';
import { framePreloader } from '../game/framePreloader';
import {
  MALE_ATTACK_CONFIG,
  MALE_ATTACK_EVENTS,
  PROJECTILE_CONFIG,
  FrameEvent
} from '../game/maleFighterConfig';
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
      botWpm: Math.floor(diffConfig.minWpm + (diffConfig.maxWpm - diffConfig.minWpm) / 2),
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
    };
  });

  // Always keep stateRef up to date to prevent any closure staleness
  const stateRef = useRef(state);
  stateRef.current = state;

  const [inputError, setInputError] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Character action poses
  const [leftPose, setLeftPose] = useState<CharacterActionState>('ready');
  const [rightPose, setRightPose] = useState<CharacterActionState>('ready');

  // Male 240-frame animation state
  const [isMaleAttacking, setIsMaleAttacking] = useState(false);
  const [energyGlow, setEnergyGlow] = useState(false);

  // Timers and locks
  const botTimeoutRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const roundLockRef = useRef(true); // locked during countdown / transitions
  const transitionTimeoutsRef = useRef<number[]>([]);
  const hasAwardedKillRef = useRef(false);

  // Clear all pending timeouts and intervals safely
  const clearAllTimers = useCallback(() => {
    if (botTimeoutRef.current) {
      clearTimeout(botTimeoutRef.current);
      botTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    transitionTimeoutsRef.current.forEach(t => clearTimeout(t));
    transitionTimeoutsRef.current = [];
  }, []);

  // Safe timeout helper that tracks IDs for cleanup
  const scheduleTimeout = useCallback((fn: () => void, delayMs: number) => {
    const id = window.setTimeout(fn, delayMs);
    transitionTimeoutsRef.current.push(id);
    return id;
  }, []);

  // Advance to next round smoothly
  const advanceToNextRound = useCallback(() => {
    const current = stateRef.current;
    const nextWord = getRandomWord(difficulty, current.currentWord);
    const nextWpm = pickBotWpm();

    setIsMaleAttacking(false);
    setEnergyGlow(false);
    setLeftPose('idle');
    setRightPose('idle');
    setInputError(false);
    roundLockRef.current = false;
    hasAwardedKillRef.current = false;

    setState(prev => ({
      ...prev,
      round: prev.round + 1,
      currentWord: nextWord,
      playerInput: '',
      botInput: '',
      botProgress: 0,
      botWpm: nextWpm,
      phase: 'typing',
      roundWinner: null,
      shakeActive: false,
      bulletActive: false
    }));

    // Focus input field immediately
    setTimeout(() => {
      inputRef.current?.focus();
    }, 20);

    // Launch bot typing for the new word
    startBotTyping(nextWord, nextWpm);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, pickBotWpm]);

  // Handle projectile arrival at opponent
  const onProjectileImpact = useCallback(() => {
    if (hasAwardedKillRef.current) return;
    hasAwardedKillRef.current = true;

    const current = stateRef.current;
    const isPlayer = current.roundWinner === 'player';

    // Stop projectile and play impact sound + particle burst
    soundManager.playImpact(isPlayer);

    if (isPlayer) {
      // Female opponent reacts with hit animation
      setRightPose('hit');
      const nextKills = current.playerKills + 1;
      const matchWon = nextKills >= 3 ? 'player' : null;

      setState(prev => ({
        ...prev,
        phase: 'hit',
        playerKills: nextKills,
        matchWinner: matchWon,
        shakeActive: !reducedMotion,
        bulletActive: false
      }));

      // Camera shake for 300ms
      scheduleTimeout(() => {
        setState(prev => ({ ...prev, shakeActive: false }));
      }, PROJECTILE_CONFIG.screenShake.durationMs);

    } else {
      // Male player reacts with hit animation
      setLeftPose('hit');
      const nextKills = current.botKills + 1;
      const matchWon = nextKills >= 3 ? 'bot' : null;

      setState(prev => ({
        ...prev,
        phase: 'hit',
        botKills: nextKills,
        matchWinner: matchWon,
        shakeActive: !reducedMotion,
        bulletActive: false
      }));

      // Camera shake for 300ms
      scheduleTimeout(() => {
        setState(prev => ({ ...prev, shakeActive: false }));
      }, PROJECTILE_CONFIG.screenShake.durationMs);
    }
  }, [reducedMotion, scheduleTimeout]);

  // Frame event dispatcher from MaleFighterFramePlayer
  const handleMaleFrameEvent = useCallback((event: FrameEvent) => {
    switch (event.event) {
      case 'ATTACK_START':
        roundLockRef.current = true;
        break;

      case 'WEAPON_RAISE':
        soundManager.playWeaponRaiseSound();
        break;

      case 'AIM_START':
        // Character is aiming
        break;

      case 'ENERGY_CHARGE_START':
        soundManager.playChargingSound();
        break;

      case 'CHARGE_PEAK':
        setEnergyGlow(true);
        break;

      case 'TRIGGER_PRESS':
        soundManager.playTriggerSound();
        break;

      case 'PROJECTILE_RELEASE':
        // Launch blue projectile traveling left to right
        setState(prev => ({
          ...prev,
          bulletActive: true,
          bulletDirection: 'player-to-bot'
        }));

        // Projectile reaches opponent after projectileDurationMs (350ms)
        scheduleTimeout(() => {
          onProjectileImpact();
        }, PROJECTILE_CONFIG.projectileDurationMs);
        break;

      case 'FIRING_SOUND':
        soundManager.playGunFireSound();
        break;

      case 'MUZZLE_FLASH_END':
        setEnergyGlow(false);
        break;

      case 'RECOVERY_START':
        // Recovery must follow the registered projectile impact/hit, never precede it.
        if (hasAwardedKillRef.current && stateRef.current.roundWinner === 'player') {
          setRightPose('recover');
          soundManager.playRoundWin();
        }
        break;

      // ATTACK_COMPLETE is handled only by MaleFighterFramePlayer.onComplete.
      // Dispatching it as a frame event too would advance the round twice.

      default:
        break;
    }
  }, [onProjectileImpact, scheduleTimeout]);

  // Triggered when male fighter reaches frame 240
  const handleMaleAttackComplete = useCallback(() => {
    setIsMaleAttacking(false);
    setEnergyGlow(false);
    setLeftPose('idle');
    setRightPose('idle');

    const current = stateRef.current;
    if (current.playerKills >= 3) {
      // Victory for player!
      setState(prev => ({ ...prev, phase: 'finished', matchWinner: 'player' }));
      setLeftPose('victory');
      setRightPose('defeat');
      soundManager.playVictory();

      confetti({
        particleCount: 130,
        spread: 90,
        origin: { y: 0.6 }
      });
    } else {
      // Advance to next round smoothly
      advanceToNextRound();
    }
  }, [advanceToNextRound]);

  // Handle Win of a single word round
  const handleRoundWin = useCallback((winner: 'player' | 'bot') => {
    if (roundLockRef.current) return;
    roundLockRef.current = true;
    hasAwardedKillRef.current = false;

    clearAllTimers();

    const isPlayer = winner === 'player';

    if (isPlayer) {
      // MALE FRAME-DRIVEN ATTACK SEQUENCE
      // Gameplay state sequence:
      // WORD_COMPLETED ↓ LOCK_ROUND ↓ MALE_ATTACK_START ↓ WEAPON_RAISE ↓ AIM ↓ TRIGGER / ENERGY_CHARGE ↓ PROJECTILE_RELEASE ↓ PROJECTILE_TRAVEL ↓ IMPACT + FEMALE_HIT + SCREEN_SHAKE ↓ RECOVERY ↓ ATTACK_COMPLETE ↓ NEXT_ROUND or VICTORY
      setLeftPose('attack');
      setRightPose('idle');
      setIsMaleAttacking(true);

      setState(prev => ({
        ...prev,
        phase: 'attack',
        roundWinner: 'player',
        bulletActive: false
      }));

    } else {
      // BOT (FEMALE FIGHTER) ATTACK SEQUENCE
      soundManager.playShoot(false);
      setRightPose('attack');
      setLeftPose('idle');

      setState(prev => ({
        ...prev,
        phase: 'attack',
        roundWinner: 'bot',
        bulletActive: true,
        bulletDirection: 'bot-to-player'
      }));

      // Pink projectile reaches male fighter after 350ms
      scheduleTimeout(() => {
        onProjectileImpact();
      }, 350);

      // Recovery at 750ms
      scheduleTimeout(() => {
        setLeftPose('recover');
        setRightPose('idle');
      }, 750);

      // Complete round or match at 1350ms
      scheduleTimeout(() => {
        const cur = stateRef.current;
        if (cur.botKills >= 3) {
          setState(prev => ({ ...prev, phase: 'finished', matchWinner: 'bot' }));
          setRightPose('victory');
          setLeftPose('defeat');
          soundManager.playDefeat();
        } else {
          advanceToNextRound();
        }
      }, 1350);
    }
  }, [clearAllTimers, onProjectileImpact, scheduleTimeout, advanceToNextRound]);

  // Launch Bot Typing Simulation
  const startBotTyping = useCallback((targetWord: string, wpm: number) => {
    if (botTimeoutRef.current) {
      clearTimeout(botTimeoutRef.current);
      botTimeoutRef.current = null;
    }

    // Formula: typing time for word = (CharCount / 5 / WPM) * 60 seconds
    const baseCharDelay = 60000 / (wpm * 5);
    let currentChars = 0;

    const botStep = () => {
      if (roundLockRef.current) return;

      currentChars++;
      const progress = currentChars / targetWord.length;

      // Update right character typing excitement pose
      if (progress < 0.4) {
        setRightPose('typing-low');
      } else if (progress < 0.8) {
        setRightPose('typing-mid');
      } else {
        setRightPose('typing-high');
      }

      setState(prev => {
        if (prev.phase !== 'typing') return prev;
        return {
          ...prev,
          botInput: targetWord.slice(0, currentChars),
          botProgress: currentChars
        };
      });

      // Check if bot completed word
      if (currentChars >= targetWord.length) {
        handleRoundWin('bot');
        return;
      }

      // Natural jitter for next character (0.85x to 1.18x variation + occasional slight pause)
      if (!roundLockRef.current) {
        const pauseChance = Math.random() < 0.12 ? 110 : 0;
        const nextDelay = baseCharDelay * (0.85 + Math.random() * 0.3) + pauseChance;
        botTimeoutRef.current = window.setTimeout(botStep, nextDelay);
      }
    };

    // Bot initial start reaction latency (160-280ms)
    botTimeoutRef.current = window.setTimeout(botStep, 180 + Math.random() * 100);
  }, [handleRoundWin]);

  // Mandatory 3-second countdown for the FIRST round of match
  const runFirstRoundCountdown = useCallback(() => {
    clearAllTimers();
    roundLockRef.current = true;
    setLeftPose('ready');
    setRightPose('ready');
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
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        roundLockRef.current = false;
        setLeftPose('idle');
        setRightPose('idle');

        const curWord = stateRef.current.currentWord;
        const curWpm = stateRef.current.botWpm;

        setState(prev => ({
          ...prev,
          phase: 'typing'
        }));

        // Focus typing input
        setTimeout(() => inputRef.current?.focus(), 30);

        // Start bot typing right after GO
        startBotTyping(curWord, curWpm);
      }
    }, 1000);
  }, [clearAllTimers, startBotTyping]);

  // Preload all 240 frames and initialize first round on mount
  useEffect(() => {
    framePreloader.preloadAll();
    runFirstRoundCountdown();
    return () => {
      clearAllTimers();
      setIsMaleAttacking(false);
    };
  }, [clearAllTimers, runFirstRoundCountdown]);

  // Always keep typing input focused on keypress or screen click
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (stateRef.current.phase === 'typing' && !roundLockRef.current) {
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          if (document.activeElement !== inputRef.current) {
            inputRef.current?.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
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

  // Restart Match from scratch with fresh countdown
  const handlePlayAgain = () => {
    soundManager.playClick();
    clearAllTimers();
    roundLockRef.current = true;
    setIsMaleAttacking(false);
    setEnergyGlow(false);
    hasAwardedKillRef.current = false;
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

    setLeftPose('ready');
    setRightPose('ready');
    setInputError(false);

    // Run 3s countdown again
    setTimeout(() => {
      runFirstRoundCountdown();
    }, 60);
  };

  const handleExitMatch = () => {
    soundManager.playClick();
    clearAllTimers();
    setIsMaleAttacking(false);
    onNavigate('modes');
  };

  // 3 Hearts for each side:
  // Player has 3 hearts, loses 1 each time bot gets a kill (heartsLeft = 3 - botKills)
  // Bot has 3 hearts, loses 1 each time player gets a kill (heartsLeft = 3 - playerKills)
  const playerHeartsLeft = Math.max(0, 3 - state.botKills);
  const botHeartsLeft = Math.max(0, 3 - state.playerKills);

  return (
    <div
      className={`screen-wrapper ${state.shakeActive ? 'screen-shake' : ''}`}
      onClick={() => {
        if (state.phase === 'typing') inputRef.current?.focus();
      }}
    >
      {/* TOP HUD BAR */}
      <div className="battle-hud-top">
        {/* P1 HUD (LEFT) */}
        <div className="hud-card-p1">
          <div className="hud-avatar-box">
            <img
              src="/assets/characters/p1_portrait.png"
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
          <TopLogo className="battle-logo-mini" mini={true} />
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
              src="/assets/characters/p2_portrait.png"
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

      {/* PERSISTENT COMBAT SIDE CHARACTERS (Left uses MaleFighterFramePlayer 240 frames) */}
      <SideCharacters
        isBattle={true}
        leftState={leftPose}
        rightState={rightPose}
        isMaleFrameAttack={isMaleAttacking}
        onMaleFrameEvent={handleMaleFrameEvent}
        onMaleAttackComplete={handleMaleAttackComplete}
        energyGlow={energyGlow}
      />

      {/* 60 FPS PROJECTILE & PARTICLE FX CANVAS */}
      <BattleFxCanvas
        bulletActive={state.bulletActive}
        bulletDirection={state.bulletDirection}
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
        <div className="typing-box-p1" onClick={() => inputRef.current?.focus()}>
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
export default BattleScreen;
