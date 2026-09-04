import React from 'react';
import SummaryCards from './SummaryCards.jsx';
import ChangeLogTable from './ChangeLogTable.jsx';
import ByColumnPanel from './ByColumnPanel.jsx';

export default function ResultScreen({ result, filename, filter, onToggleFilter, onValidateAnother, onDownloadAgain }) {
  const { changes, counts, byColumn, totalRows } = result;
  const totalFlagged = counts.notMaster + counts.caseMismatch + counts.space;
  const totalAutofilled = counts.formula;
  const clean = changes.length === 0;

  return (
    <main
      className="fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(20px,3vw,36px)',
        padding: 'clamp(24px,4vw,56px) clamp(16px,4vw,56px)'
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '17.6px' }}>
        <div style={{ flex: '1 1 340px' }}>
          <span className="tag tag-accent">Downloaded automatically</span>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 400,
              fontSize: 'clamp(26px,3.6vw,46px)',
              margin: '8px 0'
            }}
          >
            {filename}
          </h1>
          <p style={{ fontSize: 15, color: 'var(--n-600)', margin: 0 }}>
            {clean
              ? `0 cells flagged · 0 cells auto-filled · ${totalRows} rows checked, file returned unchanged`
              : `${totalFlagged} cells flagged · ${totalAutofilled} cells auto-filled · ${totalRows} rows, sheet structure untouched`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '13.2px' }}>
          <button className="btn btn-secondary" onClick={onValidateAnother}>
            Validate another file
          </button>
          <button className="btn btn-primary" onClick={onDownloadAgain}>
            Download again
          </button>
        </div>
      </div>

      {clean ? (
        <div
          style={{
            background: 'var(--sage-100)',
            borderRadius: 'var(--r-lg)',
            padding: 'clamp(24px,3vw,40px)',
            display: 'flex',
            alignItems: 'center',
            gap: '17.6px'
          }}
        >
          <span
            style={{
              width: 56,
              height: 56,
              borderRadius: '999px',
              background: 'var(--sage-300)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              fontFamily: 'var(--font-heading)',
              fontSize: 26,
              color: 'var(--sage-800)'
            }}
          >
            ✓
          </span>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 400, fontSize: 'clamp(20px,2.4vw,26px)' }}>
              Nothing to fix
            </div>
            <p style={{ fontSize: 15, color: 'var(--n-600)', margin: '4px 0 0' }}>
              Every checked value matched the master list, no whitespace problems were found, and BARCODE and
              ITEMNAME already agreed with the formula. The file downloaded unchanged so your records stay in step.
            </p>
          </div>
        </div>
      ) : (
        <>
          <SummaryCards counts={counts} byColumn={byColumn} filter={filter} onToggle={onToggleFilter} />

          <div
            id="result-body-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,.9fr)',
              gap: 'clamp(20px,3vw,36px)'
            }}
          >
            <style>{`
              @media (max-width: 1240px) {
                #result-body-grid { grid-template-columns: 1fr !important; }
              }
            `}</style>
            <ChangeLogTable changes={changes} filter={filter} onClearFilter={() => onToggleFilter(filter)} />
            <ByColumnPanel byColumn={byColumn} readAt={new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
          </div>
        </>
      )}
    </main>
  );
}
