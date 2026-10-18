import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Heart, Check, ArrowRight, Trophy, Skull } from 'lucide-react';
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

  // Independent shots are driven by each correctly entered letter.
  const [bullets, setBullets] = useState<LetterBullet[]>([]);
  const [shotCounts, setShotCounts] = useState({ player: 0, bot: 0 });
  const [impactCount, setImpactCount] = useState(0);
  const [roundBanner, setRoundBanner] = useState<'player' | 'bot' | null>(null);
  const nextBulletId = useRef(0);
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
    setBullets(prev => [...prev, shot]);
    setShotCounts(prev => ({ ...prev, [from]: prev[from] + 1 }));
    soundManager.playGunFireSound();
    pose(from, 'fire', 105);
    // Each bullet registers its own visual impact, without awarding duplicate kills.
    // Scoring is resolved by first word completion, preventing duplicate wins.
    later(() => setBullets(prev => prev.filter(b => b.id !== shot.id)), 480);
  };

  const finishRound = (winner: 'player' | 'bot') => {
    if (roundLocked.current || winningShotRef.current) return;
    winningShotRef.current = winner;
    roundLocked.current = true;
    if (botTimeoutRef.current !== null) clearTimeout(botTimeoutRef.current);
    const playerWon = winner === 'player';
    setRoundBanner(winner);
    if (!reducedMotion) setState(prev => ({ ...prev, shakeActive: true }));
    later(() => setState(prev => ({ ...prev, shakeActive: false })), 330);
    setState(prev => ({
      ...prev,
      phase: 'hit',
      roundWinner: winner,
      playerKills: prev.playerKills + (playerWon ? 1 : 0),
      botKills: prev.botKills + (playerWon ? 0 : 1),
      matchWinner: (playerWon ? prev.playerKills : prev.botKills) + 1 >= 3 ? winner : null
    }));
    // Let the last fired shot arrive before ending the round.
    later(() => {
      pose(playerWon ? 'bot' : 'player', 'hit');
      soundManager.playImpact(playerWon);
    }, 220);
    later(() => {
      const cur = stateRef.current;
      if (cur.matchWinner) {
        setState(prev => ({ ...prev, phase: 'finished' }));
        setLeftPose(cur.matchWinner === 'player' ? 'victory' : 'defeat');
        setRightPose(cur.matchWinner === 'bot' ? 'victory' : 'defeat');
        if (cur.matchWinner === 'player') {
          soundManager.playVictory();
          confetti({ particleCount: 130, spread: 90, origin: { y: 0.6 } });
        } else soundManager.playDefeat();
        return;
      }
      const nextWord = getRandomWord(difficulty, cur.currentWord);
      const nextWpm = pickBotWpm();
      winningShotRef.current = null;
      setRoundBanner(null);
      lastPlayerInput.current = '';
      setLeftPose('idle');
      setRightPose('idle');
      setInputError(false);
      roundLocked.current = false;
      setState(prev => ({
        ...prev, round: prev.round + 1, currentWord: nextWord,
        botWpm: nextWpm, playerInput: '', botInput: '',
        botProgress: 0, phase: 'typing', roundWinner: null
      }));
      later(() => inputRef.current?.focus(), 30);
      startBotTyping(nextWord, nextWpm);
    }, 650);
  };

  const startBotTyping = (word: string, wpm: number) => {
    if (botTimeoutRef.current !== null) clearTimeout(botTimeoutRef.current);
    const delay = 60000 / (wpm * 5);
    let count = 0;
    const tick = () => {
      if (roundLocked.current) return;
      count++;
      setState(prev => ({ ...prev, botInput: word.slice(0, count), botProgress: count }));
      fire('bot');
      if (count >= word.length) {
        finishRound('bot');
        return;
      }
      botTimeoutRef.current = window.setTimeout(tick, delay * (0.85 + Math.random() * 0.3));
    };
    botTimeoutRef.current = window.setTimeout(tick, 180 + Math.random() * 100);
  };

  const runCountdown = () => {
    clearTimers();
    roundLocked.current = true;
    winningShotRef.current = null;
    lastPlayerInput.current = '';
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
    const target = stateRef.current.currentWord;
    // Deletions and incorrect characters cannot fire a bullet.
    if (!target.startsWith(typed)) {
      setInputError(true);
      soundManager.playTypeError();
      return;
    }
    const previous = lastPlayerInput.current;
    lastPlayerInput.current = typed;
    setInputError(false);
    setState(prev => ({ ...prev, playerInput: typed }));
    if (typed.length > previous.length) {
      for (let i = previous.length; i < typed.length; i++) fire('player');
      if (typed === target) finishRound('player');
    }
  };

  const handlePlayAgain = () => {
    soundManager.playClick();
    clearTimers();
    setBullets([]);
    setRoundBanner(null);
    setImpactCount(0);
    setShotCounts({ player: 0, bot: 0 });
    setInputError(false);
    lastPlayerInput.current = '';
    winningShotRef.current = null;
    roundLocked.current = true;
    const word = getRandomWord(difficulty);
    setState({
      round: 1, playerKills: 0, botKills: 0, currentWord: word,
      playerInput: '', botInput: '', botWpm: pickBotWpm(),
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
    // Impact is a visual feedback event per letter; the first word finisher wins the round.
  };

  const handleExitMatch = () => {
    soundManager.playClick();
    clearTimers();
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

      {/* Both gunfighters fire independently on every correct letter. */}
      <SideCharacters isBattle leftState={leftPose} rightState={rightPose} playerShots={shotCounts.player} botShots={shotCounts.bot} />
      <BattleFxCanvas bullets={bullets} onImpact={handleBulletImpact} />
      {roundBanner && <div className={`round-impact-banner ${roundBanner === 'player' ? 'round-blue' : 'round-pink'}`} key={`${state.round}-${roundBanner}`}>{roundBanner === 'player' ? 'DIRECT HIT!' : 'OPPONENT HIT!'}</div>}
      <div className="impact-counter" aria-live="off" key={impactCount}>{impactCount > 0 ? '✦' : ''}</div>

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
