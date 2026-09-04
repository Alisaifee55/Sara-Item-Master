import React from 'react';
import logo from '../assets/sara-logo.png';

const R = 94;
const CIRCUMFERENCE = 2 * Math.PI * R;

export default function ProcessingRing({ pct }) {
  const dash = `${CIRCUMFERENCE * pct} ${CIRCUMFERENCE}`;

  return (
    <div
      style={{
        width: 'clamp(200px,26vw,264px)',
        aspectRatio: '1 / 1',
        display: 'grid',
        placeItems: 'center',
        position: 'relative'
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: '18%',
          borderRadius: '999px',
          background: 'radial-gradient(circle, var(--sage-200) 0%, transparent 70%)',
          animation: 'sara-halo 4s ease-in-out infinite'
        }}
      />

      <svg viewBox="0 0 208 208" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
        <circle cx="104" cy="104" r={R} fill="none" stroke="var(--n-300)" strokeWidth="8" />
        <circle
          cx="104"
          cy="104"
          r={R}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={dash}
          style={{ transition: 'stroke-dasharray .55s ease' }}
        />
      </svg>

      <svg
        viewBox="0 0 208 208"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          animation: 'sara-spin 12s linear infinite'
        }}
      >
        <circle cx="104" cy="104" r="78" fill="none" stroke="var(--sage-400)" strokeWidth="2" strokeDasharray="3 16" />
      </svg>

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <img
          src={logo}
          alt=""
          style={{
            width: 'clamp(72px,10vw,96px)',
            height: 'clamp(72px,10vw,96px)',
            animation: 'sara-breathe 3s ease-in-out infinite'
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 400,
            fontSize: 'clamp(20px,2.4vw,26px)',
            color: 'var(--accent-700)'
          }}
        >
          {Math.round(pct * 100)}%
        </span>
      </div>
    </div>
  );
}
