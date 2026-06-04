import { SETTINGS_SHEET, SHEET_NAME, STORAGE, CATEGORIES_SHEET, ACCOUNTS_SHEET } from "../constants.js";
import { ensureAppFolder, findAppFolder, findFile, SPREADSHEET_MIME } from "./driveUtils.js";
import { request, updateValues, makeRequestFn, makeUpdateFn, createSheetsClient } from "./sheetsApi.js";
import { migrateIfNeeded } from "./migrations.js";
import { parseAmount } from "../utils/formatters.js";
import {
  CATEGORIES_HEADER, ACCOUNTS_HEADER,
  loadCategories, loadAccounts,
  seedCategoriesAndAccounts,
  saveCategory, toggleCategory, deleteCategory,
  saveAccount, toggleAccount, deleteAccount,
  importCategories, importAccounts
} from "./settingsSheets.js";

// ─── conversão de linhas ──────────────────────────────────────────────────────

/** @typedef {import("../types.js").Transaction} Transaction */
/** @typedef {import("../types.js").SpreadsheetData} SpreadsheetData */
/** @typedef {import("../types.js").Suggestion} Suggestion */

/**
 * Converte uma linha da planilha em um objeto Transaction.
 * @param {string[]} row - Array de valores da linha.
 * @param {number} index - Índice da linha (0-based, excluindo cabeçalho).
 * @returns {Transaction|null}
 */

export function fromRow(row, index) {
  if (!row[0]) return null;
  return {
    id: row[0],
    date: row[1],
    type: row[2],
    description: row[3],
    category: row[4],
    account: row[5],
    amount: parseAmount(row[6]),
    createdAt: row[8] || "",
    shared: row[10] === "true",
    linkedId: row[11] || "",
    rowNumber: index + 2
  };
}

/**
 * Converte um objeto Transaction em array de valores para gravar na planilha.
 * @param {Transaction & { split?: boolean }} transaction
 * @returns {any[]}
 */
export function toRow(transaction) {
  return [
    transaction.id,
    transaction.date,
    transaction.type,
    transaction.description,
    transaction.category,
    transaction.account,
    transaction.amount,
    "Confirmado",
    transaction.createdAt,
    new Date().toISOString(),
    transaction.split ? "true" : "",
    transaction.linkedId || ""
  ];
}

// ─── leitura de lançamentos ───────────────────────────────────────────────────

