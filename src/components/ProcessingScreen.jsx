import React from 'react';
import ProcessingRing from './ProcessingRing.jsx';
import { FILL_KINDS } from '../lib/constants.js';

function stepDetail(step, rowsSeen) {
  switch (step.id) {
    case 'read':
      return `1 sheet · ${rowsSeen || '…'} rows`;
    case 'master':
      return '11 column lists loaded';
    default:
      return step.columns ? step.columns.join(' · ') : '';
  }
}

export default function ProcessingScreen({ stepIndex, steps, liveCounts, rowsSeen, fileName }) {
  const pct = (stepIndex + 1) / steps.length;
  const current = steps[stepIndex] || steps[steps.length - 1];
  const feed = [];
  for (let i = stepIndex; i >= Math.max(0, stepIndex - 3); i--) {
    feed.push(steps[i]);
  }

  return (
    <main
      className="fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'clamp(20px,3vw,40px)',
        padding: 'clamp(32px,6vw,80px) clamp(16px,4vw,56px)'
      }}
    >
      <ProcessingRing pct={pct} />

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 400, fontSize: 'clamp(19px,2.2vw,26px)' }}>
          {current.label}…
        </div>
        <div style={{ fontSize: 14, color: 'var(--n-600)', marginTop: 4 }}>{stepDetail(current, rowsSeen)}</div>
      </div>

      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 620,
          background: 'var(--n-100)',
          boxShadow: 'var(--shadow-sm)',
          padding: '17.6px clamp(17.6px,2vw,24px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}
      >
        {feed.map((step, i) => {
          const isCurrent = i === 0;
          return (
            <div
              key={step.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                opacity: isCurrent ? 1 : 0.45
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '999px',
                  background: isCurrent ? 'var(--accent)' : 'var(--sage-600)',
                  flexShrink: 0
                }}
              />
              <span style={{ fontSize: 14, flex: 1 }}>{step.label}</span>
              <span style={{ fontSize: 13, color: 'var(--n-600)' }}>{stepDetail(step, rowsSeen)}</span>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
        {Object.entries(FILL_KINDS).map(([key, f]) => (
          <span
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--n-100)',
              borderRadius: '999px',
              padding: '8px 16px'
            }}
          >
            <span style={{ width: 12, height: 12, borderRadius: 4, background: f.chip }} />
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 15 }}>{liveCounts[key] ?? 0}</span>
            <span style={{ fontSize: 13, color: 'var(--n-600)' }}>{f.label.split(' ')[0]}</span>
          </span>
        ))}
      </div>
    </main>
  );
}
