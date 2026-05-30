/**
 * importTransactions.js
 * Lógica de importação de lançamentos a partir de JSON exportado da planilha.
 *
 * Formato esperado do JSON:
 * [
 *   { "date": "01/09/2018", "description": "Salario", "amount": 323.13, "category": "Salário", "account": "Conta Corrente" },
 *   ...
 * ]
 *
 * Transferências: duas linhas consecutivas com categoria "Transferência",
 * mesma data, mesma descrição, valores opostos (negativo → positivo).
 */

import { SHEET_NAME, TRANSFER_CATEGORY_ID } from "../constants.js";
import { request, updateValues } from "./sheetsApi.js";
import { newId } from "../utils/formatters.js";
import { flattenCategoryTree } from "./settingsSheets.js";

// ─── parsing ──────────────────────────────────────────────────────────────────

/**
 * Converte data dd/mm/yyyy para yyyy-mm-dd
 */
function parseDate(dateStr) {
  const [day, month, year] = dateStr.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/**
 * Analisa o JSON importado e separa em lançamentos normais e transferências.
 * Retorna { entries, transfers, unknownCategories, unknownAccounts }
 */
export function analyzeImportData(rawData, categories, accounts) {
  const flatCategories = flattenCategoryTree(categories, true);
  const categoryByName = new Map();
  for (const cat of flatCategories) {
    categoryByName.set(cat.name.toLocaleLowerCase("pt-BR"), cat.id);
  }

  const accountByName = new Map();
  for (const acc of accounts) {
    accountByName.set(acc.name.toLocaleLowerCase("pt-BR"), acc.id);
  }

  const entries = [];
  const transfers = [];
  const unknownCategories = new Set();
  const unknownAccounts = new Set();

  let i = 0;
  while (i < rawData.length) {
    const row = rawData[i];
    const categoryName = (row.category || "").trim();
    const isTransferCategory = categoryName.toLocaleLowerCase("pt-BR") === "transferência";

    // Detecta par de transferência
    if (isTransferCategory && i + 1 < rawData.length) {
      const next = rawData[i + 1];
      const nextCategoryName = (next.category || "").trim();
      const nextIsTransfer = nextCategoryName.toLocaleLowerCase("pt-BR") === "transferência";

      if (
        nextIsTransfer &&
        row.date === next.date &&
        row.description === next.description &&
        row.amount < 0 &&
        next.amount > 0
      ) {
        // Par de transferência encontrado
        const sourceAccount = (row.account || "").trim();
        const destAccount = (next.account || "").trim();

        if (!accountByName.has(sourceAccount.toLocaleLowerCase("pt-BR"))) {
          unknownAccounts.add(sourceAccount);
        }
        if (!accountByName.has(destAccount.toLocaleLowerCase("pt-BR"))) {
          unknownAccounts.add(destAccount);
        }

        transfers.push({
          date: row.date,
          description: row.description,
          amount: Math.abs(row.amount),
          sourceAccount,
          destAccount
        });

        i += 2;
        continue;
      }
    }

    // Lançamento normal
    const accountName = (row.account || "").trim();
    const amount = row.amount;

    if (!isTransferCategory && !categoryByName.has(categoryName.toLocaleLowerCase("pt-BR"))) {
      unknownCategories.add(categoryName);
    }
    if (!accountByName.has(accountName.toLocaleLowerCase("pt-BR"))) {
      unknownAccounts.add(accountName);
    }

    entries.push({
      date: row.date,
      description: (row.description || "").trim(),
      amount,
      category: categoryName,
      account: accountName
    });

    i++;
  }

  return {
    entries,
    transfers,
    unknownCategories: Array.from(unknownCategories).filter(Boolean),
    unknownAccounts: Array.from(unknownAccounts).filter(Boolean)
  };
}

// ─── resolução de mapeamento ──────────────────────────────────────────────────

/**
 * Constrói o mapa final de categorias (nome → id) após o usuário resolver as desconhecidas.
 * newCategories: array de { name, id } criadas pelo usuário
 */
export function buildCategoryMap(categories, newCategories = []) {
  const flatCategories = flattenCategoryTree(categories, true);
  const map = new Map();
  for (const cat of flatCategories) {
    map.set(cat.name.toLocaleLowerCase("pt-BR"), cat.id);
  }
  for (const cat of newCategories) {
    map.set(cat.name.toLocaleLowerCase("pt-BR"), cat.id);
  }
  return map;
}

/**
 * Constrói o mapa final de contas (nome → id) após o usuário resolver as desconhecidas.
 */
export function buildAccountMap(accounts, newAccounts = []) {
  const map = new Map();
  for (const acc of accounts) {
    map.set(acc.name.toLocaleLowerCase("pt-BR"), acc.id);
  }
  for (const acc of newAccounts) {
    map.set(acc.name.toLocaleLowerCase("pt-BR"), acc.id);
  }
  return map;
}

// ─── geração de linhas para a planilha ────────────────────────────────────────

function toRow(transaction) {
  return [
    transaction.id,
    transaction.date,
    transaction.type,
    transaction.description,
    transaction.category,
    transaction.account,
    String(transaction.amount),
    "Confirmado",
    transaction.createdAt,
    new Date().toISOString(),
    "",
    transaction.linkedId || ""
  ];
}

/**
 * Converte os lançamentos analisados em linhas prontas para a planilha.
 */
export function buildRows(entries, transfers, categoryMap, accountMap) {
  const rows = [];
  const now = new Date().toISOString();

  // Lançamentos normais
  for (const entry of entries) {
    const date = parseDate(entry.date);
    const type = entry.amount >= 0 ? "income" : "expense";
    const categoryId = categoryMap.get(entry.category.toLocaleLowerCase("pt-BR")) || "";
    const accountId = accountMap.get(entry.account.toLocaleLowerCase("pt-BR")) || "";

    rows.push(toRow({
      id: newId(),
      date,
      type,
      description: entry.description,
      category: categoryId,
      account: accountId,
      amount: Math.abs(entry.amount),
      createdAt: now,
      linkedId: ""
    }));
  }

  // Transferências (par vinculado)
  for (const transfer of transfers) {
    const date = parseDate(transfer.date);
    const outgoingId = newId();
    const incomingId = newId();
    const sourceAccountId = accountMap.get(transfer.sourceAccount.toLocaleLowerCase("pt-BR")) || "";
    const destAccountId = accountMap.get(transfer.destAccount.toLocaleLowerCase("pt-BR")) || "";

    // Saída
    rows.push(toRow({
      id: outgoingId,
      date,
      type: "expense",
      description: transfer.description,
      category: TRANSFER_CATEGORY_ID,
      account: sourceAccountId,
      amount: transfer.amount,
      createdAt: now,
      linkedId: incomingId
    }));

    // Entrada
    rows.push(toRow({
      id: incomingId,
      date,
      type: "income",
      description: transfer.description,
      category: TRANSFER_CATEGORY_ID,
      account: destAccountId,
      amount: transfer.amount,
      createdAt: now,
      linkedId: outgoingId
    }));
  }

  // Ordena todas as linhas por data para manter a sequência cronológica
  rows.sort((a, b) => a[1].localeCompare(b[1]));

  return rows;
}

// ─── importação em batch ──────────────────────────────────────────────────────

const BATCH_SIZE = 1000;
const TRANSACTIONS_HEADER = ["id", "data", "tipo", "descricao", "categoria", "conta", "valor", "status", "criadoEm", "atualizadoEm", "compartilhado", "linkedId"];

/**
 * Garante que a aba Lancamentos existe com o cabeçalho correto.
 * Se não existir, cria a aba e grava o cabeçalho.
 */
async function ensureRequiredSheets(token, spreadsheetId) {
  const metadata = await request(token, `spreadsheets/${spreadsheetId}?fields=sheets.properties`);
  const existingSheets = metadata.sheets.map((s) => s.properties.title);

  if (!existingSheets.includes(SHEET_NAME)) {
    await request(token, `spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title: SHEET_NAME } } }]
      })
    });
    await updateValues(token, spreadsheetId, `${SHEET_NAME}!A1:L1`, [TRANSACTIONS_HEADER]);
  }
}

/**
 * Importa as linhas para a planilha em batches.
 * onProgress(current, total) é chamado a cada batch.
 */
export async function importRows(token, spreadsheetId, rows, onProgress) {
  // Garante que as abas necessárias existem antes de importar
  await ensureRequiredSheets(token, spreadsheetId);

  const total = rows.length;
  let imported = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    await request(
      token,
      `spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${SHEET_NAME}!A:L`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      { method: "POST", body: JSON.stringify({ values: batch }) }
    );

    imported += batch.length;
    if (onProgress) onProgress(imported, total);

    // Pequeno delay entre batches para não estourar rate limit
    if (i + BATCH_SIZE < rows.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return { imported: total, months: new Set(rows.map((r) => r[1].slice(0, 7))).size };
}
