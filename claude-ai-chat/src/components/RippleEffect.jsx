import React, { useEffect } from 'react';

// Adds a ripple burst wherever the user clicks
const RippleEffect = () => {
  useEffect(() => {
    const handleClick = (e) => {
      // Skip if clicking on input/textarea
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;

      const ripple = document.createElement('span');
      ripple.className = 'click-ripple';
      ripple.style.left = e.clientX + 'px';
      ripple.style.top  = e.clientY + 'px';
      document.body.appendChild(ripple);
      setTimeout(() => ripple.remove(), 700);

      // Burst particles
      for (let i = 0; i < 6; i++) {
        const p = document.createElement('span');
        p.className = 'click-particle';
        p.style.left = e.clientX + 'px';
        p.style.top  = e.clientY + 'px';
        const angle = (i / 6) * 360;
        p.style.setProperty('--angle', angle + 'deg');
        p.style.setProperty('--dist', (40 + Math.random() * 30) + 'px');
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 600);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return null;
};

export default RippleEffect;
