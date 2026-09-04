import React, { useRef } from 'react';
import { MASTER_CHECKED_COLUMNS, WHITESPACE_CHECKED_COLUMNS, FILL_KINDS } from '../lib/constants.js';

export default function UploadScreen({ accept, onFile, masterOffline }) {
  const inputRef = useRef(null);

  function onChange(e) {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = '';
  }

  return (
    <main
      className="fade-in"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,.85fr)',
        gap: 'clamp(24px,4vw,64px)',
        padding: 'clamp(28px,5vw,72px) clamp(16px,4vw,56px)',
        alignItems: 'start'
      }}
      id="upload-grid"
    >
      <style>{`
        @media (max-width: 900px) {
          #upload-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '17.6px', maxWidth: '56ch' }}>
        <span className="tag tag-accent-2">Live master · UNIQE sheet</span>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 400,
            fontSize: 'clamp(32px,4.6vw,60px)',
            lineHeight: 1.05,
            color: '#201e1d',
            margin: 0
          }}
        >
          Check the item list before it ships.
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(15px,1.3vw,18px)',
            color: '#645c50',
            textWrap: 'pretty',
            margin: 0
          }}
        >
          Drop your item file and it comes back as the same workbook — problem cells solid-filled, BARCODE and
          ITEMNAME filled in from the formula, and a log of every change on screen.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '13.2px' }}>
          <button
            className="btn btn-primary"
            disabled={masterOffline}
            onClick={() => inputRef.current?.click()}
            style={{ opacity: masterOffline ? 0.55 : 1, cursor: masterOffline ? 'not-allowed' : 'pointer' }}
          >
            Upload file
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              className="visually-hidden"
              onChange={onChange}
              disabled={masterOffline}
            />
          </button>
          <span style={{ fontSize: 14, color: 'var(--n-600)' }}>…or drag it anywhere on this page</span>
        </div>
      </section>

      <aside
        className="card"
        style={{
          background: 'var(--n-100)',
          padding: 'clamp(20px,2.4vw,32px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '17.6px'
        }}
      >
        <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 400, fontSize: 19, margin: 0 }}>
          What gets checked
        </h2>

        <ChipGroup label="Against the master list" items={MASTER_CHECKED_COLUMNS} />
        <ChipGroup label="Whitespace only" items={WHITESPACE_CHECKED_COLUMNS} />
        <ChipGroup label="Auto-filled from formula" items={['BARCODE', 'ITEMNAME']} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8.8px' }}>
          <span style={{ fontSize: 13, color: 'var(--n-600)', fontWeight: 600 }}>Fill legend</span>
          {Object.values(FILL_KINDS).map((f) => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '8.8px' }}>
              <span style={{ width: 16, height: 16, borderRadius: 5, background: f.chip, flexShrink: 0 }} />
              <span style={{ fontSize: 14 }}>{f.label}</span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 13, color: 'var(--n-600)', margin: 0 }}>
          UFBRAND, UFMODELNO and UFYEARDETAILS have no master list yet — no not-in-master check runs on them.
        </p>
      </aside>
    </main>
  );
}

function ChipGroup({ label, items }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6.6px' }}>
      <span style={{ fontSize: 13, color: 'var(--n-600)' }}>{label}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6.6px' }}>
        {items.map((it) => (
          <span
            key={it}
            style={{
              fontSize: 12,
              padding: '4px 10px',
              borderRadius: '999px',
              background: 'var(--n-200)',
              color: 'var(--n-700)'
            }}
          >
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}