async function loadAllTransactions(token, spreadsheetId) {
  const result = await request(
    token,
    `spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${SHEET_NAME}!A2:L`)}`
  );
  return (result.values || []).map(fromRow).filter(Boolean);
}

async function loadMonthTransactions(token, spreadsheetId, month) {
  const all = await loadAllTransactions(token, spreadsheetId);
  return month ? all.filter((t) => t.date.startsWith(month)) : all;
}

/**
 * Extrai sugestões de autocomplete a partir de todas as transações.
 * Usa chave composta (descrição + categoria + conta) para manter variações.
 * Exclui sugestões de contas inativas.
 */
export function buildSuggestions(allTransactions, accounts) {
  const activeAccountIds = accounts
    ? new Set(accounts.filter((a) => a.active).map((a) => a.id))
    : null;

  const map = new Map();
  // Itera do mais recente para o mais antigo para manter a ordem de recência
  for (let i = allTransactions.length - 1; i >= 0; i--) {
    const t = allTransactions[i];
    const desc = t.description.trim();
    if (!desc) continue;
    // Ignora transações de contas inativas
    if (activeAccountIds && t.account && !activeAccountIds.has(t.account)) continue;
    const key = `${desc.toLocaleLowerCase("pt-BR")}|${t.category}|${t.account}`;
    if (!map.has(key)) {
      map.set(key, {
        description: desc,
        type: t.type,
        category: t.category,
        account: t.account
      });
    }
  }
  return Array.from(map.values());
}

/**
 * Garante que todas as abas obrigatórias existem na planilha.
 * Cria abas faltantes, grava cabeçalhos e faz seed de dados padrão se necessário.
 * Retorna os metadados da planilha (sheetId de transações e mapa de IDs).
 */
async function ensureSheetStructure(token, spreadsheetId) {
  const client = createSheetsClient(token);
  let metadata = await client.request(`spreadsheets/${spreadsheetId}?fields=sheets.properties`);
  let existingSheets = metadata.sheets.map((s) => s.properties.title);

  // Define todas as abas necessárias com seus cabeçalhos
  const requiredSheets = [
    { title: SHEET_NAME, header: ["id", "data", "tipo", "descricao", "categoria", "conta", "valor", "status", "criadoEm", "atualizadoEm", "compartilhado", "linkedId"] },
    { title: CATEGORIES_SHEET, header: CATEGORIES_HEADER },
    { title: ACCOUNTS_SHEET, header: ACCOUNTS_HEADER },
    { title: SETTINGS_SHEET, header: ["chave", "valor"] },
  ];

  // Cria abas que não existem
  const missingSheets = requiredSheets.filter((s) => !existingSheets.includes(s.title));
  if (missingSheets.length > 0) {
    await client.request(`spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({
        requests: missingSheets.map((s) => ({ addSheet: { properties: { title: s.title } } }))
      })
    });

    // Grava cabeçalhos das abas criadas
    for (const s of missingSheets) {
      const range = `${s.title}!A1:${String.fromCharCode(64 + s.header.length)}1`;
      await client.updateValues(spreadsheetId, range, [s.header]);
    }

    // Se Categorias ou Contas foram criadas, faz seed dos dados padrão
    if (missingSheets.some((s) => s.title === CATEGORIES_SHEET || s.title === ACCOUNTS_SHEET)) {
      await seedCategoriesAndAccounts(client.updateValues, spreadsheetId);
    }

    // Recarrega metadata com as novas abas
    metadata = await client.request(`spreadsheets/${spreadsheetId}?fields=sheets.properties`);
    existingSheets = metadata.sheets.map((s) => s.properties.title);
  }

  const sheet = metadata.sheets.find((s) => s.properties.title === SHEET_NAME);
  const sheetIdMap = Object.fromEntries(
    metadata.sheets.map((s) => [s.properties.title, s.properties.sheetId])
  );
  return { transactionSheetId: sheet.properties.sheetId, sheetIdMap };
}

// ─── criação da planilha ──────────────────────────────────────────────────────

