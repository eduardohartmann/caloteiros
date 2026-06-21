import { useMemo, useState } from "react";
import CoupleSetup from "./CoupleSetup.jsx";
import { brl, dateBR } from "../utils/formatters.js";

/**
 * CouplePage
 * Página do casal — mostra lançamentos compartilhados por mês.
 * Parceiro pode marcar "Paguei", criador pode confirmar recebimento.
 */
export default function CouplePage({ auth, couple, month, onConfirmReimbursement, onPaymentDraft }) {

  if (couple.coupleLoading) {
    return <div className="panel couple-loading"><p>Carregando planilha do casal…</p></div>;
  }

  if (!couple.coupleReady) {
    return (
      <CoupleSetup
        userName={auth.accountName}
        userEmail={auth.accountEmail}
        onCreateCouple={couple.handleCreateCouple}
        onJoinCouple={couple.handleJoinCouple}
        loading={couple.coupleLoading}
      />
    );
  }

  return (
    <CoupleContent
      entries={couple.coupleEntries}
      config={couple.coupleConfig}
      userKey={couple.coupleUserKey}
      spreadsheetId={couple.coupleSpreadsheetId}
      month={month}
      onMarkAsPaid={async (entry) => {
        const paymentDraft = await couple.handleMarkAsPaid(entry);
        if (paymentDraft && onPaymentDraft) {
          onPaymentDraft(paymentDraft);
        }
      }}
      onConfirmPayment={async (entry) => {
        const reimbursement = await couple.handleConfirmPayment(entry);
        if (reimbursement && onConfirmReimbursement) {
          onConfirmReimbursement(reimbursement);
        }
      }}
      onDelete={couple.handleDeleteEntry}
      loading={couple.coupleLoading}
      currentUser={auth.accountName}
    />
  );
}

// ─── conteúdo principal ───────────────────────────────────────────────────────

