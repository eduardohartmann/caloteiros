import Brand from "./Brand.jsx";
import { DASHBOARD_ROUTES } from "../routes.js";

export default function Sidebar({ connected, route, spreadsheetId, onNavigate }) {
  function openSheet() {
    if (spreadsheetId) {
      window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`, "_blank", "noopener");
    }
  }

  return (
    <aside className="sidebar" id="dashboard-sidebar">
      <Brand />
      <nav className="menu" aria-label="Principal">
        {DASHBOARD_ROUTES.map((item) => (
          <button
            className={route === item.path ? "active" : ""}
            type="button"
            key={item.id}
            aria-current={route === item.path ? "page" : undefined}
            onClick={() => onNavigate(item.path)}
          >
            <span aria-hidden="true">{item.icon}</span>
            <span className="menu-label menu-label--full">{item.label}</span>
            <span className="menu-label menu-label--short">{item.shortLabel}</span>
          </button>
        ))}
      </nav>
      <section className="sync-card">
        <span className={`status-dot${connected ? " connected" : ""}`} />
        <strong>{connected ? "Google Sheets conectado" : "Demonstração"}</strong>
        <p>{connected ? "Dados sincronizados na sua planilha." : "Dados salvos apenas neste navegador."}</p>
        {connected && <button className="link-button" type="button" onClick={openSheet}>Abrir planilha</button>}
      </section>
    </aside>
  );
}
