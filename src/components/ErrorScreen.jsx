import React, { useRef } from 'react';

const COPY = {
  badFile: {
    title: "That file couldn't be read",
    body:
      "The workbook may be corrupt, password-protected, or saved in a format that isn't really .xlsx. Try re-saving it from Excel as 'Excel Workbook (.xlsx)' and upload again."
  },
  missingHeaders: {
    title: 'Some expected columns are missing',
    body:
      'Columns are matched by header name, so the header row has to spell them exactly as the master file does. These weren\u2019t found in the uploaded sheet:'
  }
};

export default function ErrorScreen({ kind, missingHeaders, onChooseAnother, onBack }) {
  const inputRef = useRef(null);
  const copy = COPY[kind] || COPY.badFile;

  function onChange(e) {
    const file = e.target.files?.[0];
    if (file) onChooseAnother(file);
    e.target.value = '';
  }

  return (
    <main
      className="fade-in"
      style={{ display: 'flex', justifyContent: 'center', padding: 'clamp(32px,6vw,80px) clamp(16px,4vw,56px)' }}
    >
      <div
        className="card"
        style={{
          maxWidth: 620,
          width: '100%',
          background: 'var(--n-100)',
          boxShadow: 'var(--shadow-md)',
          padding: 'clamp(24px,3vw,40px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '17.6px',
          alignItems: 'flex-start'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '13.2px' }}>
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: '999px',
              background: 'var(--accent-200)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              fontFamily: 'var(--font-heading)',
              fontSize: 22,
              color: 'var(--accent-800)'
            }}
          >
            !
          </span>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 400, fontSize: 'clamp(20px,2.4vw,28px)', margin: 0 }}>
            {copy.title}
          </h1>
        </div>

        <p style={{ fontSize: 15, color: 'var(--n-600)', margin: 0 }}>{copy.body}</p>

        {kind === 'missingHeaders' && (
          <div>
            <div style={{ fontSize: 13, color: 'var(--n-600)', marginBottom: 6 }}>Missing headers</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(missingHeaders || []).map((h) => (
                <span
                  key={h}
                  className="tag tag-accent"
                >
                  {h}
                </span>
              ))}
            </div>
          </div>
        )}

        <p style={{ fontSize: 13, color: 'var(--n-600)', margin: 0 }}>
          Nothing was written and no file was downloaded.
        </p>

        <div style={{ display: 'flex', gap: '13.2px' }}>
          <button className="btn btn-primary" onClick={() => inputRef.current?.click()}>
            Choose another file
            <input ref={inputRef} type="file" accept=".xlsx,.xls" className="visually-hidden" onChange={onChange} />
          </button>
          <button className="btn btn-ghost" onClick={onBack}>
            Back to upload
          </button>
        </div>
      </div>
    </main>
  );
}
