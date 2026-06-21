import { flattenCategoryTree } from "../../services/settingsSheets.js";
import ActionMenu from "./ActionMenu.jsx";

/**
 * CategoryTree
 * Lista hierárquica de categorias com ações.
 */
export default function CategoryTree({ categories, onEdit, onToggle, onDelete, loading }) {
  const flat = flattenCategoryTree(categories, false);

  if (flat.length === 0) {
    return <div className="empty">Nenhuma categoria cadastrada.</div>;
  }

  return (
    <div className="settings-list">
      {flat.map((cat) => (
        <div
          key={cat.id}
          className={`settings-item${!cat.active ? " settings-item--inactive" : ""}`}
          style={{ paddingLeft: `${16 + cat.depth * 24}px` }}
        >
          <span className="settings-item-icon" style={{ background: cat.color + "22", color: cat.color }}>
            {cat.icon}
          </span>
          <span className="settings-item-name">{cat.name}</span>
          {!cat.active && <span className="settings-badge-inactive">inativa</span>}
          <div className="settings-item-actions">
            <ActionMenu
              loading={loading}
              actions={[
                { label: "Editar", onClick: () => onEdit(cat) },
                { label: cat.active ? "Desativar" : "Ativar", onClick: () => onToggle(cat) },
                { label: "Excluir", onClick: () => onDelete(cat), danger: true }
              ]}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