async function createSpreadsheet(token) {
  const client = createSheetsClient(token);
  const folderId = await ensureAppFolder(token);

  let spreadsheetId;
  let sheetIdMap;

  if (folderId) {
    // Cria via Drive API para colocar na pasta CaloteirosApp
    const driveResponse = await fetch(
      "https://www.googleapis.com/drive/v3/files?fields=id",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Caloteiros - Controle Financeiro",
          mimeType: SPREADSHEET_MIME,
          parents: [folderId]
        })
      }
    );
    if (!driveResponse.ok) throw new Error("Não foi possível criar a planilha no Google Drive.");
    const driveData = await driveResponse.json();
    spreadsheetId = driveData.id;

    // Planilha criada via Drive tem uma aba padrão — renomeia e adiciona as demais
    const meta = await request(token, `spreadsheets/${spreadsheetId}?fields=sheets.properties`);
    const defaultSheetId = meta.sheets[0].properties.sheetId;

    await request(token, `spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({
        requests: [
          { updateSheetProperties: { properties: { sheetId: defaultSheetId, title: SHEET_NAME }, fields: "title" } },
          ...[CATEGORIES_SHEET, ACCOUNTS_SHEET, SETTINGS_SHEET].map((title) => ({
            addSheet: { properties: { title } }
          }))
        ]
      })
    });

    const metaFull = await request(token, `spreadsheets/${spreadsheetId}?fields=sheets.properties`);
    sheetIdMap = Object.fromEntries(metaFull.sheets.map((s) => [s.properties.title, s.properties.sheetId]));
  } else {
    // Fallback: cria via Sheets API (sem pasta)
    const spreadsheet = await request(token, "spreadsheets?fields=spreadsheetId,sheets.properties", {
      method: "POST",
      body: JSON.stringify({
        properties: { title: "Caloteiros - Controle Financeiro" },
        sheets: [
          { properties: { title: SHEET_NAME } },
          { properties: { title: CATEGORIES_SHEET } },
          { properties: { title: ACCOUNTS_SHEET } },
          { properties: { title: SETTINGS_SHEET } }
        ]
      })
    });
    spreadsheetId = spreadsheet.spreadsheetId;
    sheetIdMap = Object.fromEntries(spreadsheet.sheets.map((s) => [s.properties.title, s.properties.sheetId]));
  }

  const transactionSheetId = sheetIdMap[SHEET_NAME];
  localStorage.setItem(STORAGE.sheetId, spreadsheetId);

  // Cabeçalhos
  await Promise.all([
    updateValues(token, spreadsheetId, `${SHEET_NAME}!A1:K1`, [[
      "id", "data", "tipo", "descricao", "categoria", "conta", "valor", "status", "criadoEm", "atualizadoEm", "compartilhado"
    ]]),
    updateValues(token, spreadsheetId, `${SETTINGS_SHEET}!A1:B3`, [
      ["chave", "valor"], ["versao", "1"], ["criadoPor", "Caloteiros"]
    ])
  ]);

  // Seed de categorias e contas
  await seedCategoriesAndAccounts(client.updateValues, spreadsheetId);

  // Formatar cabeçalho
  await client.request(`spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: [
        { updateSheetProperties: { properties: { sheetId: transactionSheetId, gridProperties: { frozenRowCount: 1 } }, fields: "gridProperties.frozenRowCount" } },
        { repeatCell: { range: { sheetId: transactionSheetId, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.06, green: 0.46, blue: 0.43 }, textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true } } }, fields: "userEnteredFormat(backgroundColor,textFormat)" } },
        { autoResizeDimensions: { dimensions: { sheetId: transactionSheetId, dimension: "COLUMNS", startIndex: 0, endIndex: 11 } } }
      ]
    })
  });

  const [categories, accounts] = await Promise.all([
    loadCategories(client.request, spreadsheetId),
    loadAccounts(client.request, spreadsheetId)
  ]);

  return { spreadsheetId, transactionSheetId, sheetIdMap, transactions: [], categories, accounts };
}

// ─── busca planilha existente no Drive ───────────────────────────────────────

async function findExistingSpreadsheet(token) {
  // Busca a planilha pelo nome em qualquer lugar do Drive
  const query = encodeURIComponent(
    `name = 'Caloteiros - Controle Financeiro' and mimeType = '${SPREADSHEET_MIME}' and trashed = false`
  );
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)&pageSize=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) return null;
  const data = await response.json();
  return data.files?.[0]?.id || null;
}

// ─── verificação de planilha válida ───────────────────────────────────────────

/**
 * Verifica via Drive API se o arquivo existe e NÃO está na lixeira.
 * Retorna true se o arquivo está acessível e ativo.
 */
