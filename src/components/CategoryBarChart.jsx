import { useMemo } from "react";
import { brl } from "../utils/formatters.js";
import { TRANSFER_CATEGORY_ID } from "../constants.js";

/**
 * CategoryBarChart
 * Gráfico de barras agrupado por categoria (top 5).
 *
 * Props:
 * - transactions: array de transações já filtradas pelo mês
 * - categoryMap: { [id]: nome }
 * - type: "expense" | "income" — filtra por tipo
 * - title: string
 * - subtitle: string
 * - titleId: string (para aria)
 * - barClass: string (opcional, ex: "bar--income")
 * - emptyMessage: string
 */
export default function CategoryBarChart({
  transactions,
  categoryMap,
  type,
  title,
  subtitle,
  titleId,
  barClass = "",
  emptyMessage = "Sem dados neste período."
}) {
  function resolveCat(id) { return categoryMap?.[id] || id; }

  const filtered = useMemo(
    () => transactions.filter((item) => item.type === type && item.category !== TRANSFER_CATEGORY_ID),
    [transactions, type]
  );

  const grouped = filtered.reduce((result, item) => {
    const name = resolveCat(item.category);
    result[name] = (result[name] || 0) + item.amount;
    return result;
  }, {});

  const groups = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const largest = groups[0]?.[1] || 1;

  return (
    <section className="panel spending" aria-labelledby={titleId}>
      <div className="panel-header">
        <div>
          <h3 id={titleId}>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="category-chart">
        {!groups.length && <div className="empty">{emptyMessage}</div>}
        {groups.map(([category, value]) => (
          <div className="category-row" key={category}>
            <span>{category}</span>
            <div className={`bar ${barClass}`}><span style={{ width: `${(value / largest) * 100}%` }} /></div>
            <strong>{brl(value)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
