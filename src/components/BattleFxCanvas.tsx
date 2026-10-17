import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface BattleFxCanvasProps {
  bulletActive: boolean;
  bulletDirection: 'player-to-bot' | 'bot-to-player';
  onImpact: () => void;
}

export const BattleFxCanvas: React.FC<BattleFxCanvasProps> = ({
  bulletActive,
  bulletDirection,
  onImpact
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const hasImpactedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to match display size
    const updateSize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    if (!bulletActive) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current = [];
      hasImpactedRef.current = false;
      return () => {
        window.removeEventListener('resize', updateSize);
      };
    }

    hasImpactedRef.current = false;
    const startTime = performance.now();
    const duration = 420; // 420ms projectile flight time

    const isP1 = bulletDirection === 'player-to-bot';
    const mainColor = isP1 ? '#4ba0f7' : '#ea5e92';
    const coreColor = '#ffffff';

    const render = (now: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Coordinates: P1 hand ~34% width, 52% height; P2 chest ~76% width, 52% height
      const startX = isP1 ? canvas.width * 0.33 : canvas.width * 0.75;
      const targetX = isP1 ? canvas.width * 0.76 : canvas.width * 0.28;
      const beamY = canvas.height * 0.52;

      const currentX = startX + (targetX - startX) * progress;

      // Spawn motion trail particles while moving
      if (progress < 1) {
        for (let i = 0; i < 3; i++) {
          particlesRef.current.push({
            x: currentX - (isP1 ? 1 : -1) * Math.random() * 20,
            y: beamY + (Math.random() - 0.5) * 14,
            vx: (isP1 ? -1 : 1) * (1 + Math.random() * 3),
            vy: (Math.random() - 0.5) * 2,
            life: 1,
            maxLife: 15 + Math.random() * 10,
            size: 2 + Math.random() * 3,
            color: mainColor
          });
        }

        // Draw muzzle flash at origin during first 100ms
        if (progress < 0.25) {
          ctx.save();
          const flashGrad = ctx.createRadialGradient(startX, beamY, 2, startX, beamY, 35);
          flashGrad.addColorStop(0, '#ffffff');
          flashGrad.addColorStop(0.5, mainColor);
          flashGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = flashGrad;
          ctx.beginPath();
          ctx.arc(startX, beamY, 35, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Draw glowing energy dart/lance
        ctx.save();
        const beamLen = canvas.width * 0.08;
        const tailX = isP1 ? currentX - beamLen : currentX + beamLen;

        // Outer glow
        ctx.shadowColor = mainColor;
        ctx.shadowBlur = 18;

        const grad = ctx.createLinearGradient(tailX, beamY, currentX, beamY);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.7, mainColor);
        grad.addColorStop(1, coreColor);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tailX, beamY);
        ctx.lineTo(currentX, beamY);
        ctx.stroke();

        // Inner core
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(tailX + (currentX - tailX) * 0.5, beamY);
        ctx.lineTo(currentX, beamY);
        ctx.stroke();

        // Arrow tip head
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(currentX, beamY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Trigger impact once reached target
      if (progress >= 1 && !hasImpactedRef.current) {
        hasImpactedRef.current = true;
        onImpact();

        // Spawn impact particle burst
        for (let i = 0; i < 28; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 6;
          particlesRef.current.push({
            x: targetX,
            y: beamY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            maxLife: 20 + Math.random() * 15,
            size: 3 + Math.random() * 4,
            color: Math.random() > 0.4 ? mainColor : '#ffffff'
          });
        }
      }

      // Draw and update particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1 / p.maxLife;

        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Impact burst flash
      if (hasImpactedRef.current && progress >= 1 && elapsed < duration + 200) {
        const flashProgress = (elapsed - duration) / 200;
        const radius = 10 + flashProgress * 45;
        const alpha = Math.max(0, 1 - flashProgress);

        ctx.save();
        const impactGrad = ctx.createRadialGradient(targetX, beamY, 2, targetX, beamY, radius);
        impactGrad.addColorStop(0, '#ffffff');
        impactGrad.addColorStop(0.6, mainColor);
        impactGrad.addColorStop(1, 'transparent');
        ctx.globalAlpha = alpha;
        ctx.fillStyle = impactGrad;
        ctx.beginPath();
        ctx.arc(targetX, beamY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (progress < 1 || particlesRef.current.length > 0) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', updateSize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [bulletActive, bulletDirection, onImpact]);

  return <canvas ref={canvasRef} className="battle-canvas-fx" />;
};