async function isFileActive(token, fileId) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,trashed`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) return false;
  const data = await response.json();
  return data.trashed !== true;
}

// ─── carregamento inicial ─────────────────────────────────────────────────────

export async function ensureSpreadsheet(token, currentSpreadsheetId, month) {
  if (currentSpreadsheetId) {
    // Verifica se a planilha não foi excluída/lixeira
    const active = await isFileActive(token, currentSpreadsheetId);
    if (active) {
      // Se a planilha existe e está ativa, carrega diretamente (ensureSheetStructure cria abas faltantes)
      return await loadSpreadsheet(token, currentSpreadsheetId, month);
    }
    // planilha na lixeira ou excluída — limpa e continua
    localStorage.removeItem(STORAGE.sheetId);
  }

  // Busca no Drive (dentro da pasta CaloteirosApp)
  const foundId = await findExistingSpreadsheet(token);
  if (foundId) {
    localStorage.setItem(STORAGE.sheetId, foundId);
    return await loadSpreadsheet(token, foundId, month);
  }

  return createSpreadsheet(token);
}

export async function loadSpreadsheet(token, spreadsheetId, month) {
  const client = createSheetsClient(token);

  // Aplica migrações pendentes antes de carregar
  await migrateIfNeeded(token, spreadsheetId);

  const [meta, allTransactions, categories, accounts, settings] = await Promise.all([
    ensureSheetStructure(token, spreadsheetId),
    loadAllTransactions(token, spreadsheetId),
    loadCategories(client.request, spreadsheetId),
    loadAccounts(client.request, spreadsheetId),
    loadSettings(token, spreadsheetId)
  ]);
  const transactions = month
    ? allTransactions.filter((t) => t.date.startsWith(month))
    : allTransactions;
  const suggestions = buildSuggestions(allTransactions, accounts);
  return {
    spreadsheetId,
    transactionSheetId: meta.transactionSheetId,
    sheetIdMap: meta.sheetIdMap,
    transactions, allTransactions, categories, accounts, suggestions,
    coupleSpreadsheetId: settings.coupleSpreadsheetId || ""
  };
}

// ─── settings API ─────────────────────────────────────────────────────────────

export function makeSettingsApi(token, spreadsheetId, sheetIdMap = {}) {
  const client = createSheetsClient(token);
  return {
    loadCategories:   () => loadCategories(client.request, spreadsheetId),
    loadAccounts:     () => loadAccounts(client.request, spreadsheetId),
    saveCategory:     (cat, existing) => saveCategory(client.request, client.updateValues, spreadsheetId, cat, existing),
    toggleCategory:   (cat) => toggleCategory(client.updateValues, spreadsheetId, cat),
    deleteCategory:   (cat) => deleteCategory(client.request, spreadsheetId, cat, sheetIdMap),
    saveAccount:      (acc, existing) => saveAccount(client.request, client.updateValues, spreadsheetId, acc, existing),
    toggleAccount:    (acc) => toggleAccount(client.updateValues, spreadsheetId, acc),
    deleteAccount:    (acc) => deleteAccount(client.request, spreadsheetId, acc, sheetIdMap),
    importCategories: (data) => importCategories(client.request, client.updateValues, spreadsheetId, data),
    importAccounts:   (data) => importAccounts(client.request, client.updateValues, spreadsheetId, data)
  };
}

// ─── perfil Google ────────────────────────────────────────────────────────────

export async function loadGoogleProfile(token) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.ok ? response.json() : null;
}

// ─── configurações persistidas na planilha ────────────────────────────────────

/**
 * Lê a aba Configuracoes e retorna um mapa chave→valor.
 */
export async function loadSettings(token, spreadsheetId) {
  try {
    const result = await request(
      token,
      `spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${SETTINGS_SHEET}!A2:B20`)}`
    );
    const settings = {};
    for (const row of (result.values || [])) {
      if (row[0]) settings[row[0]] = row[1] || "";
    }
    return settings;
  } catch {
    // Aba não existe em planilhas antigas — retorna vazio
    return {};
  }
}

/**
 * Salva uma chave na aba Configuracoes.
 * Busca a linha existente e atualiza, ou adiciona no final.
 */
