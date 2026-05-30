/**
 * settingsSheets.js
 * CRUD para as abas "Categorias" e "Contas" da planilha pessoal.
 *
 * Aba "Categorias" (A→H):
 *   id | parentId | nome | icone | cor | ativo | criadoEm | atualizadoEm
 *
 * Aba "Contas" (A→E):
 *   id | nome | ativo | criadoEm | atualizadoEm
 */

import { ACCOUNTS_SHEET, CATEGORIES_SHEET, DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES, TRANSFER_CATEGORY_ID } from "../constants.js";

export const CATEGORIES_HEADER = ["id", "parentId", "nome", "icone", "cor", "ativo", "criadoEm", "atualizadoEm"];
export const ACCOUNTS_HEADER   = ["id", "nome", "ativo", "criadoEm", "atualizadoEm"];

// ─── HTTP helpers (recebidos de fora para não duplicar) ───────────────────────

// Os helpers request/updateValues são passados como funções para evitar
// duplicação — o chamador (googleSheets.js) já os tem com o token vinculado.

// ─── conversão ────────────────────────────────────────────────────────────────

function rowToCategory(row, index) {
  if (!row[0]) return null;
  return {
    id:        row[0],
    parentId:  row[1] || "",
    name:      row[2] || "",
    icon:      row[3] || "📦",
    color:     row[4] || "#95A5A6",
    active:    String(row[5]).toLowerCase() !== "false",
    createdAt: row[6] || "",
    rowNumber: index + 2
  };
}

function categoryToRow(cat) {
  return [
    cat.id,
    cat.parentId || "",
    cat.name,
    cat.icon || "📦",
    cat.color || "#95A5A6",
    String(cat.active !== false),
    cat.createdAt || new Date().toISOString(),
    new Date().toISOString()
  ];
}

function rowToAccount(row, index) {
  if (!row[0]) return null;
  return {
    id:        row[0],
    name:      row[1] || "",
    active:    String(row[2]).toLowerCase() !== "false",
    createdAt: row[3] || "",
    rowNumber: index + 2
  };
}

function accountToRow(acc) {
  return [
    acc.id,
    acc.name,
    String(acc.active !== false),
    acc.createdAt || new Date().toISOString(),
    new Date().toISOString()
  ];
}

// ─── leitura ──────────────────────────────────────────────────────────────────

export async function loadCategories(requestFn, spreadsheetId) {
  try {
    const result = await requestFn(
      `spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${CATEGORIES_SHEET}!A2:H`)}`
    );
    return (result.values || []).map(rowToCategory).filter(Boolean);
  } catch {
    return [];   // aba não existe em planilhas antigas
  }
}

export async function loadAccounts(requestFn, spreadsheetId) {
  try {
    const result = await requestFn(
      `spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${ACCOUNTS_SHEET}!A2:E`)}`
    );
    return (result.values || []).map(rowToAccount).filter(Boolean);
  } catch {
    return [];
  }
}

// ─── seed inicial ─────────────────────────────────────────────────────────────

export async function seedCategoriesAndAccounts(updateValuesFn, spreadsheetId) {
  const now = new Date().toISOString();
  const catRows = DEFAULT_CATEGORIES.map((c) => categoryToRow({ ...c, createdAt: now }));
  const accRows = DEFAULT_ACCOUNTS.map((a) => accountToRow({ ...a, createdAt: now }));

  await Promise.all([
    updateValuesFn(
      spreadsheetId,
      `${CATEGORIES_SHEET}!A1:H${catRows.length + 1}`,
      [CATEGORIES_HEADER, ...catRows]
    ),
    updateValuesFn(
      spreadsheetId,
      `${ACCOUNTS_SHEET}!A1:E${accRows.length + 1}`,
      [ACCOUNTS_HEADER, ...accRows]
    )
  ]);
}

// ─── categorias — CRUD ────────────────────────────────────────────────────────

export async function saveCategory(requestFn, updateValuesFn, spreadsheetId, category, existing) {
  if (existing) {
    // atualiza linha existente
    await updateValuesFn(
      spreadsheetId,
      `${CATEGORIES_SHEET}!A${existing.rowNumber}:H${existing.rowNumber}`,
      [categoryToRow({ ...category, createdAt: existing.createdAt })]
    );
  } else {
    // append nova linha
    await requestFn(
      `spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${CATEGORIES_SHEET}!A:H`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      { method: "POST", body: JSON.stringify({ values: [categoryToRow(category)] }) }
    );
  }
  return loadCategories(requestFn, spreadsheetId);
}

export async function toggleCategory(updateValuesFn, spreadsheetId, category) {
  const updated = { ...category, active: !category.active };
  await updateValuesFn(
    spreadsheetId,
    `${CATEGORIES_SHEET}!A${category.rowNumber}:H${category.rowNumber}`,
    [categoryToRow(updated)]
  );
  return updated;
}

