import { useEffect, useRef, useState } from "react";
import { newId } from "../utils/formatters.js";
import { flattenCategoryTree } from "../services/settingsSheets.js";

// ─── ActionMenu (dropdown "...") ──────────────────────────────────────────────

function ActionMenu({ actions, loading }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="action-menu" ref={ref}>
      <button
        type="button"
        className="action-menu-trigger"
        onClick={() => setOpen(!open)}
        disabled={loading}
        aria-label="Opções"
      >
        ⋮
      </button>
      {open && (
        <ul className="action-menu-dropdown">
          {actions.map((action) => (
            <li key={action.label}>
              <button
                type="button"
                className={`action-menu-item${action.danger ? " danger" : ""}`}
                onClick={() => { setOpen(false); action.onClick(); }}
                disabled={loading}
              >
                {action.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── CategoryForm ─────────────────────────────────────────────────────────────

function CategoryForm({ categories, initial, onSave, onCancel, loading }) {
  const [name,     setName]     = useState(initial?.name     || "");
  const [icon,     setIcon]     = useState(initial?.icon     || "📦");
  const [color,    setColor]    = useState(initial?.color    || "#95A5A6");
  const [parentId, setParentId] = useState(initial?.parentId || "");

  // opções de pai: apenas raízes (depth 0) para evitar árvore muito profunda
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
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{initial ? "Editar categoria" : "Nova categoria"}</h3>
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
      </div>
    </div>
  );
}

// ─── AccountForm ──────────────────────────────────────────────────────────────

function AccountForm({ initial, onSave, onCancel, loading }) {
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

// ─── ImportPanel ──────────────────────────────────────────────────────────────

function ImportPanel({ type, onImport, onClose, loading }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  function handleImport() {
    setError("");
    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error("O JSON deve ser um array.");
      onImport(data);
    } catch (err) {
      setError(err.message);
    }
  }

  const isCat = type === "categories";

  const example = isCat
    ? `[
  { "id": "cat-moradia", "parentId": "", "name": "Moradia", "icon": "🏠", "color": "#4A90D9" },
  { "id": "cat-aluguel", "parentId": "cat-moradia", "name": "Aluguel", "icon": "🔑", "color": "#4A90D9" },
  { "id": "cat-condominio", "parentId": "cat-moradia", "name": "Condomínio", "icon": "🏢", "color": "#4A90D9" },
  { "id": "cat-alimentacao", "parentId": "", "name": "Alimentação", "icon": "🍽️", "color": "#E67E22" },
  { "id": "cat-supermercado", "parentId": "cat-alimentacao", "name": "Supermercado", "icon": "🛒", "color": "#E67E22" }
]`
    : `[
  { "id": "acc-nubank", "name": "Nubank" },
  { "id": "acc-itau", "name": "Itaú" },
  { "id": "acc-poupanca", "name": "Poupança", "active": false }
]`;

  return (
    <div className="settings-import-panel panel">
      <div className="panel-header">
        <div>
          <h3>Importar {isCat ? "categorias" : "contas"}</h3>
          <p>Cole o JSON abaixo. IDs já existentes serão ignorados.</p>
        </div>
        <button className="link-button" type="button" onClick={onClose}>Fechar</button>
      </div>

      <div className="import-format-box">
        <strong>Campos {isCat ? "de cada categoria" : "de cada conta"}:</strong>
        {isCat ? (
          <ul>
            <li><code>id</code> — identificador único (ex: "cat-moradia")</li>
            <li><code>parentId</code> — id da categoria pai, ou "" se for raiz</li>
            <li><code>name</code> — nome da categoria</li>
            <li><code>icon</code> — emoji representativo</li>
            <li><code>color</code> — cor em hexadecimal (ex: "#4A90D9")</li>
            <li><code>active</code> — <code>true</code> ou <code>false</code> (opcional, padrão: true)</li>
          </ul>
        ) : (
          <ul>
            <li><code>id</code> — identificador único (ex: "acc-nubank")</li>
            <li><code>name</code> — nome da conta</li>
            <li><code>active</code> — <code>true</code> ou <code>false</code> (opcional, padrão: true)</li>
          </ul>
        )}
      </div>

      <label>
        JSON
        <textarea
          className="settings-import-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={example}
          rows={8}
        />
      </label>
      {error && <p className="settings-error">{error}</p>}
      <div className="settings-form-actions">
        <button className="primary-button" type="button" onClick={handleImport} disabled={loading || !text.trim()}>
          {loading ? "Importando…" : "Importar"}
        </button>
      </div>
    </div>
  );
}

// ─── CategoryTree ─────────────────────────────────────────────────────────────

function CategoryTree({ categories, onEdit, onToggle, onDelete, loading }) {
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

// ─── AccountList ──────────────────────────────────────────────────────────────

function AccountList({ accounts, onEdit, onToggle, onDelete, loading }) {
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

// ─── SettingsPage ─────────────────────────────────────────────────────────────

export default function SettingsPage({
  categories,
  accounts,
  settingsApi,
  onCategoriesChange,
  onAccountsChange,
  loading,
  setLoading,
  notify,
  importTab,
  onDisconnect,
  confirm
}) {
  const [tab,          setTab]          = useState("categories");
  const [editingCat,   setEditingCat]   = useState(null);   // null | false | category
  const [editingAcc,   setEditingAcc]   = useState(null);
  const [showImport,   setShowImport]   = useState(false);

  // ── categorias ──────────────────────────────────────────────────────────────

  async function handleSaveCategory(cat, existing) {
    setLoading(true);
    try {
      const updated = await settingsApi.saveCategory(cat, existing);
      onCategoriesChange(updated);
      setEditingCat(null);
      notify(existing ? "Categoria atualizada." : "Categoria adicionada.");
    } catch (err) {
      notify(err.message, true);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleCategory(cat) {
    setLoading(true);
    try {
      const updated = await settingsApi.toggleCategory(cat);
      onCategoriesChange(categories.map((c) => c.id === updated.id ? updated : c));
      notify(updated.active ? "Categoria ativada." : "Categoria desativada.");
    } catch (err) {
      notify(err.message, true);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCategory(cat) {
    if (!window.confirm(`Excluir a categoria "${cat.name}"? Subcategorias também serão removidas.`)) return;
    setLoading(true);
    try {
      const updated = await settingsApi.deleteCategory(cat);
      onCategoriesChange(updated);
      notify("Categoria excluída.");
    } catch (err) {
      notify(err.message, true);
    } finally {
      setLoading(false);
    }
  }

  async function handleImportCategories(data) {
    setLoading(true);
    try {
      const updated = await settingsApi.importCategories(data);
      onCategoriesChange(updated);
      setShowImport(false);
      notify(`${updated.length - categories.length} categorias importadas.`);
    } catch (err) {
      notify(err.message, true);
    } finally {
      setLoading(false);
    }
  }

  // ── contas ──────────────────────────────────────────────────────────────────

  async function handleSaveAccount(acc, existing) {
    setLoading(true);
    try {
      const updated = await settingsApi.saveAccount(acc, existing);
      onAccountsChange(updated);
      setEditingAcc(null);
      notify(existing ? "Conta atualizada." : "Conta adicionada.");
    } catch (err) {
      notify(err.message, true);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleAccount(acc) {
    setLoading(true);
    try {
      const updated = await settingsApi.toggleAccount(acc);
      onAccountsChange(accounts.map((a) => a.id === updated.id ? updated : a));
      notify(updated.active ? "Conta ativada." : "Conta desativada.");
    } catch (err) {
      notify(err.message, true);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteAccount(acc) {
    if (!window.confirm(`Excluir a conta "${acc.name}"?`)) return;
    setLoading(true);
    try {
      const updated = await settingsApi.deleteAccount(acc);
      onAccountsChange(updated);
      notify("Conta excluída.");
    } catch (err) {
      notify(err.message, true);
    } finally {
      setLoading(false);
    }
  }

  async function handleImportAccounts(data) {
    setLoading(true);
    try {
      const updated = await settingsApi.importAccounts(data);
      onAccountsChange(updated);
      setShowImport(false);
      notify(`${updated.length - accounts.length} contas importadas.`);
    } catch (err) {
      notify(err.message, true);
    } finally {
      setLoading(false);
    }
  }

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="settings-page">
      <div className="couple-tabs">
        <button type="button" className={`couple-tab${tab === "categories" ? " active" : ""}`} onClick={() => { setTab("categories"); setEditingCat(null); setShowImport(false); }}>
          Categorias
        </button>
        <button type="button" className={`couple-tab${tab === "accounts" ? " active" : ""}`} onClick={() => { setTab("accounts"); setEditingAcc(null); setShowImport(false); }}>
          Contas
        </button>
        {importTab && (
          <button type="button" className={`couple-tab${tab === "import" ? " active" : ""}`} onClick={() => { setTab("import"); setEditingCat(null); setEditingAcc(null); setShowImport(false); }}>
            Importar
          </button>
        )}
        {onDisconnect && (
          <button type="button" className="couple-tab couple-tab--danger" onClick={async () => {
            const ok = await confirm("Deseja desconectar sua conta Google? Seus dados continuam salvos na planilha.", "Desconectar");
            if (ok) onDisconnect();
          }}>
            Desconectar
          </button>
        )}
      </div>

      {/* ── aba categorias ── */}
      {tab === "categories" && (
        <div className="settings-tab-content">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Categorias</h3>
                <p>{categories.filter((c) => c.active).length} ativas · {categories.length} total</p>
              </div>
              <div className="settings-header-actions">
                <button type="button" className="icon-button" onClick={() => { setShowImport(!showImport); setEditingCat(null); }} aria-label="Importar JSON" title="Importar JSON">
                  📥
                </button>
                <button type="button" className="icon-button" onClick={() => { setEditingCat(false); setShowImport(false); }} aria-label="Nova categoria" title="Nova categoria">
                  ＋
                </button>
              </div>
            </div>

            {showImport && (
              <ImportPanel type="categories" onImport={handleImportCategories} onClose={() => setShowImport(false)} loading={loading} />
            )}

            {editingCat !== null && (
              <CategoryForm
                categories={categories}
                initial={editingCat || undefined}
                onSave={handleSaveCategory}
                onCancel={() => setEditingCat(null)}
                loading={loading}
              />
            )}

            <CategoryTree
              categories={categories}
              onEdit={(cat) => { setEditingCat(cat); setShowImport(false); }}
              onToggle={handleToggleCategory}
              onDelete={handleDeleteCategory}
              loading={loading}
            />
          </div>
        </div>
      )}

      {/* ── aba contas ── */}
      {tab === "accounts" && (
        <div className="settings-tab-content">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Contas</h3>
                <p>{accounts.filter((a) => a.active).length} ativas · {accounts.length} total</p>
              </div>
              <div className="settings-header-actions">
                <button type="button" className="icon-button" onClick={() => { setShowImport(!showImport); setEditingAcc(null); }} aria-label="Importar JSON" title="Importar JSON">
                  📥
                </button>
                <button type="button" className="icon-button" onClick={() => { setEditingAcc(false); setShowImport(false); }} aria-label="Nova conta" title="Nova conta">
                  ＋
                </button>
              </div>
            </div>

            {showImport && (
              <ImportPanel type="accounts" onImport={handleImportAccounts} onClose={() => setShowImport(false)} loading={loading} />
            )}

            {editingAcc !== null && (
              <AccountForm
                initial={editingAcc || undefined}
                onSave={handleSaveAccount}
                onCancel={() => setEditingAcc(null)}
                loading={loading}
              />
            )}

            <AccountList
              accounts={accounts}
              onEdit={(acc) => { setEditingAcc(acc); setShowImport(false); }}
              onToggle={handleToggleAccount}
              onDelete={handleDeleteAccount}
              loading={loading}
            />
          </div>
        </div>
      )}

      {/* ── aba importar ── */}
      {tab === "import" && importTab && (
        <div className="settings-tab-content">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Importar lançamentos</h3>
                <p>Importe lançamentos de outra planilha via JSON.</p>
              </div>
            </div>
            {importTab}
          </div>
        </div>
      )}
    </div>
  );
}
