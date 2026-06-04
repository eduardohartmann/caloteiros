import { useMemo } from "react";
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

  // Resumo
  const totalDue = pending.reduce((s, e) => s + e.amountDue, 0);
  const totalPaid = paid.reduce((s, e) => s + e.amountDue, 0);
  const totalConfirmed = confirmed.reduce((s, e) => s + e.amountDue, 0);

  function isCreator(entry) {
    return entry.createdBy === currentUser;
  }

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

      {/* Cards de resumo */}
      <div className="couple-summary">
        <article className="metric expense">
          <span>Pendente</span>
          <strong>{brl(totalDue)}</strong>
          <small>{pending.length} {pending.length === 1 ? "lançamento" : "lançamentos"}</small>
        </article>
        <article className="metric" style={{ borderColor: "var(--orange)" }}>
          <span>Aguardando confirmação</span>
          <strong style={{ color: "var(--orange)" }}>{brl(totalPaid)}</strong>
          <small>{paid.length} marcados como pagos</small>
        </article>
        <article className="metric balance">
          <span>Confirmados</span>
          <strong>{brl(totalConfirmed)}</strong>
          <small>{confirmed.length} finalizados</small>
        </article>
      </div>

      {/* Pendentes */}
      {pending.length > 0 && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Pendentes</h3>
              <p>{partnerName} deve pagar</p>
            </div>
          </div>
          <EntryTable
            entries={pending}
            actions={(entry) => (
              <>
                {!isCreator(entry) && (
                  <button type="button" className="couple-confirm-btn" onClick={() => onMarkAsPaid(entry)} disabled={loading}>
                    Paguei
                  </button>
                )}
                {isCreator(entry) && (
                  <button type="button" className="ghost-button settings-delete-btn" onClick={() => onDelete(entry)} disabled={loading}>
                    Excluir
                  </button>
                )}
              </>
            )}
          />
        </section>
      )}

      {/* Aguardando confirmação */}
      {paid.length > 0 && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Aguardando confirmação</h3>
              <p>Parceiro marcou que pagou — confirme o recebimento</p>
            </div>
          </div>
          <EntryTable
            entries={paid}
            actions={(entry) => (
              <>
                {isCreator(entry) && (
                  <button type="button" className="couple-confirm-btn" onClick={() => onConfirmPayment(entry)} disabled={loading}>
                    Confirmar recebimento
                  </button>
                )}
                {isCreator(entry) && (
                  <button type="button" className="ghost-button settings-delete-btn" onClick={() => onDelete(entry)} disabled={loading}>
                    Excluir
                  </button>
                )}
              </>
            )}
          />
        </section>
      )}

      {/* Confirmados */}
      {confirmed.length > 0 && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Confirmados</h3>
              <p>Pagamentos finalizados neste mês</p>
            </div>
          </div>
          <EntryTable entries={confirmed} />
        </section>
      )}

      {pending.length === 0 && paid.length === 0 && confirmed.length === 0 && (
        <div className="panel">
          <div className="empty">Nenhum lançamento compartilhado neste mês. Use o checkbox "Dividir com parceiro(a)" ao cadastrar um lançamento.</div>
        </div>
      )}
    </div>
  );
}

// ─── lista de entradas (layout em 3 linhas) ──────────────────────────────────

function EntryTable({ entries, actions }) {
  return (
    <div className="couple-entries">
      {entries.map((entry) => (
        <div key={entry.id} className="couple-entry-card">
          <div className="couple-entry-line1">
            <span className="couple-entry-desc">{entry.description}</span>
          </div>
          <div className="couple-entry-line2">
            <span className="couple-entry-meta">{dateBR(entry.date)} · {entry.createdBy}</span>
          </div>
          <div className="couple-entry-line3">
            <span className="couple-entry-values">
              {brl(entry.totalAmount)} <span className="couple-entry-arrow">→</span> <span className="couple-entry-due">{brl(entry.amountDue)}</span>
            </span>
            {actions && <span className="couple-entry-actions">{actions(entry)}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
