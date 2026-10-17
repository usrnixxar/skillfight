import React from 'react';
import { MaleFighterFramePlayer } from './MaleFighterFramePlayer';
import { FrameEvent } from '../game/maleFighterConfig';

export type CharacterActionState =
  | 'idle'
  | 'ready'
  | 'typing-low'
  | 'typing-mid'
  | 'typing-high'
  | 'attack'
  | 'hit'
  | 'recover'
  | 'victory'
  | 'defeat';

interface SideCharactersProps {
  isBattle?: boolean;
  leftState?: CharacterActionState;
  rightState?: CharacterActionState;
  isMaleFrameAttack?: boolean;
  onMaleFrameEvent?: (event: FrameEvent) => void;
  onMaleAttackComplete?: () => void;
  energyGlow?: boolean;
}

export const SideCharacters: React.FC<SideCharactersProps> = ({
  isBattle = false,
  leftState = 'idle',
  rightState = 'idle',
  isMaleFrameAttack = false,
  onMaleFrameEvent,
  onMaleAttackComplete,
  energyGlow = false
}) => {
  const getAnimClassLeft = () => {
    switch (leftState) {
      case 'ready':
        return 'fighter-anim-ready';
      case 'typing-low':
        return 'fighter-anim-typing-low';
      case 'typing-mid':
        return 'fighter-anim-typing-mid';
      case 'typing-high':
        return 'fighter-anim-typing-high';
      case 'attack':
        return 'fighter-attack-lunge-left';
      case 'hit':
        return 'fighter-hit-recoil-left';
      case 'recover':
        return 'fighter-anim-recover';
      case 'victory':
        return 'fighter-victory';
      case 'defeat':
        return 'fighter-defeat-left';
      default:
        return 'fighter-anim-idle';
    }
  };

  const getAnimClassRight = () => {
    switch (rightState) {
      case 'ready':
        return 'fighter-anim-ready';
      case 'typing-low':
        return 'fighter-anim-typing-low';
      case 'typing-mid':
        return 'fighter-anim-typing-mid';
      case 'typing-high':
        return 'fighter-anim-typing-high';
      case 'attack':
        return 'fighter-attack-lunge-right';
      case 'hit':
        return 'fighter-hit-recoil-right';
      case 'recover':
        return 'fighter-anim-recover';
      case 'victory':
        return 'fighter-victory';
      case 'defeat':
        return 'fighter-defeat-right';
      default:
        return 'fighter-anim-idle';
    }
  };

  // Select sprite for Blue Fighter (Left side)
  const getLeftSprite = () => {
    if (leftState === 'hit' || leftState === 'defeat') return '/assets/characters/p1_hit.png';
    if (leftState === 'victory') return '/assets/characters/p1_victory.png';
    return '/assets/characters/p1_idle.png';
  };

  // Select sprite for Pink Fighter (Right side)
  const getRightSprite = () => {
    if (rightState === 'attack') return '/assets/characters/p2_attack.png';
    if (rightState === 'hit' || rightState === 'defeat') return '/assets/characters/p2_hit.png';
    if (rightState === 'victory') return '/assets/characters/p2_victory.png';
    return '/assets/characters/p2_idle.png';
  };

  const isLeftAttacking = isMaleFrameAttack || (isBattle && leftState === 'attack');

  return (
    <>
      {/* Left Blue Fighter (Frame-driven 240 frames attack animation) */}
      <div className={`side-fighter-left ${getAnimClassLeft()} ${isBattle ? 'battle-mode' : ''}`}>
        <MaleFighterFramePlayer
          isPlaying={isLeftAttacking}
          onFrameEvent={onMaleFrameEvent}
          onComplete={onMaleAttackComplete}
          fallbackSprite={getLeftSprite()}
          energyGlow={energyGlow}
        />
        {/* Magic Aura when typing with high intensity */}
        {(leftState === 'typing-mid' || leftState === 'typing-high') && !isLeftAttacking && (
          <div className={`fighter-aura blue ${leftState === 'typing-high' ? 'high' : ''}`} />
        )}
      </div>

      {/* Right Pink Fighter */}
      <div className={`side-fighter-right ${getAnimClassRight()} ${isBattle ? 'battle-mode' : ''}`}>
        <img
          src={getRightSprite()}
          alt="Pink Fighter (Player 2 / Bot)"
          className="fighter-image"
          draggable={false}
        />
        {/* Magic Aura when typing with high intensity */}
        {(rightState === 'typing-mid' || rightState === 'typing-high') && (
          <div className={`fighter-aura pink ${rightState === 'typing-high' ? 'high' : ''}`} />
        )}
      </div>
    </>
  );
};
export default SideCharacters;
