import React, { useEffect, useRef, useState } from 'react';

export type CharacterActionState = 'idle' | 'ready' | 'aim' | 'fire' | 'hit' | 'recover' | 'victory' | 'defeat' | 'typing-low' | 'typing-mid' | 'typing-high' | 'attack';

interface Props {
  isBattle?: boolean;
  leftState?: CharacterActionState;
  rightState?: CharacterActionState;
  playerShots?: number;
  botShots?: number;
}

const male = ['frame_01_idle.png','frame_02_raise_1.png','frame_03_raise_2.png','frame_04_raise_3.png','frame_05_aim_1.png','frame_06_aim_2.png','frame_07_aim_3.png','frame_08_aim_4.png','frame_09_fire_1.png','frame_10_fire_2.png'];
const female = ['frame_01_idle.png','frame_02_raise_1.png','frame_03_raise_2.png','frame_04_raise_3.png','frame_05_aim_1.png','frame_06_aim_2.png','frame_07_fire_1.png','frame_08_fire_2.png','frame_09_recover_1.png','frame_10_recover_2.png'];

function Fighter({ side, state, shots }: { side: 'male2' | 'female2'; state: CharacterActionState; shots: number }) {
  const frames = side === 'male2' ? male : female;
  const aimFrame = side === 'male2' ? 7 : 5;
  const fireFrame = side === 'male2' ? 8 : 6;
  const [frame, setFrame] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const lastShots = useRef(shots);
  const pending = useRef(0);
  const raised = useRef(false);
  const playing = useRef(false);
  const active = useRef(true);
  const timers = useRef<number[]>([]);
  const clear = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  };
  const after = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(() => { if (active.current) fn(); }, ms));
  };
  // Decode all poses once: an unloaded image must never replace an active sprite.
  useEffect(() => {
    let cancelled = false;
    active.current = true;
    setLoaded(false);
    Promise.all(frames.map(name => new Promise<void>(resolve => {
      const img = new Image();
      img.onload = () => { img.decode?.().catch(() => {}).finally(resolve) ?? resolve(); };
      img.onerror = () => resolve();
      img.src = `/assets/characters/${side}/${name}`;
    }))).then(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; active.current = false; clear(); };
  }, [side]);

  const fireNext = () => {
    if (!active.current || !raised.current || playing.current || pending.current <= 0) return;
    pending.current--;
    playing.current = true;
    setFrame(fireFrame);
    after(60, () => setFrame(fireFrame + 1));
    after(120, () => {
      setFrame(aimFrame);
      playing.current = false;
      fireNext();
    });
  };
  useEffect(() => {
    if (state === 'idle' || state === 'ready' || state === 'victory' || state === 'defeat') {
      clear();
      raised.current = false;
      playing.current = false;
      pending.current = 0;
      lastShots.current = shots;
      setFrame(0);
    }
  }, [state === 'idle' || state === 'ready' || state === 'victory' || state === 'defeat']);

  useEffect(() => {
    const delta = Math.max(0, shots - lastShots.current);
    lastShots.current = shots;
    if (!delta || !loaded) return;
    pending.current += delta;
    if (!raised.current) {
      // Lock the first raise sequence; new letters append to the firing queue.
      raised.current = true;
      playing.current = true;
      [1, 2, 3, 4, aimFrame].forEach((idx, n) => after(n * 48, () => setFrame(idx)));
      after(240, () => {
        playing.current = false;
        fireNext();
      });
    } else fireNext();
  }, [shots, loaded]);

  return <img src={`/assets/characters/${side}/${frames[frame]}`} alt={side === 'male2' ? 'Blue gunfighter' : 'Pink gunfighter'} className="fighter-image" draggable={false} />;
}

export const SideCharacters: React.FC<Props> = ({ isBattle = false, leftState = 'idle', rightState = 'idle', playerShots = 0, botShots = 0 }) => (
  <>
    <div className={`side-fighter-left ${leftState === 'hit' ? 'fighter-hit-recoil-left' : ''} ${isBattle ? 'battle-mode' : ''}`}>
      <Fighter side="male2" state={leftState} shots={playerShots} />
    </div>
    <div className={`side-fighter-right ${rightState === 'hit' ? 'fighter-hit-recoil-right' : ''} ${isBattle ? 'battle-mode' : ''}`}>
      <Fighter side="female2" state={rightState} shots={botShots} />
    </div>
  </>
);
export default SideCharacters;
