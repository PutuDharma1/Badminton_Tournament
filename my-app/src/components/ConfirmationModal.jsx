import { useEffect } from 'react';
import { createPortal } from 'react-dom';

function ConfirmationModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
}) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return createPortal(
    <>
      <div
        onClick={onCancel}
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          zIndex: 9998,
          animation: 'fadeIn 0.15s ease',
        }}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'var(--bg-card)',
          border: '1.5px solid var(--border)',
          borderRadius: 16,
          padding: 24,
          width: '90%',
          maxWidth: 400,
          zIndex: 9999,
          boxShadow: 'var(--shadow-modal)',
          animation: 'slideUp 0.18s ease',
        }}
      >
        <h3
          id="confirm-title"
          style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: 18, fontWeight: 700,
            marginBottom: 10,
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </h3>
        <p
          id="confirm-message"
          style={{ color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.5, fontSize: 14 }}
        >
          {message}
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn-outline" onClick={onCancel} style={{ padding: '9px 18px' }}>
            {cancelText}
          </button>
          <button
            className={isDangerous ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
            style={{ padding: '9px 18px' }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

export default ConfirmationModal;
