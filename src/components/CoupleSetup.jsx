import { useState } from "react";

/**
 * CoupleSetup
 * Exibido quando o usuário ainda não configurou a planilha do casal.
 * Permite criar uma nova planilha ou entrar em uma existente via código.
 */
export default function CoupleSetup({ userName, userEmail, onCreateCouple, onJoinCouple, loading }) {
  const [tab, setTab] = useState("create");   // "create" | "join"
  const [code, setCode] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");

  function handleCreate(event) {
    event.preventDefault();
    if (!partnerEmail.trim()) return;
    onCreateCouple(partnerEmail.trim());
  }

  function handleJoin(event) {
    event.preventDefault();
    if (!code.trim()) return;
    onJoinCouple(code.trim(), partnerName.trim() || userName);
  }

  return (
    <div className="couple-setup">
      <div className="couple-setup-card panel">
        <span className="eyebrow">Funcionalidade do casal</span>
        <h3>Contas compartilhadas</h3>
        <p className="couple-setup-desc">
          Registre despesas divididas entre vocês dois e acompanhe quem deve o quê.
          Os dados ficam em uma planilha Google compartilhada entre as duas contas.
        </p>

        <div className="couple-tabs">
          <button
            type="button"
            className={`couple-tab${tab === "create" ? " active" : ""}`}
            onClick={() => setTab("create")}
          >
            Criar planilha do casal
          </button>
          <button
            type="button"
            className={`couple-tab${tab === "join" ? " active" : ""}`}
            onClick={() => setTab("join")}
          >
            Entrar com código
          </button>
        </div>

        {tab === "create" && (
          <form onSubmit={handleCreate} className="couple-setup-form">
            <p className="couple-setup-hint">
              Você será o <strong>usuário A</strong>. Informe o email Google do seu parceiro(a)
              para compartilhar a planilha. Após criar, envie o código gerado para ele(a).
            </p>
            <div className="couple-setup-user">
              <span className="couple-user-badge">A</span>
              <div>
                <strong>{userName}</strong>
                <small>{userEmail}</small>
              </div>
            </div>
            <label>
              Email Google do parceiro(a)
              <input
                required
                type="email"
                placeholder="parceiro@gmail.com"
                value={partnerEmail}
                onChange={(e) => setPartnerEmail(e.target.value)}
              />
            </label>
            <button className="primary-button" type="submit" disabled={loading || !partnerEmail.trim()}>
              {loading ? "Criando…" : "Criar planilha do casal"}
            </button>
          </form>
        )}

        {tab === "join" && (
          <form onSubmit={handleJoin} className="couple-setup-form">
            <p className="couple-setup-hint">
              Cole o código da planilha do casal que seu parceiro(a) criou.
              Você entrará como <strong>usuário B</strong>.
            </p>
            <label>
              Seu nome (como aparecerá para o parceiro)
              <input
                placeholder="Ex.: Ana"
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
              />
            </label>
            <label>
              Código da planilha do casal
              <input
                required
                placeholder="Cole o código aqui"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            <button className="primary-button" type="submit" disabled={loading || !code.trim()}>
              {loading ? "Conectando…" : "Entrar na planilha"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
