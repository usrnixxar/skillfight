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
  const aim = side === 'male2' ? 7 : 5;
  const firing = side === 'male2' ? 8 : 6;
  const [frame, setFrame] = useState(0);
  const lastShots = useRef(shots);
  const queued = useRef(0);
  const raisingAt = useRef<number | null>(null);
  const firingAt = useRef<number | null>(null);
  const currentFrame = useRef(0);
  const latestState = useRef(state);
  latestState.current = state;

  // Start loading all poses early, without pausing gameplay for image decoding.
  useEffect(() => {
    const images = frames.map(name => {
      const img = new Image();
      img.src = `/assets/characters/${side}/${name}`;
      return img;
    });
    return () => { images.forEach(img => { img.onload = null; img.onerror = null; }); };
  }, [side]);

  useEffect(() => {
    const delta = shots - lastShots.current;
    lastShots.current = shots;
    if (delta > 0) {
      queued.current = Math.min(queued.current + delta, 30);
      if (raisingAt.current === null) raisingAt.current = performance.now();
    } else if (delta < 0) {
      queued.current = 0;
      raisingAt.current = null;
      firingAt.current = null;
    }
  }, [shots]);

  // One clock drives all transitions, so delayed timers cannot interrupt or freeze poses.
  useEffect(() => {
    let raf = 0;
    let active = true;
    const tick = (now: number) => {
      if (!active) return;
      const status = latestState.current;
      let target = 0;
      if (status === 'ready' || status === 'defeat' || status === 'victory') {
        queued.current = 0;
        raisingAt.current = null;
        firingAt.current = null;
      } else if (raisingAt.current !== null) {
        const raisingElapsed = now - raisingAt.current;
        if (raisingElapsed < 250) {
          target = [1, 2, 3, 4, aim][Math.min(4, Math.floor(raisingElapsed / 50))];
        } else {
          if (firingAt.current === null && queued.current > 0) {
            queued.current--;
            firingAt.current = now;
          }
          if (firingAt.current !== null) {
            const elapsed = now - firingAt.current;
            if (elapsed < 55) target = firing;
            else if (elapsed < 110) target = firing + 1;
            else {
              firingAt.current = null;
              target = aim;
            }
          } else {
            target = aim;
          }
        }
      }
      if (target !== currentFrame.current) {
        currentFrame.current = target;
        setFrame(target);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { active = false; cancelAnimationFrame(raf); };
  }, [side]);

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
