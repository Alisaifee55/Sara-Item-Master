import React from 'react';
import { FILL_KINDS } from '../lib/constants.js';

export default function ByColumnPanel({ byColumn, readAt }) {
  const columns = Object.entries(byColumn);

  return (
    <div
      style={{
        background: 'var(--sage-100)',
        borderRadius: 'var(--r-lg)',
        padding: 'clamp(18px,2vw,28px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '17.6px'
      }}
    >
      <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 400, fontSize: 18, margin: 0 }}>By column</h3>

      {columns.length === 0 && <p style={{ fontSize: 14, color: 'var(--n-600)' }}>No issues to break down.</p>}

      {columns.map(([col, c]) => {
        const total = c.notMaster + c.caseMismatch + c.space + c.formula;
        if (total === 0) return null;
        return (
          <div key={col}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
              <span style={{ fontWeight: 600 }}>{col}</span>
              <span style={{ color: 'var(--n-600)' }}>{total} cells</span>
            </div>
            <div
              style={{
                display: 'flex',
                height: 8,
                borderRadius: '999px',
                overflow: 'hidden',
                background: 'var(--n-200)'
              }}
            >
              {Object.entries(FILL_KINDS).map(([key, f]) =>
                c[key] > 0 ? (
                  <span
                    key={key}
                    style={{ width: `${(c[key] / total) * 100}%`, background: f.chip }}
                    title={`${f.label}: ${c[key]}`}
                  />
                ) : null
              )}
            </div>
          </div>
        );
      })}

      <p style={{ fontSize: 13, color: 'var(--n-700)', margin: 0 }}>
        Master read from the UNIQE tab{readAt ? ` at ${readAt}` : ''} — nothing was written back to the sheet.
      </p>
    </div>
  );
}
