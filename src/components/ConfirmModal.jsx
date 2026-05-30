/**
 * ConfirmModal
 * Modal de confirmação customizado para substituir window.confirm.
 */
export default function ConfirmModal({ visible, title, message, onConfirm, onCancel }) {
  if (!visible) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{title || "Confirmar"}</h3>
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button className="secondary-button compact" type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button className="primary-button" type="button" onClick={onConfirm} style={{ minHeight: 40, background: "var(--red)" }}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
