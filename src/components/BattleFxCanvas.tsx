import React, { useEffect, useRef } from 'react';

export interface LetterBullet {
  id: number;
  from: 'player' | 'bot';
  createdAt: number;
}

interface BattleFxCanvasProps {
  bullets: LetterBullet[];
  onImpact?: (bullet: LetterBullet) => void;
}

// One uninterrupted browser-refresh-synchronized animation loop; overlapping bullets
// remain independent, so fast typing cannot reset a previous projectile.
export const BattleFxCanvas: React.FC<BattleFxCanvasProps> = ({ bullets, onImpact }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bulletsRef = useRef(bullets);
  const impactRef = useRef(onImpact);
  const impactedRef = useRef(new Set<number>());
  bulletsRef.current = bullets;
  impactRef.current = onImpact;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let active = true;
    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    const draw = (now: number) => {
      if (!active) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const duration = 300;
      const visible = bulletsRef.current;
      for (const shot of visible) {
        const progress = Math.max(0, Math.min(1, (now - shot.createdAt) / duration));
        const player = shot.from === 'player';
        // Gun muzzle and opponent center, matched to the compact battle sprites.
        const x0 = w * (player ? 0.235 : 0.765);
        const x1 = w * (player ? 0.82 : 0.18);
        const y = h * 0.565;
        const x = x0 + (x1 - x0) * progress;
        const color = player ? '#48bfff' : '#ff70b5';

        if (progress >= 1 && !impactedRef.current.has(shot.id)) {
          impactedRef.current.add(shot.id);
          impactRef.current?.(shot);
        }
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = w * 0.012;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(x, y, Math.max(3, w * 0.005), Math.max(2, h * 0.004), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (progress < 0.18) {
          ctx.save();
          ctx.globalAlpha = 1 - progress / 0.18;
          ctx.fillStyle = '#fff2bb';
          ctx.beginPath();
          ctx.arc(x0, y, w * 0.016, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        if (progress >= 1) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, 1 - (now - shot.createdAt - duration) / 140);
          ctx.strokeStyle = color;
          ctx.lineWidth = Math.max(2, w * 0.003);
          ctx.beginPath();
          ctx.arc(x1, y, w * 0.024, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
      // Forget completed projectiles only after the parent drops them.
      const liveIds = new Set(visible.map(b => b.id));
      impactedRef.current.forEach(id => { if (!liveIds.has(id)) impactedRef.current.delete(id); });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      active = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  return <canvas ref={canvasRef} className="battle-canvas-fx" />;
};
