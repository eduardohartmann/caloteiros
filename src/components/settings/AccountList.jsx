import ActionMenu from "./ActionMenu.jsx";

/**
 * AccountList
 * Lista de contas com ações.
 */
export default function AccountList({ accounts, onEdit, onToggle, onDelete, loading }) {
  if (accounts.length === 0) {
    return <div className="empty">Nenhuma conta cadastrada.</div>;
  }

  return (
    <div className="settings-list">
      {accounts.map((acc) => (
        <div
          key={acc.id}
          className={`settings-item${!acc.active ? " settings-item--inactive" : ""}`}
        >
          <span className="settings-item-icon">🏦</span>
          <span className="settings-item-name">{acc.name}</span>
          {!acc.active && <span className="settings-badge-inactive">inativa</span>}
          <div className="settings-item-actions">
            <ActionMenu
              loading={loading}
              actions={[
                { label: "Editar", onClick: () => onEdit(acc) },
                { label: acc.active ? "Desativar" : "Ativar", onClick: () => onToggle(acc) },
                { label: "Excluir", onClick: () => onDelete(acc), danger: true }
              ]}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
