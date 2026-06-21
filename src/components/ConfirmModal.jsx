import Modal from "./Modal.jsx";

/**
 * ConfirmModal
 * Modal de confirmação customizado para substituir window.confirm.
 */
export default function ConfirmModal({ visible, title, message, onConfirm, onCancel }) {
  return (
    <Modal
      visible={visible}
      title={title || "Confirmar"}
      onClose={onCancel}
      actions={
        <>
          <button className="secondary-button compact" type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button className="primary-button" type="button" onClick={onConfirm} style={{ minHeight: 40, background: "var(--red)" }}>
            Confirmar
          </button>
        </>
      }
    >
      <p className="modal-message">{message}</p>
    </Modal>
  );
}
