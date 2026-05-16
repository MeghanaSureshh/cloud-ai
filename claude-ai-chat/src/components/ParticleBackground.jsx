import React, { useEffect, useRef } from 'react';

// Pure canvas implementation of the exact Particles.js config provided
const ParticleBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width  = W;
    canvas.height = H;

    let mouseX = -9999;
    let mouseY = -9999;
    let animId;
    let running = true;

    // ── Config matching your particles.js config exactly ──
    const CONFIG = {
      number:      80,
      color:       '#ffffff',
      opacity:     0.5,
      size:        3,        // max size (random 1–3)
      lineDistance: 150,
      lineOpacity:  0.4,
      lineWidth:    1,
      speed:        2,       // slightly reduced for smoothness
      repulseDistance: 200,
      repulseDuration: 0.4,
    };

    // ── Create particles ──
    const particles = Array.from({ length: CONFIG.number }, () => ({
      x:  Math.random() * W,
      y:  Math.random() * H,
      vx: (Math.random() - 0.5) * CONFIG.speed,
      vy: (Math.random() - 0.5) * CONFIG.speed,
      r:  Math.random() * (CONFIG.size - 1) + 1,
      // repulse state
      repulsing: false,
      ox: 0, oy: 0, // original position before repulse
    }));

    // ── Mouse events ──
    const onMouseMove = (e) => { mouseX = e.clientX; mouseY = e.clientY; };
    const onMouseLeave = () => { mouseX = -9999; mouseY = -9999; };
    const onClick = (e) => {
      // push: add 4 new particles near click
      for (let i = 0; i < 4; i++) {
        particles.push({
          x:  e.clientX + (Math.random() - 0.5) * 20,
          y:  e.clientY + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * CONFIG.speed,
          vy: (Math.random() - 0.5) * CONFIG.speed,
          r:  Math.random() * (CONFIG.size - 1) + 1,
          repulsing: false, ox: 0, oy: 0,
        });
      }
    };

    window.addEventListener('mousemove',  onMouseMove);
    window.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('click',      onClick);

    const loop = () => {
      if (!running) return;

      ctx.clearRect(0, 0, W, H);

      // Black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);

      // Update & draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Repulse from mouse
        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONFIG.repulseDistance) {
          const force = (CONFIG.repulseDistance - dist) / CONFIG.repulseDistance;
          p.x += (dx / dist) * force * 3;
          p.y += (dy / dist) * force * 3;
        }

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off edges (out mode — wrap)
        if (p.x < 0)  p.x = W;
        if (p.x > W)  p.x = 0;
        if (p.y < 0)  p.y = H;
        if (p.y > H)  p.y = 0;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${CONFIG.opacity})`;
        ctx.fill();
      }

      // Draw lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx   = particles[i].x - particles[j].x;
          const dy   = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONFIG.lineDistance) {
            const alpha = CONFIG.lineOpacity * (1 - dist / CONFIG.lineDistance);
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
            ctx.lineWidth   = CONFIG.lineWidth;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    loop();

    const onResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width  = W;
      canvas.height = H;
    };
    window.addEventListener('resize', onResize);

    return () => {
      running = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove',  onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('click',      onClick);
      window.removeEventListener('resize',     onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100%', height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
};

export default ParticleBackground;
