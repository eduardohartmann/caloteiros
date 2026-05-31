import { useMemo } from "react";
import { brl, dateShort } from "../utils/formatters.js";
import { TRANSFER_CATEGORY_ID } from "../constants.js";

export default function IncomePage({ transactions, categoryMap, onEdit }) {
  function resolveCat(id) { return categoryMap?.[id] || id; }

  const incomeTransactions = useMemo(
    () => transactions.filter((item) => item.type === "income" && item.category !== TRANSFER_CATEGORY_ID),
    [transactions]
  );

  const grouped = incomeTransactions.reduce((result, item) => {
    const name = resolveCat(item.category);
    result[name] = (result[name] || 0) + item.amount;
    return result;
  }, {});
  const groups = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const largest = groups[0]?.[1] || 1;

  return (
    <>
      <section className="panel spending" id="income-panel" aria-labelledby="income-title">
        <div className="panel-header">
          <div>
            <h3 id="income-title">Receitas por categoria</h3>
            <p>De onde veio seu dinheiro</p>
          </div>
        </div>
        <div className="category-chart">
          {!groups.length && <div className="empty">Sem receitas neste período.</div>}
          {groups.map(([category, value]) => (
            <div className="category-row" key={category}>
              <span>{category}</span>
              <div className="bar bar--income"><span style={{ width: `${(value / largest) * 100}%` }} /></div>
              <strong>{brl(value)}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="panel transactions" aria-labelledby="income-list-title">
        <div className="panel-header">
          <div>
            <h3 id="income-list-title">Lançamentos de receita</h3>
            <p>{incomeTransactions.length} {incomeTransactions.length === 1 ? "registro" : "registros"}</p>
          </div>
        </div>
        <ul className="transactions-list" role="list">
          {incomeTransactions.map((transaction) => (
            <li
              key={transaction.id}
              className="transaction-card"
              onClick={() => onEdit?.(transaction)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onEdit?.(transaction); }}
            >
              <div className="transaction-card__top">
                <span className="transaction-card__description">{transaction.description}</span>
                <span className="transaction-card__amount value income">
                  +{brl(transaction.amount)}
                </span>
              </div>
              <div className="transaction-card__bottom">
                <span>{dateShort(transaction.date)}</span>
                <span className="transaction-card__sep">|</span>
                <span className="transaction-card__category">{resolveCat(transaction.category)}</span>
              </div>
            </li>
          ))}
        </ul>
        {!incomeTransactions.length && <div className="empty">Nenhuma receita neste mês.</div>}
      </section>
    </>
  );
}
