import { useState } from "react";
import { newId } from "../../utils/formatters.js";

/**
 * AccountForm
 * Formulário inline de criação/edição de conta.
 */
export default function AccountForm({ initial, onSave, onCancel, loading }) {
  const [name, setName] = useState(initial?.name || "");

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      id:        initial?.id || newId(),
      name:      name.trim(),
      active:    initial?.active !== false,
      createdAt: initial?.createdAt || new Date().toISOString()
    }, initial || null);
  }

  return (
    <form className="settings-inline-form" onSubmit={handleSubmit}>
      <label>
        Nome da conta
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Nubank" />
      </label>
      <div className="settings-form-actions">
        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? "Salvando…" : initial ? "Atualizar" : "Adicionar"}
        </button>
        <button className="ghost-button" type="button" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