export async function deleteCategory(requestFn, spreadsheetId, category, sheetIdMap) {
  const sheetId = sheetIdMap[CATEGORIES_SHEET];
  await requestFn(`spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: "ROWS",
            startIndex: category.rowNumber - 1,
            endIndex: category.rowNumber
          }
        }
      }]
    })
  });
  return loadCategories(requestFn, spreadsheetId);
}

// ─── contas — CRUD ────────────────────────────────────────────────────────────

export async function saveAccount(requestFn, updateValuesFn, spreadsheetId, account, existing) {
  if (existing) {
    await updateValuesFn(
      spreadsheetId,
      `${ACCOUNTS_SHEET}!A${existing.rowNumber}:E${existing.rowNumber}`,
      [accountToRow({ ...account, createdAt: existing.createdAt })]
    );
  } else {
    await requestFn(
      `spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${ACCOUNTS_SHEET}!A:E`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      { method: "POST", body: JSON.stringify({ values: [accountToRow(account)] }) }
    );
  }
  return loadAccounts(requestFn, spreadsheetId);
}

export async function toggleAccount(updateValuesFn, spreadsheetId, account) {
  const updated = { ...account, active: !account.active };
  await updateValuesFn(
    spreadsheetId,
    `${ACCOUNTS_SHEET}!A${account.rowNumber}:E${account.rowNumber}`,
    [accountToRow(updated)]
  );
  return updated;
}

export async function deleteAccount(requestFn, spreadsheetId, account, sheetIdMap) {
  const sheetId = sheetIdMap[ACCOUNTS_SHEET];
  await requestFn(`spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: "ROWS",
            startIndex: account.rowNumber - 1,
            endIndex: account.rowNumber
          }
        }
      }]
    })
  });
  return loadAccounts(requestFn, spreadsheetId);
}

// ─── importação via CSV/JSON ──────────────────────────────────────────────────

/**
 * Importa categorias a partir de um array de objetos.
 * Campos esperados: id, parentId, name, icon, color, active
 * Substitui todas as categorias existentes pelas importadas.
 */
export async function importCategories(requestFn, updateValuesFn, spreadsheetId, incoming) {
  // Filtra categorias importadas, ignorando se alguém tentar importar com o id ou nome reservado de transferência
  const importedRows = incoming
    .filter((c) => c.id && c.name && c.id !== TRANSFER_CATEGORY_ID && c.name.toLowerCase() !== "transferência")
    .map((c) => categoryToRow({
      id:        c.id,
      parentId:  c.parentId || c.parent_id || "",
      name:      c.name,
      icon:      c.icon || "📦",
      color:     c.color || "#95A5A6",
      active:    c.active !== false,
      createdAt: c.createdAt || new Date().toISOString()
    }));

  // Sempre inclui a categoria padrão de transferência
  const transferCat = DEFAULT_CATEGORIES.find((c) => c.id === TRANSFER_CATEGORY_ID);
  const transferRow = categoryToRow({ ...transferCat, createdAt: new Date().toISOString() });

  const rows = [transferRow, ...importedRows];

  if (rows.length === 0) return loadCategories(requestFn, spreadsheetId);

  // Limpa a aba inteira e reescreve com cabeçalho + novas categorias
  await requestFn(
    `spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${CATEGORIES_SHEET}`)}:clear`,
    { method: "POST", body: JSON.stringify({}) }
  );

  await updateValuesFn(
    spreadsheetId,
    `${CATEGORIES_SHEET}!A1:H${rows.length + 1}`,
    [CATEGORIES_HEADER, ...rows]
  );

  return loadCategories(requestFn, spreadsheetId);
}

/**
 * Importa contas a partir de um array de objetos.
 * Campos esperados: id, name, active
 * Substitui todas as contas existentes pelas importadas.
 */
export async function importAccounts(requestFn, updateValuesFn, spreadsheetId, incoming) {
  const rows = incoming
    .filter((a) => a.id && a.name)
    .map((a) => accountToRow({
      id:        a.id,
      name:      a.name,
      active:    a.active !== false,
      createdAt: a.createdAt || new Date().toISOString()
    }));

  if (rows.length === 0) return loadAccounts(requestFn, spreadsheetId);

  // Limpa a aba inteira e reescreve com cabeçalho + novas contas
  await requestFn(
    `spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${ACCOUNTS_SHEET}`)}:clear`,
    { method: "POST", body: JSON.stringify({}) }
  );

  await updateValuesFn(
    spreadsheetId,
    `${ACCOUNTS_SHEET}!A1:E${rows.length + 1}`,
    [ACCOUNTS_HEADER, ...rows]
  );

  return loadAccounts(requestFn, spreadsheetId);
}

// ─── utilitários para a UI ────────────────────────────────────────────────────

/**
 * Constrói a árvore de categorias a partir da lista plana.
 * Retorna array de nós raiz, cada um com propriedade `children`.
 */
export function buildCategoryTree(categories) {
  const map = {};
  const roots = [];

  for (const cat of categories) {
    map[cat.id] = { ...cat, children: [] };
  }

  for (const cat of categories) {
    if (cat.parentId && map[cat.parentId]) {
      map[cat.parentId].children.push(map[cat.id]);
    } else {
      roots.push(map[cat.id]);
    }
  }

  return roots;
}

/**
 * Achata a árvore em lista ordenada com nível de profundidade.
 * Útil para renderizar um <select> com indentação.
 * Retorna array de { ...category, depth, label }
 */
export function flattenCategoryTree(categories, onlyActive = true) {
  const tree = buildCategoryTree(
    onlyActive ? categories.filter((c) => c.active) : categories
  );
  const result = [];

  function walk(nodes, depth) {
    for (const node of nodes) {
      const indent = "　".repeat(depth);   // espaço ideográfico para indentação
      result.push({ ...node, depth, label: `${indent}${node.icon} ${node.name}` });
      if (node.children.length > 0) walk(node.children, depth + 1);
    }
  }

  walk(tree, 0);
  return result;
}
