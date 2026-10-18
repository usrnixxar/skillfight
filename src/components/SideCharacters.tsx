import React, { useState } from 'react';

export type CharacterActionState =
  | 'idle' | 'ready' | 'aim' | 'fire' | 'hit'
  | 'recover' | 'victory' | 'defeat'
  | 'typing-low' | 'typing-mid' | 'typing-high' | 'attack';

interface SideCharactersProps {
  isBattle?: boolean;
  leftState?: CharacterActionState;
  rightState?: CharacterActionState;
}

// Fall back to the original asset until the new gun illustrations have been uploaded.
const GunSprite = ({ side, state }: { side: 'p1' | 'p2'; state: CharacterActionState }) => {
  const [broken, setBroken] = useState<string[]>([]);
  const action = state === 'aim' || state === 'fire' || state === 'attack' || state.startsWith('typing')
    ? 'aim' : 'idle';
  const requested = `/assets/characters/${side}_gun_${action}.png`;
  const fallback = `/assets/characters/${side}_idle.png`;
  return (
    <img
      src={broken.includes(requested) ? fallback : requested}
      onError={() => setBroken(prev => prev.includes(requested) ? prev : [...prev, requested])}
      alt={side === 'p1' ? 'Blue gunfighter' : 'Pink gunfighter'}
      className="fighter-image"
      draggable={false}
    />
  );
};

export const SideCharacters: React.FC<SideCharactersProps> = ({
  isBattle = false, leftState = 'idle', rightState = 'idle'
}) => (
  <>
    <div className={`side-fighter-left ${leftState === 'fire' ? 'gunfire-player' : leftState === 'hit' ? 'fighter-hit-recoil-left' : ''} ${isBattle ? 'battle-mode' : 'fighter-anim-idle'}`}>
      <GunSprite side="p1" state={leftState} />
    </div>
    <div className={`side-fighter-right ${rightState === 'fire' ? 'gunfire-bot' : rightState === 'hit' ? 'fighter-hit-recoil-right' : ''} ${isBattle ? 'battle-mode' : 'fighter-anim-idle'}`}>
      <GunSprite side="p2" state={rightState} />
    </div>
  </>
);

export default SideCharacters;
