/**
 * coupleSheets.js
 * Gerencia a planilha compartilhada do casal.
 *
 * Novo fluxo:
 *   1. Usuário cadastra lançamento pessoal com "Dividir com parceiro" marcado
 *   2. Lançamento vai para a planilha pessoal (despesa total) E para a planilha do casal
 *   3. Na planilha do casal: parceiro deve metade (50/50)
 *   4. Parceiro marca "Paguei" → status: pago
 *   5. Criador confirma recebimento → status: confirmado
 *   6. Ao confirmar, abre formulário pré-preenchido de receita (reembolso)
 *
 * Colunas de Divisao (A→J):
 *   id | data | descricao | categoria | conta | valorTotal | valorDevido | status | cadastradoPor | criadoEm
 *
 * Status: pendente → pago → confirmado
 */

import { COUPLE_SHEET_NAME, SETTINGS_SHEET, STORAGE } from "../constants.js";
import { ensureAppFolder, SPREADSHEET_MIME } from "./driveUtils.js";
import { request, updateValues } from "./sheetsApi.js";
import { parseAmount } from "../utils/formatters.js";

// Re-exporta parseAmount para manter compatibilidade com imports existentes
export { parseAmount } from "../utils/formatters.js";

/** @typedef {import("../types.js").CoupleEntry} CoupleEntry */

const COUPLE_HEADER = [
  "id", "data", "descricao",
  "valorTotal", "valorDevido", "status",
  "cadastradoPor", "criadoEm",
  "transacaoOrigem", "transacaoPagamento"
];

// ─── conversão de linhas ──────────────────────────────────────────────────────

/**
 * Converte uma linha da aba Divisao em objeto CoupleEntry.
 * @param {string[]} row
 * @param {number} index
 * @returns {CoupleEntry|null}
 */
export function rowToEntry(row, index) {
  if (!row[0]) return null;
  return {
    id: row[0],
    date: row[1],
    description: row[2],
    totalAmount: parseAmount(row[3]),
    amountDue: parseAmount(row[4]),
    status: row[5] || "pendente",
    createdBy: row[6] || "",
    createdAt: row[7] || "",
    sourceTransactionId: row[8] || "",
    paymentTransactionId: row[9] || "",
    rowNumber: index + 2
  };
}

/**
 * Converte um objeto CoupleEntry em array de valores para a planilha.
 * @param {CoupleEntry} entry
 * @returns {any[]}
 */
export function entryToRow(entry) {
  return [
    entry.id,
    entry.date,
    entry.description,
    entry.totalAmount,
    entry.amountDue,
    entry.status,
    entry.createdBy,
    entry.createdAt,
    entry.sourceTransactionId || "",
    entry.paymentTransactionId || ""
  ];
}

function entriesToTransactions(entries) {
  return entries.map((e) => ({
    date: e.date,
    type: "expense",
    amount: e.totalAmount
  }));
}

// ─── leitura ──────────────────────────────────────────────────────────────────

async function loadEntries(token, spreadsheetId) {
  try {
    const result = await request(
      token,
      `spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${COUPLE_SHEET_NAME}!A2:J`)}`
    );
    return (result.values || []).map(rowToEntry).filter(Boolean);
  } catch {
    return [];
  }
}

async function loadConfig(token, spreadsheetId) {
  try {
    const result = await request(
      token,
      `spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${SETTINGS_SHEET}!A2:B10`)}`
    );
    const config = {};
    for (const [key, value] of (result.values || [])) {
      if (key) config[key] = value;
    }
    return config;
  } catch {
    return {};
  }
}

// ─── criação da planilha ──────────────────────────────────────────────────────

