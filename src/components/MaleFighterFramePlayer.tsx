import React, { useEffect, useRef, useState } from 'react';
import {
  MALE_ATTACK_CONFIG,
  MALE_ATTACK_EVENTS,
  FrameEvent,
  getMaleAttackFramePath
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
  const animFrameIdRef = useRef<number | null>(null);
  const firedEventsRef = useRef<Set<number>>(new Set());
  const [currentFrameNum, setCurrentFrameNum] = useState<number>(1);

  // When isPlaying changes to true, run the 48 FPS frame playback
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      firedEventsRef.current.clear();
      setCurrentFrameNum(1);
      return;
    }

    firedEventsRef.current.clear();
    const startTime = performance.now();
    const frameDuration = MALE_ATTACK_CONFIG.frameDuration; // 1000 / 48 = 20.833ms
    const totalFrames = MALE_ATTACK_CONFIG.totalFrames; // 240

    const renderLoop = (now: number) => {
      const elapsed = now - startTime;
      const targetFrame = Math.min(totalFrames, 1 + Math.floor(elapsed / frameDuration));
      setCurrentFrameNum(targetFrame);

      // 1. Dispatch any frame events that should have fired by this frame
      for (const ev of MALE_ATTACK_EVENTS) {
        if (ev.frame <= targetFrame && !firedEventsRef.current.has(ev.frame)) {
          firedEventsRef.current.add(ev.frame);
          if (onFrameEvent) {
            onFrameEvent(ev);
          }
        }
      }

      // 2. Draw current frame on canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const preloadedImg = framePreloader.getFrame(targetFrame);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (preloadedImg && preloadedImg.complete && preloadedImg.naturalWidth > 0) {
            ctx.drawImage(preloadedImg, 0, 0, canvas.width, canvas.height);
          } else {
            // If frame hasn't cached yet, draw via image element
            const img = new Image();
            img.src = getMaleAttackFramePath(targetFrame);
            img.onload = () => {
              if (canvasRef.current) {
                const c = canvasRef.current.getContext('2d');
                c?.clearRect(0, 0, canvas.width, canvas.height);
                c?.drawImage(img, 0, 0, canvas.width, canvas.height);
              }
            };
          }
        }
      }

      // 3. Check completion
      if (targetFrame >= totalFrames || elapsed >= MALE_ATTACK_CONFIG.totalDuration) {
        // Ensure final events fire
        for (const ev of MALE_ATTACK_EVENTS) {
          if (!firedEventsRef.current.has(ev.frame)) {
            firedEventsRef.current.add(ev.frame);
            if (onFrameEvent) onFrameEvent(ev);
          }
        }

        if (onComplete) {
          onComplete();
        }
        return;
      }

      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      firedEventsRef.current.clear();
    };
  }, [isPlaying, onFrameEvent, onComplete]);

  return (
    <div className={`male-frame-player-wrapper ${energyGlow ? 'energy-peak' : ''}`}>
      {isPlaying ? (
        <canvas
          ref={canvasRef}
          width={432}
          height={768}
          className="fighter-canvas-frame"
        />
      ) : (
        <img
          src={fallbackSprite}
          alt="Blue Male Fighter"
          className="fighter-image"
          draggable={false}
        />
      )}
    </div>
  );
};
export default MaleFighterFramePlayer;
