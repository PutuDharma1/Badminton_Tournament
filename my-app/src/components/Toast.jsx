import { useEffect } from 'react';
import { createPortal } from 'react-dom';

const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const XIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="3" strokeLinecap="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const InfoIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="12" y1="8" x2="12" y2="8"/>
    <line x1="12" y1="12" x2="12" y2="16"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const TOAST_CFG = {
  success: { bg: '#15803d', border: '#22c55e', Icon: CheckIcon },
  error:   { bg: '#b91c1c', border: '#ef4444', Icon: XIcon     },
  info:    { bg: '#1d4ed8', border: '#3b82f6', Icon: InfoIcon  },
};

function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const cfg = TOAST_CFG[type] || TOAST_CFG.info;
  const liveRegion = type === 'error' ? 'assertive' : 'polite';

  return createPortal(
    <div
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={liveRegion}
      aria-atomic="true"
      style={{
        position: 'fixed',
        top: 'calc(20px + env(safe-area-inset-top, 0px))',
        right: 24,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: '#fff',
        padding: '11px 14px',
        borderRadius: 10,
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 13.5,
        fontWeight: 500,
        maxWidth: 360,
        animation: 'toastIn 0.25s ease-out',
      }}
    >
      <span style={{
        width: 20, height: 20, borderRadius: '50%',
        background: 'rgba(255,255,255,0.2)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <cfg.Icon />
      </span>

      <span style={{ flex: 1, lineHeight: 1.4 }}>{message}</span>

      <button
        onClick={onClose}
        aria-label="Close notification"
        style={{
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.75)',
          cursor: 'pointer', padding: 4, lineHeight: 1, flexShrink: 0,
          borderRadius: 4, display: 'inline-flex', alignItems: 'center',
          transition: 'color 0.15s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
      >
        <CloseIcon />
      </button>
    </div>,
    document.body
  );
}

export default Toast;
