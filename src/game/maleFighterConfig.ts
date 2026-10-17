export interface MaleAttackConfig {
  animationId: string;
  assetFolder: string;
  filePattern: string;
  totalFrames: number;
  originalFPS: number;
  gameplayFPS: number;
  frameDuration: number;
  totalDuration: number;
  startFrame: number;
  endFrame: number;
  loop: boolean;
  repeat: number;
  direction: string;
  anchor: string;
  flipX: boolean;
  interruptible: boolean;
}

export const MALE_ATTACK_CONFIG: MaleAttackConfig = {
  animationId: "male_attack",
  assetFolder: "Male_Fighter_PNG_Frames",
  filePattern: "frame_{0001..0240}.png",
  totalFrames: 240,
  originalFPS: 24,
  gameplayFPS: 48,
  frameDuration: 1000 / 48,
  totalDuration: 5000,
  startFrame: 1,
  endFrame: 240,
  loop: false,
  repeat: 0,
  direction: "right",
  anchor: "bottom-center",
  flipX: false,
  interruptible: false
};

export interface FrameEvent {
  frame: number;
  event: string;
  action: string;
  state?: string;
}

export const MALE_ATTACK_EVENTS: FrameEvent[] = [
  { frame: 1, event: "ATTACK_START", action: "lockTyping" },
  { frame: 25, event: "WEAPON_RAISE", action: "playWeaponRaiseSound" },
  { frame: 61, event: "AIM_START", action: "setCharacterState", state: "aim" },
  { frame: 97, event: "ENERGY_CHARGE_START", action: "playChargingSound" },
  { frame: 137, event: "CHARGE_PEAK", action: "increaseEnergyGlow" },
  { frame: 145, event: "TRIGGER_PRESS", action: "playTriggerSound" },
  { frame: 150, event: "PROJECTILE_RELEASE", action: "launchBlueProjectile" },
  { frame: 151, event: "FIRING_SOUND", action: "playGunFireSound" },
  { frame: 154, event: "MUZZLE_FLASH_END", action: "hideMuzzleFlash" },
  { frame: 181, event: "RECOVERY_START", action: "setCharacterState", state: "recover" },
  { frame: 240, event: "ATTACK_COMPLETE", action: "returnToIdle" }
];

export interface ProjectileConfig {
  releaseFrame: number;
  releaseTimeMs: number;
  projectileDurationMs: number;
  expectedImpactTimeMs: number;
  color: string;
  direction: string;
  muzzleFlashDurationMs: number;
  impactFlashDurationMs: number;
  screenShake: { durationMs: number; intensityPx: number };
  opponentHitAnimation: string;
}

export const PROJECTILE_CONFIG: ProjectileConfig = {
  releaseFrame: 150,
  releaseTimeMs: 3104.17,
  projectileDurationMs: 350,
  expectedImpactTimeMs: 3454.17,
  color: "#48BFFF",
  direction: "left-to-right",
  muzzleFlashDurationMs: 85,
  impactFlashDurationMs: 180,
  screenShake: { durationMs: 300, intensityPx: 6 },
  opponentHitAnimation: "female_hit"
};

/**
 * Returns formatted 1-based frame file path: /Male_Fighter_PNG_Frames/frame_0001.png
 */
export function getMaleAttackFramePath(frameNumber: number): string {
  const clamped = Math.max(1, Math.min(MALE_ATTACK_CONFIG.totalFrames, Math.round(frameNumber)));
  const padded = clamped.toString().padStart(4, '0');
  return `/${MALE_ATTACK_CONFIG.assetFolder}/frame_${padded}.png`;
}
