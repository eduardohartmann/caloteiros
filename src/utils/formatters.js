export function today() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function monthNow() {
  return today().slice(0, 7);
}

export function newId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export function brl(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function dateBR(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

export function dateShort(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function amountFromInput(value) {
  const normalized = value.trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  return Number(normalized);
}

/**
 * Converte um valor bruto da planilha (string ou número) em número.
 * Suporta formato brasileiro (1.234,56) e numérico padrão.
 * @param {string|number|null|undefined} raw - Valor bruto da planilha.
 * @returns {number}
 */
export function parseAmount(raw) {
  if (raw == null || raw === "") return 0;
  if (typeof raw === "string" && raw.includes(",")) {
    return Number(raw.replace(/\./g, "").replace(",", ".")) || 0;
  }
  return Number(raw) || 0;
}

/**
 * Aplica máscara monetária estilo Nubank.
 * O usuário digita apenas números e os 2 últimos dígitos são sempre centavos.
 * A vírgula decimal é inserida automaticamente.
 *
 * Exemplos:
 *   "1"       → "0,01"
 *   "15"      → "0,15"
 *   "150"     → "1,50"
 *   "1500"    → "15,00"
 *   "123456"  → "1.234,56"
 */
export function maskCurrency(raw) {
  // Remove tudo que não é dígito
  const digits = raw.replace(/\D/g, "");

  // Se ficou vazio, retorna vazio
  if (!digits) return "";

  // Converte para centavos (inteiro)
  const cents = parseInt(digits, 10);
  if (cents === 0) return "0,00";

  // Formata com 2 casas decimais
  const formatted = (cents / 100).toFixed(2);

  // Separa inteiro e decimal
  const [intPart, decPart] = formatted.split(".");

  // Aplica separador de milhar
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `${withThousands},${decPart}`;
}
