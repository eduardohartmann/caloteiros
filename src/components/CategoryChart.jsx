import { brl } from "../utils/formatters.js";
import { TRANSFER_CATEGORY_ID } from "../constants.js";

export default function CategoryChart({ transactions, categoryMap }) {
  function resolveCat(id) { return categoryMap?.[id] || id; }

  const grouped = transactions
    .filter((item) => item.type === "expense" && item.category !== TRANSFER_CATEGORY_ID)
    .reduce((result, item) => {
      const name = resolveCat(item.category);
      result[name] = (result[name] || 0) + item.amount;
      return result;
    }, {});
  const groups = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const largest = groups[0]?.[1] || 1;

  return (
    <section className="panel spending" id="spending-panel" aria-labelledby="spending-title">
      <div className="panel-header">
        <div>
          <h3 id="spending-title">Despesas por categoria</h3>
          <p>Onde seu dinheiro foi usado</p>
        </div>
      </div>
      <div className="category-chart">
        {!groups.length && <div className="empty">Sem despesas neste período.</div>}
        {groups.map(([category, value]) => (
          <div className="category-row" key={category}>
            <span>{category}</span>
            <div className="bar"><span style={{ width: `${(value / largest) * 100}%` }} /></div>
            <strong>{brl(value)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
