/**
 * summaries.js
 * Utilitários para manter a aba "Resumos" sincronizada.
 *
 * Estrutura da aba Resumos (A→D):
 *   mes | tipo | categoria | total
 *
 * Exemplo:
 *   2026-05 | expense | Alimentação | 648.90
 *   2026-05 | income  | Salário     | 5600.00
 *
 * A aba é sempre reescrita para o mês afetado após cada save/delete.
 * Leitura histórica lê só esta aba (~120 linhas máx.), nunca Lancamentos inteiro.
 */

import { SUMMARIES_SHEET } from "../constants.js";

export const SUMMARIES_HEADER = ["mes", "tipo", "categoria", "total"];

// ─── conversão de linhas ──────────────────────────────────────────────────────

export function rowToSummary(row) {
  if (!row[0]) return null;
  return {
    month: row[0],
    type: row[1],
    category: row[2],
    total: Number(row[3]) || 0
  };
}

// ─── cálculo local ────────────────────────────────────────────────────────────

/**
 * Recalcula os totais de um mês a partir de uma lista de transações.
 * Retorna array de linhas prontas para gravar na planilha.
 *
 * @param {string} month  - "YYYY-MM"
 * @param {Array}  transactions - todas as transações do mês
 */
export function buildMonthSummaryRows(month, transactions) {
  const totals = {};   // "tipo|categoria" → total

  for (const t of transactions) {
    if (!t.date.startsWith(month)) continue;
    const key = `${t.type}|${t.category}`;
    totals[key] = (totals[key] || 0) + t.amount;
  }

  return Object.entries(totals).map(([key, total]) => {
    const [type, category] = key.split("|");
    return [month, type, category, Number(total.toFixed(2))];
  });
}

// ─── leitura ─────────────────────────────────────────────────────────────────

/**
 * Lê toda a aba Resumos (pequena, ~120 linhas).
 * Retorna array de objetos { month, type, category, total }.
 */
export async function loadSummaries(requestFn, spreadsheetId) {
  try {
    const result = await requestFn(
      `spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${SUMMARIES_SHEET}!A2:D`)}`
    );
    return (result.values || []).map(rowToSummary).filter(Boolean);
  } catch {
    // Aba não existe ainda — retorna vazio
    return [];
  }
}

// ─── escrita ──────────────────────────────────────────────────────────────────

/**
 * Recalcula e persiste os resumos do mês afetado.
 *
 * Estratégia:
 *   1. Lê todas as linhas atuais de Resumos
 *   2. Remove as linhas do mês afetado
 *   3. Adiciona as novas linhas calculadas
 *   4. Reescreve a aba inteira (sempre pequena)
 *
 * @param {Function} requestFn      - função request já com token vinculado
 * @param {Function} updateValuesFn - função updateValues já com token vinculado
 * @param {string}   spreadsheetId
 * @param {string}   month          - "YYYY-MM" do mês afetado
 * @param {Array}    monthTransactions - transações do mês (já filtradas)
 */
export async function syncMonthSummaries(
  requestFn,
  updateValuesFn,
  spreadsheetId,
  month,
  monthTransactions
) {
  // lê resumos existentes
  const existing = await loadSummaries(requestFn, spreadsheetId);

  // remove linhas do mês afetado e reconstrói
  const otherMonths = existing.filter((s) => s.month !== month);
  const newRows = buildMonthSummaryRows(month, monthTransactions);

  // monta todas as linhas ordenadas por mês desc
  const allRows = [
    ...otherMonths.map((s) => [s.month, s.type, s.category, s.total]),
    ...newRows
  ].sort((a, b) => b[0].localeCompare(a[0]));   // mais recente primeiro

  // reescreve a aba inteira (cabeçalho + dados)
  // usa CLEAR + UPDATE para não deixar linhas órfãs
  await requestFn(
    `spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${SUMMARIES_SHEET}`)}:clear`,
    { method: "POST", body: JSON.stringify({}) }
  );

  if (allRows.length > 0) {
    await updateValuesFn(
      spreadsheetId,
      `${SUMMARIES_SHEET}!A1:D${allRows.length + 1}`,
      [SUMMARIES_HEADER, ...allRows]
    );
  } else {
    // sem dados ainda, grava só o cabeçalho
    await updateValuesFn(
      spreadsheetId,
      `${SUMMARIES_SHEET}!A1:D1`,
      [SUMMARIES_HEADER]
    );
  }
}

// ─── agregações para a UI ─────────────────────────────────────────────────────

/**
 * Filtra resumos por mês.
 */
export function summariesForMonth(summaries, month) {
  return summaries.filter((s) => s.month === month);
}

/**
 * Retorna totais anuais agrupados por tipo.
 * { income: number, expense: number }
 */
export function annualTotals(summaries, year) {
  return summaries
    .filter((s) => s.month.startsWith(year))
    .reduce(
      (acc, s) => {
        acc[s.type] = (acc[s.type] || 0) + s.total;
        return acc;
      },
      { income: 0, expense: 0 }
    );
}

/**
 * Retorna totais por categoria para um período (array de meses ou prefixo de ano).
 * Útil para gráfico histórico de categorias.
 *
 * @param {Array}  summaries
 * @param {string} prefix - "2026" (ano) ou "2026-05" (mês exato)
 */
export function totalsByCategory(summaries, prefix, type = "expense") {
  const result = {};
  for (const s of summaries) {
    if (!s.month.startsWith(prefix) || s.type !== type) continue;
    result[s.category] = (result[s.category] || 0) + s.total;
  }
  return Object.entries(result)
    .sort((a, b) => b[1] - a[1])
    .map(([category, total]) => ({ category, total }));
}

/**
 * Retorna evolução mensal de receitas e despesas.
 * Útil para gráfico de linha histórico.
 *
 * @returns Array<{ month, income, expense, balance }>
 */
export function monthlyEvolution(summaries) {
  const byMonth = {};
  for (const s of summaries) {
    if (!byMonth[s.month]) byMonth[s.month] = { income: 0, expense: 0 };
    byMonth[s.month][s.type] = (byMonth[s.month][s.type] || 0) + s.total;
  }
  return Object.entries(byMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, totals]) => ({
      month,
      income: totals.income || 0,
      expense: totals.expense || 0,
      balance: (totals.income || 0) - (totals.expense || 0)
    }));
}
