import { useCallback, useMemo, useState } from "react";
import { brl, dateShort } from "../utils/formatters.js";
import useMediaQuery from "../hooks/useMediaQuery.js";
import AccountSelect from "./AccountSelect.jsx";

export default function TransactionsTable({ transactions, onEdit, categoryMap, accountMap, accounts = [], categories = [] }) {
  const [accountFilter, setAccountFilter] = useState("");
  const isMobile = useMediaQuery("(max-width: 760px)");

  const resolveCat = useCallback((id) => categoryMap?.[id] || id, [categoryMap]);
  const resolveAcc = useCallback((id) => accountMap?.[id] || id, [accountMap]);

  // Mapa id → { icon, color } para acesso rápido
  const categoryDetailMap = useMemo(() => {
    if (!categories.length) return {};
    return Object.fromEntries(categories.map((c) => [c.id, { icon: c.icon, color: c.color }]));
  }, [categories]);

  const activeAccounts = useMemo(() => accounts.filter((a) => a.active), [accounts]);

  const filtered = useMemo(() => {
    if (!accountFilter) return transactions;
    return transactions.filter((t) => t.account === accountFilter);
  }, [transactions, accountFilter]);

  return (
    <section className="panel transactions" id="transactions" aria-labelledby="transactions-title">
      <div className="panel-header transactions-header">
        <div>
          <h3 id="transactions-title">Lançamentos</h3>
          <p>{filtered.length} {filtered.length === 1 ? "registro" : "registros"} no período</p>
        </div>
        <div className="transactions-filters">
          <AccountSelect
            options={activeAccounts}
            value={accountFilter}
            onChange={setAccountFilter}
            allowAll
          />
        </div>
      </div>

      {isMobile ? (
        <ul className="transactions-list" role="list">
          {filtered.map((transaction) => {
            const catName = resolveCat(transaction.category);
            const catDetail = categoryDetailMap[transaction.category];
            return (
              <li
                key={transaction.id}
                className="transaction-card"
                onClick={() => onEdit(transaction)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onEdit(transaction); }}
              >
                <div className="transaction-card__top">
                  <span className="transaction-card__description">{transaction.description}</span>
                  <span className={`transaction-card__amount value ${transaction.type}`}>
                    {transaction.type === "income" ? "+" : "−"}{brl(transaction.amount)}
                  </span>
                </div>
                <div className="transaction-card__bottom">
                  <span>{dateShort(transaction.date)}</span>
                  <span className="transaction-card__sep">|</span>
                  <span className="transaction-card__category">
                    {catDetail?.icon && <span className="transaction-card__cat-icon" aria-hidden="true">{catDetail.icon}</span>}
                    {catName}
                  </span>
                  <span className="transaction-card__sep">|</span>
                  <span>{resolveAcc(transaction.account)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Descrição</th><th>Categoria</th><th>Data</th><th>Conta</th><th className="number">Valor</th></tr>
            </thead>
            <tbody>
              {filtered.map((transaction) => (
                <tr key={transaction.id} className="clickable-row" onClick={() => onEdit(transaction)}>
                  <td>{transaction.description}</td>
                  <td>{resolveCat(transaction.category)}</td>
                  <td>{dateShort(transaction.date)}</td>
                  <td>{resolveAcc(transaction.account)}</td>
                  <td className="number">
                    <span className={`value ${transaction.type}`}>
                      {transaction.type === "income" ? "+" : "−"}{brl(transaction.amount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!filtered.length && <div className="empty">Nenhum lançamento encontrado neste mês.</div>}
    </section>
  );
}
