export const SHEET_NAME = "Lancamentos";
export const SETTINGS_SHEET = "Configuracoes";
export const CATEGORIES_SHEET = "Categorias";
export const ACCOUNTS_SHEET = "Contas";
export const COUPLE_SHEET_NAME = "Divisao";

// Prefixo de todas as chaves de localStorage. No preview (/caloteiros/dev/)
// vira "caloteiros.dev." para isolar o estado do app de produção.
const BASE = (typeof import.meta !== "undefined" && import.meta.env?.BASE_URL) || "/";
const STORAGE_PREFIX = BASE.includes("/dev/") ? "caloteiros.dev." : "caloteiros.";

/** Monta uma chave de localStorage com o prefixo do ambiente atual. */
export function storageKey(name) {
  return STORAGE_PREFIX + name;
}

export const STORAGE = {
  sheetId: storageKey("spreadsheetId"),
  folderId: storageKey("folderId"),
  coupleSheetId: storageKey("coupleSpreadsheetId"),
  coupleUserKey: storageKey("coupleUserKey"),
  userName: storageKey("userName"),
  userEmail: storageKey("userEmail"),
  token: storageKey("token"),
  tokenExpiry: storageKey("tokenExpiry")
};

export const GOOGLE_SCOPE =
  "openid email profile " +
  "https://www.googleapis.com/auth/drive.file " +
  "https://www.googleapis.com/auth/spreadsheets";

// Categorias padrão usadas como seed na criação da planilha.
export const TRANSFER_CATEGORY_ID = "cat-transferencia";

export const DEFAULT_CATEGORIES = [
  { id: TRANSFER_CATEGORY_ID, parentId: "",             name: "Transferência", icon: "🔄", color: "#6C7A89", active: true },
  { id: "cat-moradia",      parentId: "",             name: "Moradia",       icon: "🏠", color: "#4A90D9", active: true },
  { id: "cat-aluguel",      parentId: "cat-moradia",  name: "Aluguel",       icon: "🔑", color: "#4A90D9", active: true },
  { id: "cat-condominio",   parentId: "cat-moradia",  name: "Condomínio",    icon: "🏢", color: "#4A90D9", active: true },
  { id: "cat-alimentacao",  parentId: "",             name: "Alimentação",   icon: "🍔", color: "#E8A838", active: true },
  { id: "cat-mercado",      parentId: "cat-alimentacao", name: "Supermercado", icon: "🛒", color: "#E8A838", active: true },
  { id: "cat-restaurante",  parentId: "cat-alimentacao", name: "Restaurante",  icon: "🍽️", color: "#E8A838", active: true },
  { id: "cat-transporte",   parentId: "",             name: "Transporte",    icon: "🚗", color: "#7B68EE", active: true },
  { id: "cat-combustivel",  parentId: "cat-transporte", name: "Combustível",  icon: "⛽", color: "#7B68EE", active: true },
  { id: "cat-saude",        parentId: "",             name: "Saúde",         icon: "❤️", color: "#E05C5C", active: true },
  { id: "cat-lazer",        parentId: "",             name: "Lazer",         icon: "🎉", color: "#50C878", active: true },
  { id: "cat-educacao",     parentId: "",             name: "Educação",      icon: "📚", color: "#FF8C00", active: true },
  { id: "cat-salario",      parentId: "",             name: "Salário",       icon: "💰", color: "#2ECC71", active: true },
  { id: "cat-freelance",    parentId: "",             name: "Freelance",     icon: "💻", color: "#2ECC71", active: true },
  { id: "cat-outros",       parentId: "",             name: "Outros",        icon: "📦", color: "#95A5A6", active: true },
];

export const DEFAULT_ACCOUNTS = [
  { id: "acc-corrente",  name: "Conta corrente",   active: true },
  { id: "acc-cartao",    name: "Cartão de crédito", active: true },
  { id: "acc-dinheiro",  name: "Dinheiro",          active: true },
  { id: "acc-invest",    name: "Investimentos",     active: true },
];
