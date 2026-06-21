import { brl, dateShort } from "../utils/formatters.js";

/**
 * TransactionCardList
 * Lista de transações no formato card (mobile-friendly).
 *
 * Props:
 * - transactions: array de transações
 * - onEdit: (transaction) => void
 * - resolveCat: (id) => string — resolve ID de categoria para nome
 * - resolveAcc: (id) => string (opcional) — resolve ID de conta para nome
 * - categoryDetailMap: { [id]: { icon, color } } (opcional) — ícones/cores das categorias
 * - type: "expense" | "income" | "mixed" — define prefixo e classe do valor
 */
export default function TransactionCardList({
  transactions,
  onEdit,
  resolveCat,
  resolveAcc,
  categoryDetailMap = {},
  type = "mixed"
}) {
  function getPrefix(transaction) {
    if (type === "expense") return "−";
    if (type === "income") return "+";
    return transaction.type === "income" ? "+" : "−";
  }

  function getValueClass(transaction) {
    if (type === "expense") return "value expense";
    if (type === "income") return "value income";
    return `value ${transaction.type}`;
  }

  return (
    <ul className="transactions-list" role="list">
      {transactions.map((transaction) => {
        const catName = resolveCat(transaction.category);
        const catDetail = categoryDetailMap[transaction.category];

        return (
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
              <span className={`transaction-card__amount ${getValueClass(transaction)}`}>
                {getPrefix(transaction)}{brl(transaction.amount)}
              </span>
            </div>
            <div className="transaction-card__bottom">
              <span>{dateShort(transaction.date)}</span>
              <span className="transaction-card__sep">|</span>
              <span className="transaction-card__category">
                {catDetail?.icon && <span className="transaction-card__cat-icon" aria-hidden="true">{catDetail.icon}</span>}
                {catName}
              </span>
              {resolveAcc && (
                <>
                  <span className="transaction-card__sep">|</span>
                  <span>{resolveAcc(transaction.account)}</span>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
