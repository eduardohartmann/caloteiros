/**
 * Formata "2026-05" para "Maio/2026"
 */
function formatMonth(month) {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1);
  const monthName = date.toLocaleDateString("pt-BR", { month: "long" });
  return `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)}/${year}`;
}

function prevMonth(month) {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 2);   // -1 para index, -1 para mês anterior
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(month) {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m);   // m já é o próximo (0-indexed + 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function DashboardHeader({ name, title, month, onMonthChange }) {
  return (
    <header className="topbar" id="dashboard-header">
      <div>
        <p className="eyebrow">Olá, <span>{name}</span></p>
        <h2>{title}</h2>
      </div>
      <div className="topbar-actions">
        <div className="month-nav">
          <button type="button" className="month-nav-btn" onClick={() => onMonthChange(prevMonth(month))} aria-label="Mês anterior">
            ◀
          </button>
          <span className="month-nav-label">{formatMonth(month)}</span>
          <button type="button" className="month-nav-btn" onClick={() => onMonthChange(nextMonth(month))} aria-label="Próximo mês">
            ▶
          </button>
        </div>
      </div>
    </header>
  );
}
