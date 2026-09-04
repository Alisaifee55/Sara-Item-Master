import React from 'react';
import { RefreshCw } from 'lucide-react';
import logo from '../assets/sara-logo.png';

export default function Header({ masterOffline, statusText, onRefresh }) {
  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          background: 'var(--n-100)',
          boxShadow: 'var(--shadow-sm)',
          padding: '17.6px clamp(16px,4vw,56px)',
          display: 'flex',
          alignItems: 'center',
          gap: '17.6px'
        }}
      >
        <img src={logo} alt="Sara" width={40} height={40} style={{ display: 'block' }} />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 18 }}>Item Master Validator</span>
          <span style={{ fontSize: 12, color: 'var(--n-600)' }}>Sara Plaza Trading Co.</span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '13.2px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              className="status-dot"
              style={{
                width: 8,
                height: 8,
                borderRadius: '999px',
                background: masterOffline ? 'var(--accent-700)' : 'var(--sage)',
                animation: masterOffline ? 'none' : 'sara-pulse 2.4s ease-in-out infinite'
              }}
            />
            <span style={{ fontSize: 13, color: 'var(--n-700)' }}>{statusText}</span>
          </span>
          <button className="btn btn-ghost" onClick={onRefresh} style={{ padding: '9px 16px' }}>
            <RefreshCw size={14} strokeWidth={2.75} />
            Refresh master
          </button>
        </div>
      </header>

      {masterOffline && (
        <div
          className="fade-in"
          style={{
            background: 'var(--accent-200)',
            padding: '17.6px clamp(16px,4vw,56px)',
            display: 'flex',
            alignItems: 'center',
            gap: '17.6px',
            flexWrap: 'wrap'
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '999px',
              background: 'var(--accent-700)',
              flexShrink: 0
            }}
          />
          <div style={{ flex: '1 1 320px' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent-900)' }}>Master list unreachable</div>
            <div style={{ fontSize: 13, color: 'var(--accent-800)' }}>
              The UNIQE sheet didn't respond, so nothing can be checked against the master. Validation is paused
              rather than run against a stale list.
            </div>
          </div>
          <button className="btn btn-secondary" onClick={onRefresh}>
            Retry connection
          </button>
        </div>
      )}
    </>
  );
}
