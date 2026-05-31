import { useMemo, useState } from "react";
import { brl } from "../utils/formatters.js";
import { TRANSFER_CATEGORY_ID } from "../constants.js";

/**
 * SummaryCards
 * Cards de resumo financeiro.
 * Calcula tudo diretamente das transações (fonte da verdade).
 */
export default function SummaryCards({ transactions, allTransactions = [], month, accounts = [], onExpenseClick }) {
  const [showAccountModal, setShowAccountModal] = useState(false);

  const txnsForBalance = allTransactions.length > 0 ? allTransactions : transactions;

  // Receitas e despesas do mês (exclui transferências)
  const { income, expense } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const item of transactions) {
      if (item.category === TRANSFER_CATEGORY_ID) continue;
      if (item.type === "income") inc += item.amount;
      else exp += item.amount;
    }
    return { income: inc, expense: exp };
  }, [transactions]);

  // Saldo acumulado até o mês selecionado (exclui transferências)
  // Calculado diretamente das transações — fonte da verdade
  const accumulatedBalance = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const t of txnsForBalance) {
      if (t.category === TRANSFER_CATEGORY_ID) continue;
      const tMonth = t.date ? t.date.slice(0, 7) : "";
      if (!tMonth || tMonth > month) continue;
      if (t.type === "income") inc += t.amount;
      else exp += t.amount;
    }
    return inc - exp;
  }, [txnsForBalance, month]);

  // Saldo por conta (memoizado, recalcula só quando dados mudam)
  const balanceByAccount = useMemo(() => {
    const balances = {};
    for (const t of txnsForBalance) {
      const tMonth = t.date ? t.date.slice(0, 7) : "";
      if (!tMonth || tMonth > month) continue;
      if (!t.account) continue;
      if (!balances[t.account]) balances[t.account] = 0;
      if (t.type === "income") {
        balances[t.account] += t.amount;
      } else {
        balances[t.account] -= t.amount;
      }
    }
    return balances;
  }, [txnsForBalance, month]);

  const activeAccounts = useMemo(() => accounts.filter((a) => a.active), [accounts]);

  return (
    <>
      <section className="cards" id="summary-cards" aria-label="Resumo">
        <article
          className="metric balance clickable"
          onClick={() => setShowAccountModal(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setShowAccountModal(true)}
          title="Ver saldo por conta"
        >
          <span>Saldo total</span>
          <strong>{brl(accumulatedBalance)}</strong>
        </article>
        <article className="metric month-summary">
          <div className="month-summary-item">
            <span>Receitas</span>
            <strong className="income-value">{brl(income)}</strong>
          </div>
          <div className="month-summary-divider" />
          <div
            className="month-summary-item clickable"
            onClick={onExpenseClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onExpenseClick?.()}
            title="Ver despesas por categoria"
          >
            <span>Despesas</span>
            <strong className="expense-value">{brl(expense)}</strong>
          </div>
          <div className="month-summary-divider" />
          <div className="month-summary-item">
            <span>Saldo do mês</span>
            <strong className="balance-value">{brl(income - expense)}</strong>
          </div>
        </article>
      </section>

      {showAccountModal && (
        <div className="modal-overlay" onClick={() => setShowAccountModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Saldo por conta</h3>
            <ul className="account-balance-list">
              {activeAccounts.map((acc) => {
                const balance = balanceByAccount[acc.id] || 0;
                return (
                  <li key={acc.id} className="account-balance-item">
                    <span>{acc.name}</span>
                    <strong className={balance >= 0 ? "positive" : "negative"}>
                      {brl(balance)}
                    </strong>
                  </li>
                );
              })}
            </ul>
            <div className="modal-actions">
              <button
                className="primary-button"
                type="button"
                onClick={() => setShowAccountModal(false)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
