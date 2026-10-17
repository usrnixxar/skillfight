import { BotDifficulty } from '../types/game';

const EASY_WORDS = [
  'CODE', 'RUN', 'FAST', 'BYTE', 'PLAY', 'KEY', 'TYPE', 'WIN', 'JUMP', 'FIGHT',
  'SWORD', 'MAGIC', 'SKILL', 'ARENA', 'POWER', 'HERO', 'BOT', 'GAME', 'LEVEL',
  'SCORE', 'BEAM', 'BLAST', 'SHOCK', 'SPELL', 'DASH', 'SPARK', 'CLICK', 'FIRE',
  'FLASH', 'BURST', 'CHAMP', 'SMART', 'BRAIN', 'LOGIC', 'INPUT', 'STAGE', 'CLOUD',
  'STARS', 'HEART', 'LIGHT', 'QUEST', 'GUARD', 'SLASH', 'SPEED', 'READY'
];

const MEDIUM_WORDS = [
  'KEYBOARD', 'BATTLE', 'FIGHTER', 'PLAYER', 'STRIKE', 'COMBAT', 'VICTORY',
  'WARRIOR', 'ACADEMY', 'STUDENT', 'CHALLENGE', 'CIRCUIT', 'MONITOR', 'CONTROL',
  'CONSOLE', 'DEFENSE', 'ATTACK', 'PROJECT', 'COMPUTE', 'NETWORK', 'PROGRAM',
  'DYNAMIC', 'REACTOR', 'IMPULSE', 'CHARGER', 'CHAMPION', 'MASTERY', 'SUCCESS',
  'PROCESS', 'REFLEX', 'ACCURACY', 'TRAINING', 'ADVANCE', 'ENERGY', 'ELEMENT',
  'TACTICS', 'COUNTER', 'BALANCE', 'COMMAND', 'SHIELD'
];

const HARD_WORDS = [
  'TYPINGBATTLE', 'SKILLENCE', 'DEVELOPMENT', 'CHAMPIONSHIP', 'CYBERNETIC',
  'THUNDERBOLT', 'ACCELERATION', 'HYPERDRIVE', 'SUPERSONIC', 'INTERACTIVE',
  'PROGRAMMING', 'ALGORITHM', 'SUPERPOWER', 'DEFEATLESS', 'COMPETITION',
  'SYNCHRONIZE', 'CALCULATOR', 'PERFORMANCE', 'INTELLIGENCE', 'UNSTOPPABLE',
  'LEGENDARY', 'OVERPOWERED', 'LIGHTNING', 'CONCENTRATION', 'MULTITHREAD',
  'ARCHITECTURE', 'ENCRYPTION', 'RESOLUTE', 'TACTICALPLAY'
];

export function getRandomWord(difficulty: BotDifficulty, previousWord?: string): string {
  let list: string[];
  switch (difficulty) {
    case 'easy':
      list = EASY_WORDS;
      break;
    case 'medium':
      list = MEDIUM_WORDS;
      break;
    case 'hard':
      list = HARD_WORDS;
      break;
  }

  // Filter out previous word to avoid immediate repetitions
  const pool = list.filter(w => w.toUpperCase() !== previousWord?.toUpperCase());
  const chosenList = pool.length > 0 ? pool : list;
  return chosenList[Math.floor(Math.random() * chosenList.length)].toUpperCase();
}
