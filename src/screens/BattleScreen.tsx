import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Check, ArrowRight, Trophy, Skull } from 'lucide-react';
import { TopLogo } from '../components/TopLogo';
import { SideCharacters, CharacterActionState } from '../components/SideCharacters';
import { BattleFxCanvas, LetterBullet } from '../components/BattleFxCanvas';
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
  const LEVEL_WPM = [20, 25, 30, 35, 40, 45, 50, 55, 60, 65];
  const [level, setLevel] = useState(1);
  const levelRef = useRef(1);
  const [completedAll, setCompletedAll] = useState(false);

  // 10 fixed levels: every cleared health battle increases opponent WPM.
  const pickBotWpm = useCallback(() => LEVEL_WPM[levelRef.current - 1], []);

  const [state, setState] = useState<BattleState>(() => {
    const firstWord = getRandomWord(difficulty);
    return {
      round: 1,
      playerKills: 0,
      botKills: 0,
      playerHp: 100,
      botHp: 100,
      currentWord: firstWord,
      playerInput: '',
      botInput: '',
      botWpm: LEVEL_WPM[0],
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

  // Shared deterministic word stream; each fighter advances independently.
  const wordsRef = useRef<string[]>([state.currentWord]);
  const playerIndex = useRef(0);
  const botIndex = useRef(0);
  const playerTyped = useRef('');
  const botTyped = useRef('');
  const playerWord = useRef(state.currentWord);
  const botWord = useRef(state.currentWord);
  const getWordAt = (index: number) => {
    while (wordsRef.current.length <= index) {
      wordsRef.current.push(getRandomWord(difficulty, wordsRef.current[wordsRef.current.length - 1]));
    }
    return wordsRef.current[index];
  };
  const [inputError, setInputError] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Character action poses
  const [leftPose, setLeftPose] = useState<CharacterActionState>('ready');
  const [rightPose, setRightPose] = useState<CharacterActionState>('ready');

  // Independent shots are driven by each correctly entered letter.
  const [bullets, setBullets] = useState<LetterBullet[]>([]);
  const [shotCounts, setShotCounts] = useState({ player: 0, bot: 0 });
  const [impactCount, setImpactCount] = useState(0);
  const [impactSide, setImpactSide] = useState<'player' | 'bot' | null>(null);
  const [roundBanner, setRoundBanner] = useState<'player' | 'bot' | null>(null);
  const nextBulletId = useRef(0);
  const healthRef = useRef({player: 100, bot: 100});
  const botTimeoutRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const timersRef = useRef<number[]>([]);
  const roundLocked = useRef(true);
  const winningShotRef = useRef<'player' | 'bot' | null>(null);
  const lastPlayerInput = useRef('');
  const currentPoseTimer = useRef<Record<string, number>>({});

  const clearTimers = () => {
    if (botTimeoutRef.current !== null) clearTimeout(botTimeoutRef.current);
    if (countdownRef.current !== null) clearInterval(countdownRef.current);
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    botTimeoutRef.current = null;
    countdownRef.current = null;
  };

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  };

  const pose = (side: 'player' | 'bot', action: CharacterActionState, delay = 0) => {
    const key = side;
    window.clearTimeout(currentPoseTimer.current[key]);
    if (side === 'player') setLeftPose(action);
    else setRightPose(action);
    if (delay) {
      currentPoseTimer.current[key] = later(() => {
        if (stateRef.current.phase !== 'finished') {
          if (side === 'player') setLeftPose('aim');
          else setRightPose('aim');
        }
      }, delay);
    }
  };

  const fire = (from: 'player' | 'bot') => {
    if (roundLocked.current) return;
    const shot: LetterBullet = {
      id: ++nextBulletId.current,
      from,
      createdAt: performance.now()
    };
    // One valid letter = one point of damage, independent of projectile duration.
    const victim = from === 'player' ? 'bot' : 'player';
    healthRef.current[victim] = Math.max(0, healthRef.current[victim] - 1);
    const health = { ...healthRef.current };
    setState(prev => ({ ...prev, playerHp: health.player, botHp: health.bot }));
    setBullets(prev => [...prev, shot]);
    setShotCounts(prev => ({ ...prev, [from]: prev[from] + 1 }));
    soundManager.playGunFireSound();
    pose(from, 'fire', 105);
    // Each bullet registers its own visual impact, without awarding duplicate kills.
    // Scoring is resolved by first word completion, preventing duplicate wins.
    later(() => setBullets(prev => prev.filter(b => b.id !== shot.id)), 480);
    if (healthRef.current[victim] === 0) finishRound(from);
  };

  const finishRound = (winner: 'player' | 'bot') => {
    if (roundLocked.current || winningShotRef.current) return;
    winningShotRef.current = winner;
    roundLocked.current = true;
    if (botTimeoutRef.current !== null) clearTimeout(botTimeoutRef.current);
    setRoundBanner(winner);
    if (!reducedMotion) setState(prev => ({ ...prev, shakeActive: true }));
    later(() => setState(prev => ({ ...prev, shakeActive: false })), 330);
    setState(prev => ({ ...prev, phase: 'hit', roundWinner: winner, matchWinner: winner }));
    later(() => {
      pose(winner === 'player' ? 'bot' : 'player', 'hit');
      soundManager.playImpact(winner === 'player');
    }, 250);
    later(() => {
      setCompletedAll(winner === 'player' && levelRef.current === 10);
      setState(prev => ({ ...prev, phase: 'finished' }));
      setLeftPose(winner === 'player' ? 'victory' : 'defeat');
      setRightPose(winner === 'bot' ? 'victory' : 'defeat');
      if (winner === 'player') {
        soundManager.playVictory();
        confetti({ particleCount: 130, spread: 90, origin: { y: 0.6 } });
      } else soundManager.playDefeat();
    }, 720);
  };

  // Player and bot receive the same sequence, but only the finisher advances.
  // Neither fighter can overwrite or interrupt the other's unfinished word.
  const advancePlayer = () => {
    playerIndex.current++;
    const next = getWordAt(playerIndex.current);
    playerWord.current = next;
    playerTyped.current = '';
    lastPlayerInput.current = '';
    setInputError(false);
    setState(prev => ({
      ...prev,
      round: Math.max(playerIndex.current, botIndex.current) + 1,
      currentWord: next,
      playerInput: ''
    }));
    // Preserve the currently focused input; no unmount/disabled transition.
  };

  const scheduleBotLetter = () => {
    if (botTimeoutRef.current !== null) clearTimeout(botTimeoutRef.current);
    const wpm = LEVEL_WPM[levelRef.current - 1];
    const delay = 60000 / (wpm * 5);
    botTimeoutRef.current = window.setTimeout(() => {
      if (roundLocked.current || winningShotRef.current) return;
      const word = botWord.current;
      if (botTyped.current.length >= word.length) return;
      botTyped.current = word.slice(0, botTyped.current.length + 1);
      setState(prev => ({ ...prev, botInput: botTyped.current, botProgress: botTyped.current.length }));
      fire('bot');
      if (roundLocked.current) return;
      if (botTyped.current.length === word.length) {
        botIndex.current++;
        botWord.current = getWordAt(botIndex.current);
        botTyped.current = '';
        setState(prev => ({
          ...prev,
          botInput: '',
          botProgress: 0,
          round: Math.max(playerIndex.current, botIndex.current) + 1
        }));
      }
      scheduleBotLetter();
    }, delay * (0.85 + Math.random() * 0.3));
  };

  const startBotTyping = (_word: string, _wpm: number) => {
    scheduleBotLetter();
  };

  const runCountdown = () => {
    clearTimers();
    roundLocked.current = true;
    winningShotRef.current = null;
    lastPlayerInput.current = '';
    playerTyped.current = '';
    botTyped.current = '';
    setLeftPose('ready');
    setRightPose('ready');
    let n = 3;
    setState(prev => ({ ...prev, phase: 'countdown', countdownValue: 3 }));
    soundManager.playCountdownTick(3);
    countdownRef.current = window.setInterval(() => {
      n--;
      if (n > 0) {
        setState(prev => ({ ...prev, countdownValue: n }));
        soundManager.playCountdownTick(n);
      } else if (n === 0) {
        setState(prev => ({ ...prev, countdownValue: 0 }));
        soundManager.playGoSound();
      } else {
        if (countdownRef.current !== null) clearInterval(countdownRef.current);
        countdownRef.current = null;
        roundLocked.current = false;
        setLeftPose('idle');
        setRightPose('idle');
        setState(prev => ({ ...prev, phase: 'typing' }));
        later(() => inputRef.current?.focus(), 30);
        startBotTyping(stateRef.current.currentWord, stateRef.current.botWpm);
      }
    }, 1000);
  };

  // Initialize once per mounted battle, preserving 3-2-1-GO countdown.
  useEffect(() => {
    runCountdown();
    return () => {
      clearTimers();
      Object.values(currentPoseTimer.current).forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const focusOnTyping = (e: KeyboardEvent) => {
      if (stateRef.current.phase === 'typing' && !roundLocked.current &&
          e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', focusOnTyping);
    return () => window.removeEventListener('keydown', focusOnTyping);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (stateRef.current.phase !== 'typing' || roundLocked.current) return;
    const typed = e.target.value.toUpperCase();
    const target = playerWord.current;
    if (!target.startsWith(typed)) {
      setInputError(true);
      soundManager.playTypeError();
      return;
    }
    const oldLength = playerTyped.current.length;
    playerTyped.current = typed;
    lastPlayerInput.current = typed;
    setInputError(false);
    setState(prev => ({ ...prev, playerInput: typed }));
    if (typed.length > oldLength) {
      for (let i = oldLength; i < typed.length; i++) {
        if (roundLocked.current) break;
        fire('player');
      }
      if (!roundLocked.current && typed === target) advancePlayer();
    }
  };

  const handlePlayAgain = () => {
    soundManager.playClick();
    // A win unlocks the next level. A loss retries the current level.
    const nextLevel = stateRef.current.matchWinner === 'player' ? Math.min(10, levelRef.current + 1) : levelRef.current;
    levelRef.current = nextLevel;
    setLevel(nextLevel);
    setCompletedAll(false);
    clearTimers();
    setBullets([]);
    setRoundBanner(null);
    setImpactCount(0);
    setImpactSide(null);
    setShotCounts({ player: 0, bot: 0 });
    healthRef.current = { player: 100, bot: 100 };
    setInputError(false);
    lastPlayerInput.current = '';
    winningShotRef.current = null;
    roundLocked.current = true;
    const word = getRandomWord(difficulty);
    wordsRef.current = [word];
    playerIndex.current = 0;
    botIndex.current = 0;
    playerWord.current = word;
    botWord.current = word;
    playerTyped.current = '';
    botTyped.current = '';
    setState({
      round: 1, playerKills: 0, botKills: 0, playerHp: 100, botHp: 100, currentWord: word,
      playerInput: '', botInput: '', botWpm: LEVEL_WPM[nextLevel - 1],
      botProgress: 0, phase: 'countdown', countdownValue: 3,
      roundWinner: null, matchWinner: null, shakeActive: false,
      bulletActive: false, bulletDirection: 'player-to-bot',
      bulletProgress: 0, impactActive: false
    });
    // Countdown starts on the next tick after the fresh match state commits.
    later(runCountdown, 20);
  };

  const handleBulletImpact = (_shot: LetterBullet) => {
    setImpactCount(n => n + 1);
    setImpactSide(_shot.from === 'player' ? 'bot' : 'player');
    soundManager.playImpact(_shot.from === 'player');
    // Each correct letter creates one opponent collision effect. Scoring remains first word completed.
  };

  const handleExitMatch = () => {
    soundManager.playClick();
    clearTimers();
    onNavigate('modes');
  };

  // Spacebar restarts only after the result popup appears.
  // Keep the handler current without attaching a new listener on each render.
  const playAgainRef = useRef(handlePlayAgain);
  playAgainRef.current = handlePlayAgain;
  useEffect(() => {
    const onSpacePlayAgain = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat || stateRef.current.phase !== 'finished') return;
      event.preventDefault();
      event.stopPropagation();
      playAgainRef.current();
    };
    window.addEventListener('keydown', onSpacePlayAgain);
    return () => window.removeEventListener('keydown', onSpacePlayAgain);
  }, []);


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
              
            </div>
            <div className="hud-kills-text">HP: <strong style={{ color: '#ffffff' }}>{state.playerHp} / 100</strong></div><div className="health-bar-track"><div className="health-bar-fill" style={{width: `${state.playerHp}%`}} /></div>
          </div>
        </div>

        {/* TOP CENTER LOGO & ROUND BADGE */}
        <div className="battle-center-top">
          <TopLogo className="battle-logo-mini" mini={true} />
          <div className="battle-round-badge">
            LEVEL {level} / 10 · WORD {state.round}
          </div>
        </div>

        {/* P2 HUD (RIGHT) */}
        <div className="hud-card-p2">
          <div className="hud-info-col">
            <div className="hud-name-hearts" style={{ justifyContent: 'flex-end' }}>
              
              <span className="hud-player-tag">{diffConfig.name} BOT</span>
            </div>
            <div className="hud-kills-text">HP: <strong style={{ color: '#ffffff' }}>{state.botHp} / 100</strong></div><div className="health-bar-track"><div className="health-bar-fill" style={{width: `${state.botHp}%`}} /></div>
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
      <div className="center-word-card dual-word-card">
        <div className="word-card-label">YOUR WORD · #{playerIndex.current + 1}</div>
        <div className="word-card-target">{state.currentWord}</div>
        <div className="bot-word-target"><span>BOT WORD · #{botIndex.current + 1}</span><strong>{botWord.current}</strong></div>
      </div>

      {/* Both gunfighters fire independently on every correct letter. */}
      <SideCharacters isBattle leftState={leftPose} rightState={rightPose} playerShots={shotCounts.player} botShots={shotCounts.bot} round={state.round} />
      <BattleFxCanvas bullets={bullets} onImpact={handleBulletImpact} />
      {roundBanner && <div className={`round-impact-banner ${roundBanner === 'player' ? 'round-blue' : 'round-pink'}`} key={`${state.round}-${roundBanner}`}>{roundBanner === 'player' ? 'DIRECT HIT!' : 'OPPONENT HIT!'}</div>}
      {impactCount > 0 && <div className={`impact-counter ${impactSide === 'bot' ? 'impact-right' : 'impact-left'}`} aria-live="off" key={impactCount}>✦</div>}

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
        EACH CORRECT LETTER = 1 HP DAMAGE
      </div>

      {/* VICTORY POPUP MODAL */}
      {state.phase === 'finished' && state.matchWinner === 'player' && (
        <div className="popup-modal-backdrop">
          <div className="popup-modal-panel">
            <Trophy size={54} color="#f5b838" style={{ margin: 'auto' }} />
            <h2 className="popup-title">{completedAll ? 'ALL 10 LEVELS CLEARED!' : `LEVEL ${level} CLEARED!`}</h2>
            <p className="popup-subtitle">{completedAll ? 'You are the SkillFight Champion!' : `Next Level ${level + 1}: Bot speed ${LEVEL_WPM[level]} WPM`}</p>
            <div className="popup-btn-row">
              <button
                id="btn-victory-play-again"
                className="btn-popup-primary"
                onClick={handlePlayAgain}
                onMouseEnter={() => soundManager.playHover()}
              >
                {completedAll ? 'PLAY LEVEL 10 AGAIN' : 'NEXT LEVEL'}
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
            <p className="popup-subtitle">Level {level} · {LEVEL_WPM[level - 1]} WPM — retry this level.</p>
            <div className="popup-btn-row">
              <button
                id="btn-defeat-try-again"
                className="btn-popup-primary defeat"
                onClick={handlePlayAgain}
                onMouseEnter={() => soundManager.playHover()}
              >
                RETRY LEVEL
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
