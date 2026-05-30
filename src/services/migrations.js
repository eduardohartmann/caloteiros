/**
 * migrations.js
 * Sistema de migração para planilhas existentes.
 *
 * Cada migração é uma função que recebe (token, spreadsheetId, metadata)
 * e aplica as mudanças necessárias. Migrações são idempotentes.
 *
 * Versão atual: 2
 */

import { SHEET_NAME, CATEGORIES_SHEET, ACCOUNTS_SHEET, SETTINGS_SHEET } from "../constants.js";
import { request, updateValues, makeRequestFn, makeUpdateFn } from "./sheetsApi.js";
import { CATEGORIES_HEADER, ACCOUNTS_HEADER, seedCategoriesAndAccounts, loadCategories } from "./settingsSheets.js";

export const CURRENT_VERSION = 2;

/**
 * Verifica a versão da planilha e aplica migrações pendentes.
 * Chamado após carregar a planilha com sucesso.
 */
export async function migrateIfNeeded(token, spreadsheetId) {
  const version = await getVersion(token, spreadsheetId);
  if (version >= CURRENT_VERSION) return;   // já está atualizada

  const metadata = await request(token, `spreadsheets/${spreadsheetId}?fields=sheets.properties`);
  const existingSheets = metadata.sheets.map((s) => s.properties.title);

  if (version < 2) {
    await migrateToV2(token, spreadsheetId, existingSheets);
  }

  // Atualiza versão
  await setVersion(token, spreadsheetId, CURRENT_VERSION);
}

// ─── helpers ──────────────────────────────────────────────────────────────────

async function getVersion(token, spreadsheetId) {
  try {
    const result = await request(
      token,
      `spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${SETTINGS_SHEET}!A2:B20`)}`
    );
    for (const row of (result.values || [])) {
      if (row[0] === "versao") return Number(row[1]) || 1;
    }
  } catch {
    // Aba não existe — versão 0 (planilha muito antiga)
  }
  return 0;
}

async function setVersion(token, spreadsheetId, version) {
  try {
    const result = await request(
      token,
      `spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${SETTINGS_SHEET}!A2:B20`)}`
    );
    const rows = result.values || [];
    const idx = rows.findIndex((r) => r[0] === "versao");
    if (idx >= 0) {
      await updateValues(token, spreadsheetId, `${SETTINGS_SHEET}!B${idx + 2}`, [[String(version)]]);
    } else {
      await request(
        token,
        `spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${SETTINGS_SHEET}!A:B`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        { method: "POST", body: JSON.stringify({ values: [["versao", String(version)]] }) }
      );
    }
  } catch {
    // Se Configuracoes não existe, será criada pela migração
  }
}

async function addSheetIfMissing(token, spreadsheetId, title, existingSheets) {
  if (existingSheets.includes(title)) return;
  await request(token, `spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: [{ addSheet: { properties: { title } } }]
    })
  });
}

// ─── migração v1 → v2 ────────────────────────────────────────────────────────

async function migrateToV2(token, spreadsheetId, existingSheets) {
  const updFn = makeUpdateFn(token);
  const reqFn = makeRequestFn(token);

  // 1. Criar aba Configuracoes se não existe
  await addSheetIfMissing(token, spreadsheetId, SETTINGS_SHEET, existingSheets);
  if (!existingSheets.includes(SETTINGS_SHEET)) {
    await updateValues(token, spreadsheetId, `${SETTINGS_SHEET}!A1:B3`, [
      ["chave", "valor"], ["versao", "2"], ["criadoPor", "Caloteiros"]
    ]);
    existingSheets.push(SETTINGS_SHEET);
  }

  // 2. Criar aba Categorias se não existe + seed
  await addSheetIfMissing(token, spreadsheetId, CATEGORIES_SHEET, existingSheets);
  if (!existingSheets.includes(CATEGORIES_SHEET)) {
    existingSheets.push(CATEGORIES_SHEET);
  }
  // Verifica se já tem dados
  const cats = await loadCategories(reqFn, spreadsheetId);
  if (cats.length === 0) {
    await seedCategoriesAndAccounts(updFn, spreadsheetId);
  }

  // 3. Criar aba Contas se não existe (seed já foi feito acima junto com categorias)
  await addSheetIfMissing(token, spreadsheetId, ACCOUNTS_SHEET, existingSheets);
  if (!existingSheets.includes(ACCOUNTS_SHEET)) {
    existingSheets.push(ACCOUNTS_SHEET);
  }

  // 4. Atualizar cabeçalho da aba Lancamentos (adiciona coluna "compartilhado")
  //    Lê o cabeçalho atual para verificar se já tem a coluna
  try {
    const headerResult = await request(
      token,
      `spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${SHEET_NAME}!1:1`)}`
    );
    const currentHeader = headerResult.values?.[0] || [];
    if (!currentHeader.includes("compartilhado")) {
      // Atualiza o cabeçalho completo com a nova estrutura
      const newHeader = ["id", "data", "tipo", "descricao", "categoria", "conta", "valor", "status", "criadoEm", "atualizadoEm", "compartilhado", "linkedId"];
      await updateValues(token, spreadsheetId, `${SHEET_NAME}!A1:L1`, [newHeader]);
    } else if (!currentHeader.includes("linkedId")) {
      const newHeader = [...currentHeader, "linkedId"];
      await updateValues(token, spreadsheetId, `${SHEET_NAME}!A1:L1`, [newHeader]);
    }
  } catch {
    // Aba Lancamentos não existe — será criada pelo createSpreadsheet
  }
}
