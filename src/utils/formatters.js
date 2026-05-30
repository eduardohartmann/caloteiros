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
 * Aplica máscara monetária brasileira ao valor digitado.
 * - Separador de milhar: .
 * - Separador decimal: ,
 * - Máximo 2 casas decimais
 *
 * Exemplos:
 *   "1234"    → "1.234"
 *   "1234,"   → "1.234,"
 *   "1234,5"  → "1.234,5"
 *   "1234,56" → "1.234,56"
 *   "0,99"    → "0,99"
 */
export function maskCurrency(raw) {
  // Remove tudo que não é dígito ou vírgula
  let value = raw.replace(/[^\d,]/g, "");

  // Se ficou vazio, retorna vazio
  if (!value) return "";

  // Permite apenas uma vírgula
  const parts = value.split(",");
  if (parts.length > 2) {
    value = parts[0] + "," + parts.slice(1).join("");
  }

  // Separa inteiro e decimal
  const [intPart, decPart] = value.split(",");

  // Remove zeros à esquerda (exceto "0" sozinho ou vazio antes da vírgula)
  const cleanInt = intPart.replace(/^0+(?=\d)/, "") || (decPart !== undefined ? "0" : "");

  // Se não tem parte inteira e não tem vírgula, retorna vazio
  if (!cleanInt && decPart === undefined) return "";

  // Aplica separador de milhar
  const withThousands = cleanInt.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  // Limita decimal a 2 dígitos
  if (decPart !== undefined) {
    return `${withThousands},${decPart.slice(0, 2)}`;
  }

  return withThousands;
}
