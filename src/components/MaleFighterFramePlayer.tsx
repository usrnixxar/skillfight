import React, { useEffect, useRef } from 'react';
import {
  MALE_ATTACK_CONFIG,
  MALE_ATTACK_EVENTS,
  FrameEvent
} from '../game/maleFighterConfig';
import { framePreloader } from '../game/framePreloader';

interface MaleFighterFramePlayerProps {
  isPlaying: boolean;
  onFrameEvent?: (event: FrameEvent) => void;
  onComplete?: () => void;
  fallbackSprite: string;
  energyGlow?: boolean;
}

export const MaleFighterFramePlayer: React.FC<MaleFighterFramePlayerProps> = ({
  isPlaying,
  onFrameEvent,
  onComplete,
  fallbackSprite,
  energyGlow = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  // Keep callbacks current without restarting the active animation each render.
  const eventCallbackRef = useRef(onFrameEvent);
  const completeCallbackRef = useRef(onComplete);
  eventCallbackRef.current = onFrameEvent;
  completeCallbackRef.current = onComplete;

  useEffect(() => {
    if (!isPlaying) return;

    let cancelled = false;
    const firedEvents = new Set<number>();
    let lastDrawnFrame = 0;

    const run = async () => {
      // Never start the animation clock until its frames are preloaded.
      await framePreloader.preloadAll();
      if (cancelled) return;

      const startTime = performance.now();
      const render = (now: number) => {
        if (cancelled) return;
        const elapsed = now - startTime;
        const target = Math.min(
          MALE_ATTACK_CONFIG.totalFrames,
          1 + Math.floor(elapsed / MALE_ATTACK_CONFIG.frameDuration)
        );

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const img = framePreloader.getFrame(target);
        if (ctx && canvas && img?.complete && img.naturalWidth > 0 && target !== lastDrawnFrame) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          lastDrawnFrame = target;
        }
        // Missing frames retain the last valid picture; never schedule stale onload draws.
        // Dispatch gameplay events once, in sequence, from the same animation clock.
        for (const ev of MALE_ATTACK_EVENTS) {
          if (ev.event === 'ATTACK_COMPLETE') continue;
          if (ev.frame <= target && !firedEvents.has(ev.frame)) {
            firedEvents.add(ev.frame);
            eventCallbackRef.current?.(ev);
          }
        }

        if (target >= MALE_ATTACK_CONFIG.totalFrames) {
          // A single completion path avoids duplicate next-round/victory transitions.
          completeCallbackRef.current?.();
          return;
        }
        rafRef.current = requestAnimationFrame(render);
      };
      rafRef.current = requestAnimationFrame(render);
    };
    void run();

    return () => {
      cancelled = true;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying]);

  return (
    <div className={`male-frame-player-wrapper ${energyGlow ? 'energy-peak' : ''}`}>
      {isPlaying ? (
        <canvas ref={canvasRef} width={432} height={768} className="fighter-canvas-frame" />
      ) : (
        <img src={fallbackSprite} alt="Blue Male Fighter" className="fighter-image" draggable={false} />
      )}
    </div>
  );
};
export default MaleFighterFramePlayer;
