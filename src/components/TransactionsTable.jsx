import { useCallback, useMemo, useState } from "react";
import { brl, dateShort } from "../utils/formatters.js";
import useMediaQuery from "../hooks/useMediaQuery.js";
import AccountSelect from "./AccountSelect.jsx";
import TransactionCardList from "./TransactionCardList.jsx";
import EmptyState from "./EmptyState.jsx";
import PanelHeader from "./PanelHeader.jsx";

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
      <PanelHeader
        title="Lançamentos"
        subtitle={`${filtered.length} ${filtered.length === 1 ? "registro" : "registros"} no período`}
        titleId="transactions-title"
        actions={
          <div className="transactions-filters">
            <AccountSelect
              options={activeAccounts}
              value={accountFilter}
              onChange={setAccountFilter}
              allowAll
            />
          </div>
        }
      />

      {isMobile ? (
        <TransactionCardList
          transactions={filtered}
          onEdit={onEdit}
          resolveCat={resolveCat}
          resolveAcc={resolveAcc}
          categoryDetailMap={categoryDetailMap}
          type="mixed"
        />
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

      {!filtered.length && <EmptyState message="Nenhum lançamento encontrado neste mês." />}
    </section>
  );
}
