import { useState } from "react";
import CategoryForm from "./settings/CategoryForm.jsx";
import AccountForm from "./settings/AccountForm.jsx";
import ImportPanel from "./settings/ImportPanel.jsx";
import CategoryTree from "./settings/CategoryTree.jsx";
import AccountList from "./settings/AccountList.jsx";

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
