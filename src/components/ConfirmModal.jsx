import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function ConfirmModal({
  isOpen,
  title = 'Are you sure?',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary', // 'primary' | 'danger' | 'success' | 'warning'
  isProcessing = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isProcessing) {
        onCancel?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, onCancel]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="confirm-modal-overlay"
      onClick={() => {
        if (!isProcessing) onCancel?.();
      }}
    >
      <div className="confirm-modal-card" onClick={(e) => e.stopPropagation()}>
        <h3 className="confirm-modal-title">{title}</h3>
        {message && <div className="confirm-modal-text">{message}</div>}
        <div className="confirm-modal-actions">
          <button
            type="button"
            className="confirm-modal-cancel"
            onClick={onCancel}
            disabled={isProcessing}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`confirm-modal-btn confirm-modal-${variant}`}
            onClick={onConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