export async function createCoupleSpreadsheet(token, nameA, emailA) {
  const folderId = await ensureAppFolder(token);

  let spreadsheetId;
  let divSheetId;

  if (folderId) {
    const driveResponse = await fetch(
      "https://www.googleapis.com/drive/v3/files?fields=id",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Caloteiros - Casal",
          mimeType: SPREADSHEET_MIME,
          parents: [folderId]
        })
      }
    );
    if (!driveResponse.ok) throw new Error("Não foi possível criar a planilha do casal.");
    const driveData = await driveResponse.json();
    spreadsheetId = driveData.id;

    const meta = await request(token, `spreadsheets/${spreadsheetId}?fields=sheets.properties`);
    const defaultSheetId = meta.sheets[0].properties.sheetId;

    await request(token, `spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({
        requests: [
          { updateSheetProperties: { properties: { sheetId: defaultSheetId, title: COUPLE_SHEET_NAME }, fields: "title" } },
          ...[SETTINGS_SHEET].map((title) => ({ addSheet: { properties: { title } } }))
        ]
      })
    });

    const metaFull = await request(token, `spreadsheets/${spreadsheetId}?fields=sheets.properties`);
    divSheetId = metaFull.sheets.find((s) => s.properties.title === COUPLE_SHEET_NAME).properties.sheetId;
  } else {
    const spreadsheet = await request(token, "spreadsheets?fields=spreadsheetId,sheets.properties", {
      method: "POST",
      body: JSON.stringify({
        properties: { title: "Caloteiros - Casal" },
        sheets: [
          { properties: { title: COUPLE_SHEET_NAME } },
          { properties: { title: SETTINGS_SHEET } }
        ]
      })
    });
    spreadsheetId = spreadsheet.spreadsheetId;
    divSheetId = spreadsheet.sheets.find((s) => s.properties.title === COUPLE_SHEET_NAME).properties.sheetId;
  }

  await Promise.all([
    updateValues(token, spreadsheetId, `${COUPLE_SHEET_NAME}!A1:J1`, [COUPLE_HEADER]),
    updateValues(token, spreadsheetId, `${SETTINGS_SHEET}!A1:B6`, [
      ["chave", "valor"],
      ["nomeA", nameA],
      ["emailA", emailA],
      ["nomeB", ""],
      ["emailB", ""],
      ["versao", "2"]
    ])
  ]);

  await request(token, `spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: [
        { updateSheetProperties: { properties: { sheetId: divSheetId, gridProperties: { frozenRowCount: 1 } }, fields: "gridProperties.frozenRowCount" } },
        { repeatCell: { range: { sheetId: divSheetId, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.06, green: 0.46, blue: 0.43 }, textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true } } }, fields: "userEnteredFormat(backgroundColor,textFormat)" } }
      ]
    })
  });

  localStorage.setItem(STORAGE.coupleSheetId, spreadsheetId);
  localStorage.setItem(STORAGE.coupleUserKey, "A");

  return {
    spreadsheetId,
    userKey: "A",
    config: { nomeA: nameA, emailA, nomeB: "", emailB: "" },
    entries: []
  };
}

// ─── entrar em planilha existente ─────────────────────────────────────────────

export async function joinCoupleSpreadsheet(token, spreadsheetId, nameB, emailB) {
  const metadata = await request(token, `spreadsheets/${spreadsheetId}?fields=sheets.properties`);
  const hasSheet = metadata.sheets.some((s) => s.properties.title === COUPLE_SHEET_NAME);
  if (!hasSheet) throw new Error("Planilha inválida. Verifique o código e tente novamente.");

  const config = await loadConfig(token, spreadsheetId);
  await updateValues(token, spreadsheetId, `${SETTINGS_SHEET}!A1:B6`, [
    ["chave", "valor"],
    ["nomeA", config.nomeA || ""],
    ["emailA", config.emailA || ""],
    ["nomeB", nameB],
    ["emailB", emailB],
    ["versao", "2"]
  ]);

  localStorage.setItem(STORAGE.coupleSheetId, spreadsheetId);
  localStorage.setItem(STORAGE.coupleUserKey, "B");

  const entries = await loadEntries(token, spreadsheetId);

  return { spreadsheetId, userKey: "B", config: { ...config, nomeB: nameB, emailB }, entries };
}

