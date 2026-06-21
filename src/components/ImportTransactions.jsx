import { useState, useMemo } from "react";
import { newId } from "../utils/formatters.js";
import {
  analyzeImportData,
  buildCategoryMap,
  buildAccountMap,
  buildRows,
  importRows
} from "../services/importTransactions.js";
import { useNotify } from "../contexts/NotifyContext.jsx";

/**
 * ImportTransactions
 * Componente de importação de lançamentos em 4 etapas:
 * 1. Colar JSON
 * 2. Resolver categorias/contas desconhecidas
 * 3. Resumo e confirmação
 * 4. Importação com progresso
 */
export default function ImportTransactions({ categories, accounts, settingsApi, token, spreadsheetId, onComplete }) {
  const notify = useNotify();
  const [step, setStep] = useState("input"); // input | resolve | confirm | importing | done
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState("");

  // Dados analisados
  const [analysis, setAnalysis] = useState(null);

  // Resolução de categorias/contas
  const [categoryActions, setCategoryActions] = useState({}); // { name: "create" | "skip" | "mapTo:id" }
  const [accountActions, setAccountActions] = useState({});   // { name: "create" | "skip" }

  // Progresso
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState(null);

  // ── Step 1: Parse JSON ──────────────────────────────────────────────────────

  function handleParse() {
    setError("");
    try {
      const data = JSON.parse(jsonText);
      if (!Array.isArray(data)) throw new Error("O JSON deve ser um array.");
      if (data.length === 0) throw new Error("O array está vazio.");

      // Valida estrutura mínima
      const first = data[0];
      if (!first.date || !first.description || first.amount === undefined) {
        throw new Error("Cada item deve ter: date, description, amount, category, account");
      }

      const result = analyzeImportData(data, categories, accounts);
      setAnalysis(result);

      // Inicializa ações padrão
      const catActions = {};
      for (const name of result.unknownCategories) {
        catActions[name] = "create";
      }
      setCategoryActions(catActions);

      const accActions = {};
      for (const name of result.unknownAccounts) {
        accActions[name] = "create";
      }
      setAccountActions(accActions);

      if (result.unknownCategories.length === 0 && result.unknownAccounts.length === 0) {
        setStep("confirm");
      } else {
        setStep("resolve");
      }
    } catch (err) {
      setError(err.message);
    }
  }

  // ── Step 2: Resolve unknowns ────────────────────────────────────────────────

  function handleResolveComplete() {
    setStep("confirm");
  }

  // ── Step 3: Confirm and import ──────────────────────────────────────────────

  async function handleImport() {
    setStep("importing");
    setProgress({ current: 0, total: 0 });

    try {
      // Criar categorias novas
      const newCategories = [];
      for (const [name, action] of Object.entries(categoryActions)) {
        if (action === "create") {
          const cat = {
            id: newId(),
            parentId: "",
            name,
            icon: "📦",
            color: "#95A5A6",
            active: true,
            createdAt: new Date().toISOString()
          };
          newCategories.push(cat);
        }
      }

      if (newCategories.length > 0 && settingsApi) {
        await settingsApi.importCategories(newCategories);
      }

      // Criar contas novas
      const newAccounts = [];
      for (const [name, action] of Object.entries(accountActions)) {
        if (action === "create") {
          const acc = {
            id: newId(),
            name,
            active: true,
            createdAt: new Date().toISOString()
          };
          newAccounts.push(acc);
        }
      }

      if (newAccounts.length > 0 && settingsApi) {
        await settingsApi.importAccounts(newAccounts);
      }

      // Construir mapas finais
      const categoryMap = buildCategoryMap(categories, newCategories);
      const accountMap = buildAccountMap(accounts, newAccounts);

      // Filtrar entries que não foram "skip"
      const filteredEntries = analysis.entries.filter((e) => {
        const catAction = categoryActions[e.category];
        if (catAction === "skip") return false;
        const accAction = accountActions[e.account];
        if (accAction === "skip") return false;
        return true;
      });

      // Filtrar transfers que não foram "skip"
      const filteredTransfers = analysis.transfers.filter((t) => {
        const srcAction = accountActions[t.sourceAccount];
        const dstAction = accountActions[t.destAccount];
        if (srcAction === "skip" || dstAction === "skip") return false;
        return true;
      });

      // Gerar linhas
      const rows = buildRows(filteredEntries, filteredTransfers, categoryMap, accountMap);
      setProgress({ current: 0, total: rows.length });

      // Importar
      const importResult = await importRows(token, spreadsheetId, rows, (current, total) => {
        setProgress({ current, total });
      });

      setResult(importResult);
      setStep("done");
      notify(`${importResult.imported} lançamentos importados com sucesso.`);
    } catch (err) {
      setError(err.message);
      setStep("confirm");
      notify("Erro na importação: " + err.message, true);
    }
  }

  // ── Contagens para resumo ───────────────────────────────────────────────────

  const summary = useMemo(() => {
    if (!analysis) return null;
    return {
      totalEntries: analysis.entries.length,
      totalTransfers: analysis.transfers.length,
      totalRows: analysis.entries.length + analysis.transfers.length * 2,
      unknownCats: analysis.unknownCategories.length,
      unknownAccs: analysis.unknownAccounts.length
    };
  }, [analysis]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="import-transactions">
      {/* Step 1: Input */}
      {step === "input" && (
        <div className="import-step">
          <h4>Importar lançamentos</h4>
          <p className="import-description">
            Cole o JSON com os lançamentos. Formato: array de objetos com os campos abaixo.
            Copie o exemplo e use como referência para gerar seus dados.
          </p>
          <div className="import-format-box">
            <strong>Campos obrigatórios:</strong>
            <ul>
              <li><code>date</code> — data no formato <code>dd/mm/yyyy</code></li>
              <li><code>description</code> — descrição do lançamento</li>
              <li><code>amount</code> — valor numérico (positivo = receita, negativo = despesa)</li>
              <li><code>category</code> — nome da categoria (ex: "Alimentação", "Salário")</li>
              <li><code>account</code> — nome da conta (ex: "Nubank", "Conta Corrente")</li>
            </ul>
            <strong>Transferências entre contas:</strong>
            <p>Use duas linhas consecutivas com categoria "Transferência", mesma data, mesma descrição, valores opostos (negativo na origem, positivo no destino).</p>
          </div>
          <textarea
            className="settings-import-textarea"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder={`[
  { "date": "15/01/2025", "description": "Salário", "amount": 5000.00, "category": "Salário", "account": "Nubank" },
  { "date": "16/01/2025", "description": "Supermercado Extra", "amount": -320.50, "category": "Alimentação", "account": "Nubank" },
  { "date": "16/01/2025", "description": "Aluguel", "amount": -1800.00, "category": "Moradia", "account": "Conta Corrente" },
  { "date": "17/01/2025", "description": "Transferência Poupança", "amount": -1000.00, "category": "Transferência", "account": "Nubank" },
  { "date": "17/01/2025", "description": "Transferência Poupança", "amount": 1000.00, "category": "Transferência", "account": "Poupança" }
]`}
            rows={10}
          />
          {error && <p className="settings-error">{error}</p>}
          <div className="settings-form-actions">
            <button
              className="primary-button"
              type="button"
              onClick={handleParse}
              disabled={!jsonText.trim()}
            >
              Analisar
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Resolve */}
      {step === "resolve" && analysis && (
        <div className="import-step">
          <h4>Resolver pendências</h4>
          <p className="import-description">
            Encontrei {summary.unknownCats} categorias e {summary.unknownAccs} contas que não existem no sistema.
          </p>

          {analysis.unknownCategories.length > 0 && (
            <div className="import-resolve-section">
              <h5>Categorias não encontradas</h5>
              {analysis.unknownCategories.map((name) => (
                <div key={name} className="import-resolve-item">
                  <span className="import-resolve-name">{name}</span>
                  <select
                    value={categoryActions[name] || "create"}
                    onChange={(e) => setCategoryActions({ ...categoryActions, [name]: e.target.value })}
                  >
                    <option value="create">Criar nova categoria</option>
                    <option value="skip">Ignorar lançamentos</option>
                  </select>
                </div>
              ))}
            </div>
          )}

          {analysis.unknownAccounts.length > 0 && (
            <div className="import-resolve-section">
              <h5>Contas não encontradas</h5>
              {analysis.unknownAccounts.map((name) => (
                <div key={name} className="import-resolve-item">
                  <span className="import-resolve-name">{name}</span>
                  <select
                    value={accountActions[name] || "create"}
                    onChange={(e) => setAccountActions({ ...accountActions, [name]: e.target.value })}
                  >
                    <option value="create">Criar nova conta</option>
                    <option value="skip">Ignorar lançamentos</option>
                  </select>
                </div>
              ))}
            </div>
          )}

          <div className="settings-form-actions">
            <button className="ghost-button" type="button" onClick={() => setStep("input")}>
              Voltar
            </button>
            <button className="primary-button" type="button" onClick={handleResolveComplete}>
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === "confirm" && analysis && (
        <div className="import-step">
          <h4>Confirmar importação</h4>
          <div className="import-summary">
            <div className="import-summary-item">
              <span className="import-summary-label">Lançamentos normais</span>
              <span className="import-summary-value">{summary.totalEntries}</span>
            </div>
            <div className="import-summary-item">
              <span className="import-summary-label">Transferências (pares)</span>
              <span className="import-summary-value">{summary.totalTransfers}</span>
            </div>
            <div className="import-summary-item">
              <span className="import-summary-label">Total de linhas na planilha</span>
              <span className="import-summary-value">{summary.totalRows}</span>
            </div>
            {Object.values(categoryActions).filter((a) => a === "create").length > 0 && (
              <div className="import-summary-item">
                <span className="import-summary-label">Categorias a criar</span>
                <span className="import-summary-value">
                  {Object.values(categoryActions).filter((a) => a === "create").length}
                </span>
              </div>
            )}
            {Object.values(accountActions).filter((a) => a === "create").length > 0 && (
              <div className="import-summary-item">
                <span className="import-summary-label">Contas a criar</span>
                <span className="import-summary-value">
                  {Object.values(accountActions).filter((a) => a === "create").length}
                </span>
              </div>
            )}
          </div>

          {error && <p className="settings-error">{error}</p>}

          <div className="settings-form-actions">
            <button className="ghost-button" type="button" onClick={() => setStep("input")}>
              Voltar
            </button>
            <button className="primary-button" type="button" onClick={handleImport}>
              Importar
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Importing */}
      {step === "importing" && (
        <div className="import-step">
          <h4>Importando…</h4>
          <div className="import-progress">
            <div className="import-progress-bar">
              <div
                className="import-progress-fill"
                style={{ width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : "0%" }}
              />
            </div>
            <p className="import-progress-text">
              {progress.current} / {progress.total} lançamentos
            </p>
          </div>
        </div>
      )}

      {/* Step 5: Done */}
      {step === "done" && result && (
        <div className="import-step">
          <h4>Importação concluída ✓</h4>
          <p className="import-description">
            {result.imported} lançamentos importados em {result.months} meses.
          </p>
          <div className="settings-form-actions">
            <button className="primary-button" type="button" onClick={onComplete}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
