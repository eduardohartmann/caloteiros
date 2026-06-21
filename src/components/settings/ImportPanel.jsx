import { useState } from "react";

/**
 * ImportPanel
 * Painel para importação de categorias ou contas via JSON.
 */
export default function ImportPanel({ type, onImport, onClose, loading }) {
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