// ─── compartilhar com o parceiro (por email) ─────────────────────────────────

export async function shareCoupleWithPartner(token, spreadsheetId, partnerEmail) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "writer",
        type: "user",
        emailAddress: partnerEmail
      })
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Não foi possível compartilhar com o parceiro.");
  }
}

// ─── carregar planilha existente ──────────────────────────────────────────────

export async function loadCoupleSpreadsheet(token, spreadsheetId) {
  const [config, entries] = await Promise.all([
    loadConfig(token, spreadsheetId),
    loadEntries(token, spreadsheetId),
  ]);
  const userKey = localStorage.getItem(STORAGE.coupleUserKey) || "A";
  return { spreadsheetId, userKey, config, entries };
}

// ─── salvar lançamento compartilhado (chamado ao salvar com checkbox marcado) ─

export async function saveCoupleEntry(token, spreadsheetId, entry) {
  await request(
    token,
    `spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${COUPLE_SHEET_NAME}!A:J`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: "POST", body: JSON.stringify({ values: [entryToRow(entry)] }) }
  );

  const entries = await loadEntries(token, spreadsheetId);
  return { entries };
}

// ─── helper: buscar rowNumber atualizado pelo id ─────────────────────────────

async function findEntryRowNumber(token, spreadsheetId, entryId) {
  const result = await request(
    token,
    `spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${COUPLE_SHEET_NAME}!A2:A`)}`
  );
  const ids = result.values || [];
  const index = ids.findIndex((row) => row[0] === entryId);
  if (index === -1) throw new Error("Lançamento não encontrado na planilha.");
  return index + 2; // +2 porque começa na linha 2 (cabeçalho na 1)
}

// ─── parceiro marca "Paguei" ──────────────────────────────────────────────────

export async function markEntryAsPaid(token, spreadsheetId, entry, paymentTransactionId = "") {
  // #3 - Busca rowNumber atualizado antes de escrever
  const freshRowNumber = await findEntryRowNumber(token, spreadsheetId, entry.id);

  const updated = { ...entry, status: "pago", paymentTransactionId };
  await updateValues(
    token,
    spreadsheetId,
    `${COUPLE_SHEET_NAME}!A${freshRowNumber}:J${freshRowNumber}`,
    [entryToRow(updated)]
  );
  const entries = await loadEntries(token, spreadsheetId);
  return { entries };
}

// ─── criador confirma recebimento ─────────────────────────────────────────────

export async function confirmEntryPayment(token, spreadsheetId, entry) {
  // #3 - Busca rowNumber atualizado antes de escrever
  const freshRowNumber = await findEntryRowNumber(token, spreadsheetId, entry.id);

  const updated = { ...entry, status: "confirmado" };
  await updateValues(
    token,
    spreadsheetId,
    `${COUPLE_SHEET_NAME}!A${freshRowNumber}:J${freshRowNumber}`,
    [entryToRow(updated)]
  );
  const entries = await loadEntries(token, spreadsheetId);
  return { entries };
}

// ─── excluir lançamento compartilhado ────────────────────────────────────────

export async function deleteCoupleEntry(token, spreadsheetId, entry) {
  // #3 - Busca rowNumber atualizado antes de excluir
  const freshRowNumber = await findEntryRowNumber(token, spreadsheetId, entry.id);

  const metadata = await request(token, `spreadsheets/${spreadsheetId}?fields=sheets.properties`);
  const sheet = metadata.sheets.find((s) => s.properties.title === COUPLE_SHEET_NAME);

  await request(token, `spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: { sheetId: sheet.properties.sheetId, dimension: "ROWS", startIndex: freshRowNumber - 1, endIndex: freshRowNumber }
        }
      }]
    })
  });

  const entries = await loadEntries(token, spreadsheetId);
  return { entries };
}
