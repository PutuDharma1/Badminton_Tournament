import { useEffect } from 'react';

function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColors = {
    success: '#22c55e',
    error: '#ef4444',
    info: '#3b82f6',
  };

  return (
    <div className="toast" style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      backgroundColor: bgColors[type] || bgColors.info,
      color: 'white',
      padding: '12px 24px',
      borderRadius: 8,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      animation: 'slideIn 0.3s ease-out',
    }}>
      <span>{message}</span>
      <button 
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          padding: 0,
          fontSize: 18,
          opacity: 0.8,
        }}
      >
        ×
      </button>
    </div>
  );
}

export default Toast;
