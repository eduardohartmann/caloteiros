import { useState } from "react";
import { newId } from "../../utils/formatters.js";
import { flattenCategoryTree } from "../../services/settingsSheets.js";
import Modal from "../Modal.jsx";

/**
 * CategoryForm
 * Formulário de criação/edição de categoria (exibido em modal).
 */
export default function CategoryForm({ categories, initial, onSave, onCancel, loading }) {
  const [name,     setName]     = useState(initial?.name     || "");
  const [icon,     setIcon]     = useState(initial?.icon     || "📦");
  const [color,    setColor]    = useState(initial?.color    || "#95A5A6");
  const [parentId, setParentId] = useState(initial?.parentId || "");

  const parentOptions = flattenCategoryTree(categories, false).filter(
    (c) => c.depth === 0 && c.id !== initial?.id
  );

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      id:        initial?.id || newId(),
      parentId,
      name:      name.trim(),
      icon,
      color,
      active:    initial?.active !== false,
      createdAt: initial?.createdAt || new Date().toISOString()
    }, initial || null);
  }

  return (
    <Modal
      visible={true}
      title={initial ? "Editar categoria" : "Nova categoria"}
      onClose={onCancel}
    >
      <form className="settings-modal-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label>
            Nome
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Moradia" />
          </label>
          <label>
            Ícone (emoji)
            <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🏠" maxLength={4} className="settings-emoji-input" />
          </label>
          <label>
            Cor
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="settings-color-input" />
          </label>
        </div>
        <label>
          Categoria pai (opcional)
          <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">— Nenhuma (categoria raiz) —</option>
            {parentOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </label>
        <div className="modal-actions">
          <button className="ghost-button" type="button" onClick={onCancel}>Cancelar</button>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Salvando…" : initial ? "Atualizar" : "Adicionar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
