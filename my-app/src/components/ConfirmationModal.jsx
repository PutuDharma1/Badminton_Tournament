function ConfirmationModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', isDangerous = false }) {
  if (!isOpen) return null;

  return (
    <>
      <div 
        className="modal-overlay" 
        onClick={onCancel}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 9998,
        }}
      />
      <div 
        className="modal-content"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: 16,
          padding: 24,
          width: '90%',
          maxWidth: 400,
          zIndex: 9999,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: '#f8fafc' }}>{title}</h3>
        <p style={{ color: '#9ca3af', marginBottom: 24, lineHeight: 1.5 }}>{message}</p>
        
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button 
            className="btn-outline" 
            onClick={onCancel}
            style={{ padding: '8px 16px' }}
          >
            {cancelText}
          </button>
          <button 
            className="btn-primary" 
            onClick={onConfirm}
            style={{ 
              padding: '8px 16px',
              backgroundColor: isDangerous ? '#ef4444' : undefined,
              borderColor: isDangerous ? '#ef4444' : undefined,
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </>
  );
}

export default ConfirmationModal;