export async function saveSetting(token, spreadsheetId, key, value) {
  const result = await request(
    token,
    `spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${SETTINGS_SHEET}!A2:B20`)}`
  );
  const rows = result.values || [];
  const rowIndex = rows.findIndex((r) => r[0] === key);

  if (rowIndex >= 0) {
    // atualiza linha existente (rowIndex + 2 porque linha 1 é cabeçalho)
    await updateValues(token, spreadsheetId, `${SETTINGS_SHEET}!A${rowIndex + 2}:B${rowIndex + 2}`, [[key, value]]);
  } else {
    // adiciona no final
    await request(
      token,
      `spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${SETTINGS_SHEET}!A:B`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      { method: "POST", body: JSON.stringify({ values: [[key, value]] }) }
    );
  }
}

// ─── salvar transação ─────────────────────────────────────────────────────────

export async function saveSheetTransaction(token, spreadsheetId, transaction, current, currentMonth) {
  if (current) {
    const updated = { ...transaction, createdAt: current.createdAt };
    await updateValues(token, spreadsheetId, `${SHEET_NAME}!A${current.rowNumber}:L${current.rowNumber}`, [toRow(updated)]);
  } else {
    await request(
      token,
      `spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${SHEET_NAME}!A:L`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      { method: "POST", body: JSON.stringify({ values: [toRow(transaction)] }) }
    );
  }

  // Lê todas as transações uma única vez
  const allTransactions = await loadAllTransactions(token, spreadsheetId);

  const transactions = allTransactions.filter((t) => t.date.startsWith(currentMonth));

  return { spreadsheetId, transactions, allTransactions };
}

// ─── excluir transação ────────────────────────────────────────────────────────

export async function deleteSheetTransaction(token, spreadsheetId, transactionSheetId, transaction, currentMonth) {
  const client = createSheetsClient(token);

  await client.request(`spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: { sheetId: transactionSheetId, dimension: "ROWS", startIndex: transaction.rowNumber - 1, endIndex: transaction.rowNumber }
        }
      }]
    })
  });

  // Lê tudo uma vez após a exclusão
  const [allTransactions, accounts] = await Promise.all([
    loadAllTransactions(token, spreadsheetId),
    loadAccounts(client.request, spreadsheetId)
  ]);

  const transactions = allTransactions.filter((t) => t.date.startsWith(currentMonth));
  const suggestions = buildSuggestions(allTransactions, accounts);

  return { spreadsheetId, transactions, allTransactions, suggestions };
}

/**
 * Exclui duas transações vinculadas (transferência) atomicamente via batchUpdate.
 * Ordena por rowNumber decrescente para não invalidar índices.
 */
export async function deleteLinkedTransactions(token, spreadsheetId, transactionSheetId, txnA, txnB, currentMonth) {
  const client = createSheetsClient(token);
  const sorted = [txnA, txnB].sort((a, b) => b.rowNumber - a.rowNumber);

  await client.request(`spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: sorted.map((t) => ({
        deleteDimension: {
          range: {
            sheetId: transactionSheetId,
            dimension: "ROWS",
            startIndex: t.rowNumber - 1,
            endIndex: t.rowNumber
          }
        }
      }))
    })
  });

  const [allTransactions, accounts] = await Promise.all([
    loadAllTransactions(token, spreadsheetId),
    loadAccounts(client.request, spreadsheetId)
  ]);
  const transactions = allTransactions.filter((t) => t.date.startsWith(currentMonth));
  const suggestions = buildSuggestions(allTransactions, accounts);

  return { spreadsheetId, transactions, allTransactions, suggestions };
}

/**
 * Atualiza duas transações vinculadas atomicamente via values:batchUpdate.
 */
export async function saveLinkedTransactions(token, spreadsheetId, txnA, currentA, txnB, currentB, currentMonth) {
  const rowA = toRow({ ...txnA, createdAt: currentA.createdAt });
  const rowB = toRow({ ...txnB, createdAt: currentB.createdAt });

  await request(
    token,
    `spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: "POST",
      body: JSON.stringify({
        valueInputOption: "USER_ENTERED",
        data: [
          { range: `${SHEET_NAME}!A${currentA.rowNumber}:L${currentA.rowNumber}`, values: [rowA] },
          { range: `${SHEET_NAME}!A${currentB.rowNumber}:L${currentB.rowNumber}`, values: [rowB] }
        ]
      })
    }
  );

  const allTransactions = await loadAllTransactions(token, spreadsheetId);
  const transactions = allTransactions.filter((t) => t.date.startsWith(currentMonth));

  return { spreadsheetId, transactions, allTransactions };
}
