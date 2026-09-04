import React from 'react';
import { FILL_KINDS } from '../lib/constants.js';

export default function ChangeLogTable({ changes, filter, onClearFilter }) {
  const filtered = filter ? changes.filter((c) => c.kind === filter) : changes;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '13.2px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '13.2px', flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 400, fontSize: 22, margin: 0 }}>Change log</h2>
        <span style={{ fontSize: 14, color: 'var(--n-600)' }}>
          {filtered.length} of {changes.length} changes shown
        </span>
        {filter && (
          <button className="btn btn-ghost" style={{ marginLeft: 'auto', padding: '6px 14px' }} onClick={onClearFilter}>
            Clear filter
          </button>
        )}
      </div>

      {/* Table view (>=900px), stacked cards below — controlled purely by CSS */}
      <div
        className="card change-log-table"
        style={{
          background: 'var(--n-100)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'auto',
          display: 'none'
        }}
      >
        <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--divider)' }}>
              <Th>Row</Th>
              <Th>Column</Th>
              <Th>Issue</Th>
              <Th>Value found</Th>
              <Th>Written</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--divider)' }}>
                <td style={{ padding: '10px 14px', color: 'var(--n-600)', fontSize: 13 }}>{c.row}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span
                    style={{
                      fontSize: 13,
                      padding: '3px 10px',
                      borderRadius: '999px',
                      background: 'var(--sage-100)'
                    }}
                  >
                    {c.column}
                  </span>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <IssueChip kind={c.kind} />
                </td>
                <td style={{ padding: '10px 14px', fontSize: 13 }}>{c.oldValue}</td>
                <td style={{ padding: '10px 14px', fontSize: 13 }}>
                  {c.kind === 'formula' ? c.newValue : 'flagged only — not changed'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="change-log-cards" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.map((c, i) => (
          <div
            key={i}
            className="card"
            style={{ background: 'var(--n-100)', boxShadow: 'var(--shadow-sm)', padding: '17.6px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IssueChip kind={c.kind} dotOnly />
              <span style={{ fontWeight: 600, fontSize: 14 }}>{c.column}</span>
              <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--n-600)' }}>Row {c.row}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--n-700)', marginTop: 6 }}>{FILL_KINDS[c.kind]?.label}</div>
            <div style={{ fontSize: 14, marginTop: 6 }}>
              {c.oldValue} {c.kind === 'formula' && <>→ <strong>{c.newValue}</strong></>}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media (min-width: 900px) {
          .change-log-table { display: block !important; }
          .change-log-cards { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function Th({ children }) {
  return <th style={{ padding: '10px 14px', fontSize: 13, color: 'var(--n-600)', fontWeight: 600 }}>{children}</th>;
}

function IssueChip({ kind, dotOnly }) {
  const f = FILL_KINDS[kind];
  if (!f) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: 4, background: f.chip, flexShrink: 0 }} />
      {!dotOnly && <span style={{ fontSize: 13 }}>{f.label}</span>}
    </span>
  );
}
