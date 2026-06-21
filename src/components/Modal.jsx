/**
 * Modal
 * Modal genérico com overlay, título e ações.
 *
 * Props:
 * - visible: boolean — controla visibilidade
 * - title: string — título do modal
 * - onClose: () => void — chamado ao clicar no overlay
 * - children: ReactNode — conteúdo do modal
 * - actions: ReactNode (opcional) — botões do rodapé
 */
export default function Modal({ visible, title, onClose, children, actions }) {
  if (!visible) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {title && <h3 className="modal-title">{title}</h3>}
        {children}
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}
