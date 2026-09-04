import React from 'react';
import { FILL_KINDS } from '../lib/constants.js';

function hint(kind, counts, byColumn) {
  if (kind === 'space') return 'UFBRAND · UFMODELNO';
  if (kind === 'formula') return 'overwritten with formula result';
  const cols = Object.entries(byColumn).filter(([, c]) => c[kind] > 0).length;
  return `across ${cols} column${cols === 1 ? '' : 's'}`;
}

export default function SummaryCards({ counts, byColumn, filter, onToggle }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px,1fr))',
        gap: '17.6px'
      }}
    >
      {Object.entries(FILL_KINDS).map(([key, f]) => {
        const active = filter === key;
        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            className="card"
            style={{
              background: 'var(--n-100)',
              boxShadow: 'var(--shadow-sm)',
              padding: '17.6px',
              border: `2px solid ${active ? f.chip : 'transparent'}`,
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              transition: 'transform .15s ease, box-shadow .15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, background: f.chip }} />
              <span style={{ fontSize: 13, color: 'var(--n-700)' }}>{f.label}</span>
            </span>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(24px,3vw,34px)' }}>
              {counts[key]}
            </span>
            <span style={{ fontSize: 12, color: 'var(--n-600)' }}>{hint(key, counts, byColumn)}</span>
          </button>
        );
      })}
    </div>
  );
}
