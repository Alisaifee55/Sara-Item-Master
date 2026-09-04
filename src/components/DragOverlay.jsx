import React from 'react';
import logo from '../assets/sara-logo.png';

export default function DragOverlay({ visible }) {
  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20,
        pointerEvents: 'none',
        background: 'color-mix(in oklab, #f0fae1 88%, transparent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div
        style={{
          background: 'var(--n-100)',
          border: '3px dashed var(--accent)',
          borderRadius: 'var(--r-lg)',
          padding: '35.2px',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '13.2px',
          textAlign: 'center'
        }}
      >
        <img
          src={logo}
          alt=""
          width={72}
          height={72}
          className="breathe"
          style={{ animation: 'sara-breathe 2s ease-in-out infinite' }}
        />
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 400, fontSize: 'clamp(20px,2.4vw,30px)' }}>
          Drop the file anywhere
        </div>
        <div style={{ fontSize: 14, color: 'var(--n-700)' }}>
          .xlsx or .xls — the sheet structure is kept exactly as it is
        </div>
      </div>
    </div>
  );
}
