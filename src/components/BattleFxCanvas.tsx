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
type Point = { x: number; y: number };
const DURATION = 290;

export const BattleFxCanvas: React.FC<BattleFxCanvasProps> = ({ bullets, onImpact }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bulletsRef = useRef(bullets);
  const callbackRef = useRef(onImpact);
  const landed = useRef(new Set<number>());
  const shotPaths = useRef(new Map<number, { start: Point; end: Point }>());
  bulletsRef.current = bullets;
  callbackRef.current = onImpact;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let ratio = 1;

    const resize = () => {
      // clientWidth/clientHeight stay in the arena's unrotated CSS coordinates.
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(w * ratio));
      canvas.height = Math.max(1, Math.round(h * ratio));
    };

    // Position objects entirely in arena-local coordinates. getBoundingClientRect()
    // is screen-space and swaps axes on phones with the 90-degree arena rotation.
    const pointOnFighter = (side: 'male2' | 'female2', xRatio: number, yRatio: number): Point | null => {
      const el = document.getElementById('fighter-sprite-' + side) as HTMLImageElement | null;
      const holder = el?.parentElement as HTMLElement | null;
      if (!el || !holder) return null;
      const naturalW = el.naturalWidth || (side === 'male2' ? 1024 : 720);
      const naturalH = el.naturalHeight || (side === 'male2' ? 1536 : 1280);
      const scale = Math.min(el.clientWidth / naturalW, el.clientHeight / naturalH);
      if (!isFinite(scale) || scale <= 0) return null;
      const drawnWidth = naturalW * scale;
      const drawnHeight = naturalH * scale;
      const left = holder.offsetLeft + el.offsetLeft + (el.clientWidth - drawnWidth) / 2;
      const top = holder.offsetTop + el.offsetTop + el.clientHeight - drawnHeight;
      return { x: left + drawnWidth * xRatio, y: top + drawnHeight * yRatio };
    };

    const getPath = (shot: LetterBullet) => {
      const male = shot.from === 'player';
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const start = male
        ? pointOnFighter('male2', 0.91, 0.31)
        : pointOnFighter('female2', 0.12, 0.35);
      const end = male
        ? pointOnFighter('female2', 0.52, 0.46)
        : pointOnFighter('male2', 0.52, 0.46);
      return {
        start: start || { x: w * (male ? .24 : .76), y: h * .52 },
        end: end || { x: w * (male ? .78 : .22), y: h * .5 }
      };
    };

    const glow = (x: number, y: number, age: number, scale: number) => {
      const intensity = Math.max(0, 1 - age / 310);
      const radius = (16 + 64 * Math.min(1, age / 190)) * scale;
      const gradient = ctx.createRadialGradient(x, y, 1, x, y, radius);
      gradient.addColorStop(0, `rgba(255,242,227,${intensity * .8})`);
      gradient.addColorStop(.19, `rgba(255,66,80,${intensity * .65})`);
      gradient.addColorStop(.56, `rgba(242,13,65,${intensity * .24})`);
      gradient.addColorStop(1, 'rgba(255,0,40,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    };

    const render = (now: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(ratio, ratio);
      const active = bulletsRef.current;
      for (const shot of active) {
        if (!shotPaths.current.has(shot.id)) shotPaths.current.set(shot.id, getPath(shot));
        const path = shotPaths.current.get(shot.id)!;
        const t = Math.max(0, Math.min(1, (now - shot.createdAt) / DURATION));
        const dx = path.end.x - path.start.x;
        const dy = path.end.y - path.start.y;
        const x = path.start.x + dx * t;
        const y = path.start.y + dy * t;
        const isPlayer = shot.from === 'player';
        const color = isPlayer ? '#7ddaff' : '#ffa6da';
        // Conceal the exact point of contact: projectile fades into a wide red impact aura.
        if (t < .87) {
          ctx.save();
          ctx.lineCap = 'round';
          ctx.strokeStyle = color;
          ctx.shadowBlur = 19;
          ctx.shadowColor = color;
          ctx.lineWidth = 3.4;
          ctx.globalAlpha = Math.min(1, (1 - t) * 4.5);
          ctx.beginPath();
          ctx.moveTo(x - Math.sign(dx) * 21, y - Math.sign(dy) * 4);
          ctx.lineTo(x, y);
          ctx.stroke();
          ctx.restore();
        }
        if (t < .18) {
          const muzzle = Math.max(0, 1 - t / .18);
          ctx.save();
          ctx.globalAlpha = muzzle;
          ctx.fillStyle = '#fff2ba';
          ctx.shadowColor = color;
          ctx.shadowBlur = 18;
          ctx.beginPath();
          ctx.arc(path.start.x, path.start.y, 9 + muzzle * 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        if (t >= .78) glow(path.end.x, path.end.y, Math.max(0, now - shot.createdAt - DURATION * .78), ratio > 0 ? 1 : 1);
        if (t >= 1 && !landed.current.has(shot.id)) {
          landed.current.add(shot.id);
          callbackRef.current?.(shot);
        }
      }
      ctx.restore();
      const live = new Set(active.map(shot => shot.id));
      shotPaths.current.forEach((_, id) => { if (!live.has(id)) shotPaths.current.delete(id); });
      landed.current.forEach(id => { if (!live.has(id)) landed.current.delete(id); });
      raf = requestAnimationFrame(render);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(raf); observer.disconnect(); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} className="battle-canvas-fx" />;
};
