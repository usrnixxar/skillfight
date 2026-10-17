import React from 'react';

export type CharacterActionState =
  | 'idle'
  | 'typing-low'
  | 'typing-mid'
  | 'typing-high'
  | 'attack'
  | 'hit'
  | 'victory'
  | 'defeat';

interface SideCharactersProps {
  isBattle?: boolean;
  leftState?: CharacterActionState;
  rightState?: CharacterActionState;
}

export const SideCharacters: React.FC<SideCharactersProps> = ({
  isBattle = false,
  leftState = 'idle',
  rightState = 'idle'
}) => {
  const getAnimClassLeft = () => {
    switch (leftState) {
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
      case 'victory':
        return 'fighter-victory';
      default:
        return 'fighter-anim-idle';
    }
  };

  const getAnimClassRight = () => {
    switch (rightState) {
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
      case 'victory':
        return 'fighter-victory';
      default:
        return 'fighter-anim-idle';
    }
  };

  // Select appropriate sprite
  const leftSrc = (isBattle && leftState === 'attack')
    ? '/assets/extracted/p1_battle_attack.png'
    : '/assets/extracted/p1_idle.png';

  const rightSrc = (isBattle && rightState === 'hit')
    ? '/assets/extracted/p2_battle_hit.png'
    : '/assets/extracted/p2_idle.png';

  return (
    <>
      <div className={`side-fighter-left ${getAnimClassLeft()}`}>
        <img
          src={leftSrc}
          alt="Blue Fighter (Player 1)"
          className="fighter-image"
          draggable={false}
        />
      </div>

      <div className={`side-fighter-right ${getAnimClassRight()}`}>
        <img
          src={rightSrc}
          alt="Pink Fighter (Player 2)"
          className="fighter-image"
          draggable={false}
        />
      </div>
    </>
  );
};
