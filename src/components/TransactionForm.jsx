import { useEffect, useMemo, useRef, useState } from "react";
import { flattenCategoryTree } from "../services/settingsSheets.js";
import { createResolvers } from "../utils/resolvers.js";
import { maskCurrency } from "../utils/formatters.js";
import { TRANSFER_CATEGORY_ID } from "../constants.js";
import CategorySelect from "./CategorySelect.jsx";
import AccountSelect from "./AccountSelect.jsx";

/**
 * TransactionForm
 * Formulário de lançamento com autocomplete baseado no histórico.
 * Suporta despesa, receita e transferência entre contas.
 */
export default function TransactionForm({
  transaction,
  editing,
  onChange,
  onCancel,
  onSubmit,
  onRemove,
  onTransfer,
  categories: dynamicCategories,
  accounts: dynamicAccounts,
  suggestions = [],
  saving = false
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [destinationAccount, setDestinationAccount] = useState(
    () => transaction.destinationAccount || ""
  );
  const inputRef = useRef(null);

  const isTransfer = transaction.type === "transfer" ||
    (editing && transaction.category === TRANSFER_CATEGORY_ID && transaction.linkedId);
  const typeLocked = Boolean(transaction.lockType);

  // ── categorias e contas ─────────────────────────────────────────────────────
  const categoryOptions = useMemo(
    () => dynamicCategories
      ? flattenCategoryTree(dynamicCategories, true).filter((c) => c.id !== TRANSFER_CATEGORY_ID)
      : [],
    [dynamicCategories]
  );

  const accountOptions = useMemo(
    () => dynamicAccounts ? dynamicAccounts.filter((a) => a.active) : [],
    [dynamicAccounts]
  );

  // Valores efetivos — se vazio, usa o primeiro da lista
  const effectiveCategory = transaction.category || categoryOptions[0]?.id || "";
  const effectiveAccount = transaction.account || accountOptions[0]?.id || "";

  // Seta defaults no draft quando monta com valores vazios
  useEffect(() => {
    if (!transaction.category && effectiveCategory) {
      onChange({ ...transaction, category: effectiveCategory, account: effectiveAccount });
    } else if (!transaction.account && effectiveAccount) {
      onChange({ ...transaction, account: effectiveAccount });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Default conta destino
  useEffect(() => {
    if (isTransfer && !destinationAccount && accountOptions.length > 1) {
      const other = accountOptions.find((a) => a.id !== effectiveAccount);
      if (other) setDestinationAccount(other.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTransfer]);

  const resolve = useMemo(
    () => createResolvers(dynamicCategories || [], dynamicAccounts || []),
    [dynamicCategories, dynamicAccounts]
  );

  const filteredSuggestions = useMemo(() => {
    const query = transaction.description.trim().toLocaleLowerCase("pt-BR");
    if (!query || query.length < 2) return [];
    return suggestions
      .filter((s) => {
        if (isTransfer) return s.category === TRANSFER_CATEGORY_ID;
        return s.category !== TRANSFER_CATEGORY_ID;
      })
      .filter((s) => s.description.toLocaleLowerCase("pt-BR").includes(query))
      .slice(0, 3);
  }, [transaction.description, suggestions, isTransfer]);

  function applySuggestion(suggestion) {
    onChange({
      ...transaction,
      description: suggestion.description,
      type: suggestion.type,
      category: suggestion.category,
      account: suggestion.account
    });
    setShowSuggestions(false);
  }

  function handleDescriptionChange(value) {
    onChange({ ...transaction, description: value });
    setShowSuggestions(true);
  }

  function handleDescriptionBlur() {
    setTimeout(() => setShowSuggestions(false), 200);
  }

  // ── handlers ────────────────────────────────────────────────────────────────
  function changeType(type) {
    onChange({ ...transaction, type });
  }

  function changeField(field, value) {
    onChange({ ...transaction, [field]: value });
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (isTransfer && onTransfer) {
      onTransfer({
        ...transaction,
        account: effectiveAccount,
        destinationAccount,
        category: TRANSFER_CATEGORY_ID
      });
    } else {
      onSubmit(event);
    }
  }

  return (
    <section className="panel form-panel" id="new-transaction" aria-labelledby="form-title">
      {editing && (
        <div className="panel-header">
          <div />
          <button className="link-button" type="button" onClick={onCancel}>Cancelar</button>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="type-toggle" role="group" aria-label="Tipo">
          {isTransfer && editing ? (
            <label className="type-toggle-info">
              <span>Transferência entre contas</span>
            </label>
          ) : (
            <>
              <label>
                <input type="radio" name="type" value="expense" checked={transaction.type === "expense"} onChange={() => changeType("expense")} disabled={typeLocked} />
                <span>Despesa</span>
              </label>
              <label>
                <input type="radio" name="type" value="income" checked={transaction.type === "income"} onChange={() => changeType("income")} disabled={typeLocked} />
                <span>Receita</span>
              </label>
              {!editing && !typeLocked && (
                <label>
                  <input type="radio" name="type" value="transfer" checked={transaction.type === "transfer"} onChange={() => changeType("transfer")} />
                  <span>Transferência</span>
                </label>
              )}
            </>
          )}
        </div>

        <div className="form-row">
          <label className="autocomplete-wrapper">
            Descrição
            <input
              ref={inputRef}
              required
              placeholder={isTransfer ? "Ex.: Transferência Nubank → Itaú" : "Ex.: Supermercado"}
              value={transaction.description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={handleDescriptionBlur}
              autoComplete="off"
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <ul className="autocomplete-list" role="listbox">
                {filteredSuggestions.map((s) => (
                  <li
                    key={`${s.description}|${s.category}|${s.account}`}
                    role="option"
                    className="autocomplete-item"
                    onMouseDown={() => applySuggestion(s)}
                  >
                    <span className="autocomplete-name">{s.description}</span>
                    <span className="autocomplete-meta">
                      {s.type === "income" ? "Receita" : "Despesa"} · {resolve.category(s.category)} · {resolve.account(s.account)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </label>
          <label>
            Valor
            <input required inputMode="numeric" placeholder="0,00" value={transaction.amount} onChange={(e) => changeField("amount", maskCurrency(e.target.value))} />
          </label>
        </div>

        {isTransfer ? (
          <>
            <div className="form-row">
              <label>
                Conta origem
                <AccountSelect
                  options={accountOptions}
                  value={effectiveAccount}
                  onChange={(id) => changeField("account", id)}
                />
              </label>
              <label>
                Conta destino
                <AccountSelect
                  options={accountOptions.filter((a) => a.id !== effectiveAccount)}
                  value={destinationAccount}
                  onChange={setDestinationAccount}
                />
              </label>
            </div>
            <label>
              Data
              <input type="date" required value={transaction.date} onChange={(e) => changeField("date", e.target.value)} />
            </label>
          </>
        ) : (
          <>
            <div className="form-row">
              <label>
                Categoria
                <CategorySelect
                  options={categoryOptions}
                  value={effectiveCategory}
                  onChange={(id) => changeField("category", id)}
                />
              </label>
              <label>
                Data
                <input type="date" required value={transaction.date} onChange={(e) => changeField("date", e.target.value)} />
              </label>
            </div>

            <label>
              Conta
              <AccountSelect
                options={accountOptions}
                value={effectiveAccount}
                onChange={(id) => changeField("account", id)}
              />
            </label>

            {!editing && transaction.type === "expense" && (
              <label className="split-checkbox">
                <input
                  type="checkbox"
                  checked={transaction.split || false}
                  onChange={(e) => changeField("split", e.target.checked)}
                />
                <span>Dividir com parceiro(a) (50/50)</span>
              </label>
            )}
          </>
        )}

        <button className="primary-button" type="submit" disabled={saving}>
          {saving
            ? "Salvando…"
            : isTransfer ? "Transferir" : editing ? "Atualizar lançamento" : "Salvar lançamento"
          }
        </button>

        {editing && onRemove && (
          <button
            className="danger-button"
            type="button"
            onClick={() => onRemove(transaction)}
          >
            Excluir lançamento
          </button>
        )}
      </form>
    </section>
  );
}
