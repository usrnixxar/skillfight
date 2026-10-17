export type GameScreen =
  | 'home'
  | 'modes'
  | 'settings'
  | 'student'
  | 'student-options'
  | 'rooms'
  | 'waiting'
  | 'battle'
  | 'quit';

export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface DifficultyConfig {
  name: string;
  minWpm: number;
  maxWpm: number;
  minCharLen: number;
  maxCharLen: number;
  color: string;
}

export const DIFFICULTY_CONFIGS: Record<BotDifficulty, DifficultyConfig> = {
  easy: {
    name: 'EASY',
    minWpm: 15,
    maxWpm: 25,
    minCharLen: 3,
    maxCharLen: 5,
    color: '#168b79'
  },
  medium: {
    name: 'MEDIUM',
    minWpm: 26,
    maxWpm: 45,
    minCharLen: 5,
    maxCharLen: 8,
    color: '#2868b4'
  },
  hard: {
    name: 'HARD',
    minWpm: 46,
    maxWpm: 70,
    minCharLen: 7,
    maxCharLen: 12,
    color: '#b63d3d'
  }
};

export interface GameSettings {
  masterVolume: number; // 0-100
  musicVolume: number;  // 0-100
  sfxVolume: number;    // 0-100
  musicEnabled: boolean;
  sfxEnabled: boolean;
  fullscreen: boolean;
  reducedMotion: boolean;
  playerName: string;
}

export type BattlePhase =
  | 'countdown'      // 3 -> 2 -> 1 -> GO!
  | 'typing'         // typing race active
  | 'attack'         // projectile traveling
  | 'hit'            // character recoil + screen shake
  | 'recovery'       // brief recovery before next word
  | 'finished';      // match ended

export interface BattleState {
  round: number;
  playerKills: number;
  botKills: number;
  currentWord: string;
  playerInput: string;
  botInput: string;
  botWpm: number;
  botProgress: number;
  phase: BattlePhase;
  countdownValue: number; // 3, 2, 1, 0 (GO)
  roundWinner: 'player' | 'bot' | null;
  matchWinner: 'player' | 'bot' | null;
  shakeActive: boolean;
  bulletActive: boolean;
  bulletDirection: 'player-to-bot' | 'bot-to-player';
  bulletProgress: number; // 0 to 1
  impactActive: boolean;
}
