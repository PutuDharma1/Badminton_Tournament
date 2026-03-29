import { useEffect } from 'react';

const TOAST_CFG = {
  success: { bg: '#15803d', border: '#22c55e', icon: '✓' },
  error:   { bg: '#b91c1c', border: '#ef4444', icon: '✕' },
  info:    { bg: '#1d4ed8', border: '#3b82f6', icon: 'ℹ' },
};

function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const cfg = TOAST_CFG[type] || TOAST_CFG.info;

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      color: '#fff',
      padding: '11px 16px',
      borderRadius: 10,
      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontSize: 13.5,
      fontWeight: 500,
      maxWidth: 360,
      animation: 'slideIn 0.25s ease-out',
    }}>
      <span style={{
        width: 20, height: 20, borderRadius: '50%',
        background: 'rgba(255,255,255,0.2)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, flexShrink: 0,
      }}>
        {cfg.icon}
      </span>
      <span style={{ flex: 1, lineHeight: 1.4 }}>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.75)',
          cursor: 'pointer', padding: 0, fontSize: 16, lineHeight: 1, flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

export default Toast;
