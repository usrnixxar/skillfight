import React, { useEffect, useRef, useState } from 'react';
export type CharacterActionState = 'idle' | 'ready' | 'aim' | 'fire' | 'hit' | 'recover' | 'victory' | 'defeat' | 'typing-low' | 'typing-mid' | 'typing-high' | 'attack';

interface Props {
  isBattle?: boolean;
  leftState?: CharacterActionState;
  rightState?: CharacterActionState;
  playerShots?: number;
  botShots?: number;
}

// Frames are copied from the uploaded "male 2" and "female 2" folders by GitHub Actions.
// Keep identical canvas dimensions across poses to prevent character jumping.
const male = ['frame_01_idle.png','frame_02_raise_1.png','frame_03_raise_2.png','frame_04_raise_3.png','frame_05_aim_1.png','frame_06_aim_2.png','frame_07_aim_3.png','frame_08_aim_4.png','frame_09_fire_1.png','frame_10_fire_2.png'];
const female = ['frame_01_idle.png','frame_02_raise_1.png','frame_03_raise_2.png','frame_04_raise_3.png','frame_05_aim_1.png','frame_06_aim_2.png','frame_07_fire_1.png','frame_08_fire_2.png','frame_09_recover_1.png','frame_10_recover_2.png'];

function Fighter({ side, state, shots }: {side: 'male2' | 'female2'; state: CharacterActionState; shots: number}) {
  const frames = side === 'male2' ? male : female;
  const aimFrame = side === 'male2' ? 7 : 5;
  const fireFrame = side === 'male2' ? 8 : 6;
  const [frame, setFrame] = useState(0);
  const raised = useRef(false);
  const lastShot = useRef(shots);
  const sequence = useRef<number[]>([]);
  const clear = () => { sequence.current.forEach(window.clearTimeout); sequence.current = []; };
  const schedule = (fn: () => void, ms: number) => { sequence.current.push(window.setTimeout(fn, ms)); };
  useEffect(() => () => clear(), []);
  useEffect(() => {
    if (state === 'idle' || state === 'ready' || state === 'defeat' || state === 'victory') {
      clear();
      raised.current = false;
      setFrame(0);
    }
  }, [state]);
  useEffect(() => {
    if (shots === lastShot.current) return;
    lastShot.current = shots;
    clear();
    if (!raised.current) {
      raised.current = true;
      // A short raising sequence plays on the first correct letter.
      [1,2,3,4,aimFrame].forEach((f,i) => schedule(() => setFrame(f), i * 42));
      schedule(() => setFrame(fireFrame), 215);
      schedule(() => setFrame(fireFrame + 1), 270);
      schedule(() => setFrame(aimFrame), 325);
    } else {
      setFrame(fireFrame);
      schedule(() => setFrame(fireFrame + 1), 55);
      schedule(() => setFrame(aimFrame), 115);
    }
  }, [shots]);
  return <img decoding="async" src={`/assets/characters/${side}/${frames[frame]}`} alt={side === 'male2' ? 'Blue gunfighter' : 'Pink gunfighter'} className="fighter-image" draggable={false} />;
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
