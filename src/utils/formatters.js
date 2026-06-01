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
 * Filtra entrada do campo de valor, permitindo apenas dígitos e um separador decimal.
 * Aceita vírgula ou ponto como separador decimal (padrão BR e teclados numéricos).
 * Não aplica máscara de milhar durante a digitação para evitar conflitos.
 * Limita a 2 casas decimais.
 *
 * Exemplos:
 *   "16000"   → "16000"
 *   "16000,"  → "16000,"
 *   "160,50"  → "160,50"
 *   "abc123"  → "123"
 *   "10.5"    → "10,5"
 */
export function maskCurrency(raw) {
  // Converte ponto em vírgula (teclado decimal usa ponto)
  let value = raw.replace(".", ",");

  // Remove tudo que não é dígito ou vírgula
  value = value.replace(/[^\d,]/g, "");

  // Se ficou vazio, retorna vazio
  if (!value) return "";

  // Permite apenas uma vírgula (mantém a primeira)
  const parts = value.split(",");
  if (parts.length > 2) {
    value = parts[0] + "," + parts.slice(1).join("");
  }

  // Limita decimal a 2 dígitos
  const [intPart, decPart] = value.split(",");

  if (decPart !== undefined) {
    return `${intPart},${decPart.slice(0, 2)}`;
  }

  return intPart;
}
