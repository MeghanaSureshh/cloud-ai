import React, { useEffect, useRef, useState } from 'react';
import '../styles/CustomCursor.css';

const CustomCursor = () => {
  const cursorRef = useRef(null);
  const ringRef   = useRef(null);
  const pos   = useRef({ x: -100, y: -100 });
  const ring  = useRef({ x: -100, y: -100 });
  const state = useRef({ hover: false, click: false });
  const rafRef = useRef(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const ringEl = ringRef.current;
    if (!cursor || !ringEl) return;

    const onMove = (e) => {
      pos.current = { x: e.clientX, y: e.clientY };
    };
    const onDown = () => {
      state.current.click = true;
      cursor.classList.add('clicking');
      ringEl.classList.add('clicking');
    };
    const onUp = () => {
      state.current.click = false;
      cursor.classList.remove('clicking');
      ringEl.classList.remove('clicking');
    };

    const setHover = (v) => () => {
      state.current.hover = v;
      if (v) { cursor.classList.add('hovering'); ringEl.classList.add('hovering'); }
      else   { cursor.classList.remove('hovering'); ringEl.classList.remove('hovering'); }
    };

    const addListeners = () => {
      document.querySelectorAll('a,button,input,textarea,select,[role="button"]').forEach(el => {
        el.addEventListener('mouseenter', setHover(true));
        el.addEventListener('mouseleave', setHover(false));
      });
    };
    addListeners();
    const obs = new MutationObserver(addListeners);
    obs.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('mouseup',   onUp);

    const animate = () => {
      // Dot follows exactly
      cursor.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`;

      // Ring follows with lag
      ring.current.x += (pos.current.x - ring.current.x) * 0.14;
      ring.current.y += (pos.current.y - ring.current.y) * 0.14;
      ringEl.style.transform = `translate(${ring.current.x}px, ${ring.current.y}px)`;

      rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('mouseup',   onUp);
      obs.disconnect();
    };
  }, []);

  return (
    <>
      {/* Outer ring — lags behind */}
      <div ref={ringRef} className="cur-ring">
        <div className="cur-ring-inner" />
      </div>

      {/* Dot — exact position */}
      <div ref={cursorRef} className="cur-dot">
        <div className="cur-dot-core" />
        <div className="cur-dot-glow" />
      </div>
    </>
  );
};

export default CustomCursor;