function CoupleContent({
  entries, config, userKey, spreadsheetId,
  month,
  onMarkAsPaid, onConfirmPayment, onDelete,
  loading, currentUser
}) {
  const nameA = config.nomeA || "Usuário A";
  const nameB = config.nomeB || "Usuário B";
  const myName = userKey === "A" ? nameA : nameB;
  const partnerName = userKey === "A" ? nameB : nameA;

  // Pendentes e aguardando confirmação: acumula meses anteriores (dívida não some ao trocar mês)
  // Confirmados: apenas o mês selecionado (histórico resolvido)
  const pending = useMemo(
    () => entries
      .filter((e) => e.status === "pendente" && e.date.slice(0, 7) <= month)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [entries, month]
  );

  const paid = useMemo(
    () => entries
      .filter((e) => e.status === "pago" && e.date.slice(0, 7) <= month)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [entries, month]
  );

  const confirmed = useMemo(
    () => entries
      .filter((e) => e.status === "confirmado" && e.date.startsWith(month))
      .sort((a, b) => b.date.localeCompare(a.date)),
    [entries, month]
  );

  function isCreator(entry) {
    return entry.createdBy === currentUser;
  }

  // Separar pendentes: "me devem" (eu cadastrei) vs "eu devo" (parceiro cadastrou)
  const theyOweMe = useMemo(
    () => pending.filter((e) => isCreator(e)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pending, currentUser]
  );
  const iOweThem = useMemo(
    () => pending.filter((e) => !isCreator(e)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pending, currentUser]
  );

  // Separar aguardando confirmação
  const paidTheyOweMe = useMemo(
    () => paid.filter((e) => isCreator(e)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paid, currentUser]
  );
  const paidIOweThem = useMemo(
    () => paid.filter((e) => !isCreator(e)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paid, currentUser]
  );

  // Saldo líquido (pendentes + aguardando): positivo = parceiro me deve, negativo = eu devo
  const totalTheyOweMe = theyOweMe.reduce((s, e) => s + e.amountDue, 0)
    + paidTheyOweMe.reduce((s, e) => s + e.amountDue, 0);
  const totalIOweThem = iOweThem.reduce((s, e) => s + e.amountDue, 0)
    + paidIOweThem.reduce((s, e) => s + e.amountDue, 0);
  const netBalance = totalTheyOweMe - totalIOweThem;

  const totalConfirmed = confirmed.reduce((s, e) => s + e.amountDue, 0);

  // Tab ativa: null (nenhuma), "receive", "owe", "confirmed"
  const [activeTab, setActiveTab] = useState(null);

  function toggleTab(tab) {
    setActiveTab((prev) => (prev === tab ? null : tab));
  }

  // Contagem para os cards
  const receiveCount = theyOweMe.length + paidTheyOweMe.length;
  const oweCount = iOweThem.length + paidIOweThem.length;

  return (
    <div className="couple-panel">
      {/* Código de convite — exibe apenas se o parceiro ainda não entrou */}
      {!config.nomeB && (
        <div className="panel couple-code-panel">
          <div className="panel-header">
            <div>
              <h3>Planilha do casal</h3>
              <p>Código para compartilhar: <code className="couple-code-inline">{spreadsheetId}</code></p>
            </div>
            <button type="button" className="ghost-button" onClick={() => navigator.clipboard?.writeText(spreadsheetId)}>Copiar</button>
          </div>
        </div>
      )}

      {/* Card de saldo líquido — sempre visível */}
      <div className={`couple-balance-card panel ${netBalance > 0 ? "couple-balance--positive" : netBalance < 0 ? "couple-balance--negative" : "couple-balance--zero"}`}>
        <span className="couple-balance-icon">{netBalance > 0 ? "↓" : netBalance < 0 ? "↑" : "="}</span>
        <div className="couple-balance-info">
          <span className="couple-balance-label">
            {netBalance > 0
              ? `${partnerName} deve para você`
              : netBalance < 0
                ? `Você deve para ${partnerName}`
                : "Vocês estão quites"}
          </span>
          <strong className="couple-balance-amount">{brl(Math.abs(netBalance))}</strong>
        </div>
      </div>

      {/* Cards clicáveis de resumo */}
      <div className="couple-summary">
        <button
          type="button"
          className={`metric couple-metric--receive couple-metric-btn ${activeTab === "receive" ? "couple-metric--active" : ""}`}
          onClick={() => toggleTab("receive")}
          aria-expanded={activeTab === "receive"}
          aria-controls="couple-tab-receive"
        >
          <span>Me devem</span>
          <strong>{brl(totalTheyOweMe)}</strong>
          <small>{receiveCount} {receiveCount === 1 ? "lançamento" : "lançamentos"}</small>
        </button>
        <button
          type="button"
          className={`metric couple-metric--owe couple-metric-btn ${activeTab === "owe" ? "couple-metric--active" : ""}`}
          onClick={() => toggleTab("owe")}
          aria-expanded={activeTab === "owe"}
          aria-controls="couple-tab-owe"
        >
          <span>Eu devo</span>
          <strong>{brl(totalIOweThem)}</strong>
          <small>{oweCount} {oweCount === 1 ? "lançamento" : "lançamentos"}</small>
        </button>
        <button
          type="button"
          className={`metric couple-metric--confirmed couple-metric-btn ${activeTab === "confirmed" ? "couple-metric--active" : ""}`}
          onClick={() => toggleTab("confirmed")}
          aria-expanded={activeTab === "confirmed"}
          aria-controls="couple-tab-confirmed"
        >
          <span>Confirmados</span>
          <strong>{brl(totalConfirmed)}</strong>
          <small>{confirmed.length} finalizados este mês</small>
        </button>
      </div>

      {/* ── Conteúdo da tab "Me devem" ── */}
      {activeTab === "receive" && (
        <div id="couple-tab-receive" className="couple-tab-content">
          {theyOweMe.length > 0 && (
            <section className="panel couple-section--receive">
              <div className="panel-header">
                <div>
                  <h3><span className="couple-direction-badge couple-badge--receive">↓</span> Pendentes — {partnerName} deve para você</h3>
                  <p>{theyOweMe.length} {theyOweMe.length === 1 ? "pendência" : "pendências"} · {brl(theyOweMe.reduce((s, e) => s + e.amountDue, 0))}</p>
                </div>
              </div>
              <EntryTable
                entries={theyOweMe}
                currentUser={currentUser}
                partnerName={partnerName}
                myName={myName}
                actions={(entry) => (
                  <button type="button" className="couple-delete-btn" onClick={() => onDelete(entry)} disabled={loading}>
                    Excluir
                  </button>
                )}
              />
            </section>
          )}

          {paidTheyOweMe.length > 0 && (
            <section className="panel couple-section--waiting">
              <div className="panel-header">
                <div>
                  <h3><span className="couple-direction-badge couple-badge--waiting">⏳</span> {partnerName} diz que pagou — confirme</h3>
                  <p>{paidTheyOweMe.length} aguardando sua confirmação</p>
                </div>
              </div>
              <EntryTable
                entries={paidTheyOweMe}
                currentUser={currentUser}
                partnerName={partnerName}
                myName={myName}
                actions={(entry) => (
                  <span className="couple-entry-actions-group">
                    <button type="button" className="couple-confirm-btn" onClick={() => onConfirmPayment(entry)} disabled={loading}>
                      Confirmar recebimento
                    </button>
                    <button type="button" className="couple-delete-btn" onClick={() => onDelete(entry)} disabled={loading}>
                      Excluir
                    </button>
                  </span>
                )}
              />
            </section>
          )}

          {theyOweMe.length === 0 && paidTheyOweMe.length === 0 && (
            <div className="panel"><div className="empty">Nenhuma pendência a receber.</div></div>
          )}
        </div>
      )}

      {/* ── Conteúdo da tab "Eu devo" ── */}
      {activeTab === "owe" && (
        <div id="couple-tab-owe" className="couple-tab-content">
          {iOweThem.length > 0 && (
            <section className="panel couple-section--owe">
              <div className="panel-header">
                <div>
                  <h3><span className="couple-direction-badge couple-badge--owe">↑</span> Pendentes — Você deve para {partnerName}</h3>
                  <p>{iOweThem.length} {iOweThem.length === 1 ? "pendência" : "pendências"} · {brl(iOweThem.reduce((s, e) => s + e.amountDue, 0))}</p>
                </div>
              </div>
              <EntryTable
                entries={iOweThem}
                currentUser={currentUser}
                partnerName={partnerName}
                myName={myName}
                actions={(entry) => (
                  <button type="button" className="couple-confirm-btn couple-pay-btn" onClick={() => onMarkAsPaid(entry)} disabled={loading}>
                    Paguei
                  </button>
                )}
              />
            </section>
          )}

          {paidIOweThem.length > 0 && (
            <section className="panel couple-section--waiting-me">
              <div className="panel-header">
                <div>
                  <h3><span className="couple-direction-badge couple-badge--waiting">⏳</span> Você pagou — aguardando confirmação</h3>
                  <p>{paidIOweThem.length} aguardando confirmação de {partnerName}</p>
                </div>
              </div>
              <EntryTable
                entries={paidIOweThem}
                currentUser={currentUser}
                partnerName={partnerName}
                myName={myName}
              />
            </section>
          )}

          {iOweThem.length === 0 && paidIOweThem.length === 0 && (
            <div className="panel"><div className="empty">Você não deve nada no momento.</div></div>
          )}
        </div>
      )}

      {/* ── Conteúdo da tab "Confirmados" ── */}
      {activeTab === "confirmed" && (
        <div id="couple-tab-confirmed" className="couple-tab-content">
          {confirmed.length > 0 ? (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h3><span className="couple-direction-badge couple-badge--done">✓</span> Confirmados</h3>
                  <p>Pagamentos finalizados neste mês</p>
                </div>
              </div>
              <EntryTable
                entries={confirmed}
                currentUser={currentUser}
                partnerName={partnerName}
                myName={myName}
              />
            </section>
          ) : (
            <div className="panel"><div className="empty">Nenhum lançamento confirmado neste mês.</div></div>
          )}
        </div>
      )}

      {pending.length === 0 && paid.length === 0 && confirmed.length === 0 && (
        <div className="panel">
          <div className="empty">Nenhum lançamento compartilhado neste mês. Use o checkbox "Dividir com parceiro(a)" ao cadastrar um lançamento.</div>
        </div>
      )}
    </div>
  );
}

// ─── lista de entradas (layout simplificado) ──────────────────────────────────

function EntryTable({ entries, currentUser, partnerName, myName, actions }) {
  return (
    <div className="couple-entries">
      {entries.map((entry) => (
        <div key={entry.id} className="couple-entry-card">
          <div className="couple-entry-row">
            <span className="couple-entry-desc">{entry.description}</span>
            <span className="couple-entry-amount-main">{brl(entry.amountDue)}</span>
          </div>
          <div className="couple-entry-row">
            <span className="couple-entry-meta">{dateBR(entry.date)}</span>
            <span className="couple-entry-detail">Metade de {brl(entry.totalAmount)}</span>
          </div>
          {actions && (
            <div className="couple-entry-row couple-entry-row--actions">
              <span />
              <span className="couple-entry-actions">{actions(entry)}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
