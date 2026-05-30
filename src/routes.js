export const ROUTES = {
  welcome: "/",
  overview: "/visao-geral",
  categories: "/categorias",
  newTransaction: "/novo-lancamento",
  couple: "/casal",
  settings: "/configuracoes"
};

export const DASHBOARD_ROUTES = [
  { id: "overview",        path: ROUTES.overview,        label: "Visão geral",            shortLabel: "Início",   icon: "▦" },
  { id: "categories",      path: ROUTES.categories,      label: "Despesas por categoria", shortLabel: "Categorias", icon: "◫" },
  { id: "newTransaction",  path: ROUTES.newTransaction,  label: "Novo lançamento",        shortLabel: "Novo",     icon: "＋" },
  { id: "couple",          path: ROUTES.couple,          label: "Casal",                  shortLabel: "Casal",    icon: "♡" },
  { id: "settings",        path: ROUTES.settings,        label: "Configurações",          shortLabel: "Config",   icon: "⚙" }
];

export function currentRoute() {
  const route = window.location.hash.replace(/^#/, "") || ROUTES.welcome;
  return Object.values(ROUTES).includes(route) ? route : ROUTES.welcome;
}

export function navigate(path, replace = false) {
  const url = path === ROUTES.welcome
    ? `${window.location.pathname}${window.location.search}`
    : `#${path}`;
  window.history[replace ? "replaceState" : "pushState"]({}, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
