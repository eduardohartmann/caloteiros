/**
 * driveUtils.js
 * Utilitários para operações no Google Drive (pasta, busca de arquivos).
 */

import { STORAGE } from "../constants.js";

export const APP_FOLDER_NAME = "CaloteirosApp";
export const SPREADSHEET_MIME = "application/vnd.google-apps.spreadsheet";
export const FOLDER_MIME = "application/vnd.google-apps.folder";

/**
 * Busca a pasta "CaloteirosApp" no Drive.
 * Verifica cache local, valida se ainda existe, senão busca via API.
 */
export async function findAppFolder(token) {
  // Verifica cache local
  const cached = localStorage.getItem(STORAGE.folderId);
  if (cached) {
    // Valida se a pasta ainda existe
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${cached}?fields=id,trashed`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (response.ok) {
      const data = await response.json();
      if (!data.trashed) return cached;
    }
    // Pasta excluída ou inacessível — limpa cache
    localStorage.removeItem(STORAGE.folderId);
  }

  // Busca via API
  const query = encodeURIComponent(
    `name = '${APP_FOLDER_NAME}' and mimeType = '${FOLDER_MIME}' and trashed = false`
  );
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)&pageSize=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) return null;
  const data = await response.json();
  const id = data.files?.[0]?.id || null;
  if (id) localStorage.setItem(STORAGE.folderId, id);
  return id;
}

/**
 * Cria a pasta "CaloteirosApp" no Drive.
 */
export async function createAppFolder(token) {
  const response = await fetch(
    "https://www.googleapis.com/drive/v3/files?fields=id",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name: APP_FOLDER_NAME, mimeType: FOLDER_MIME })
    }
  );
  if (!response.ok) return null;
  const data = await response.json();
  const id = data.id || null;
  if (id) localStorage.setItem(STORAGE.folderId, id);
  return id;
}

/**
 * Garante que a pasta existe, criando se necessário.
 */
export async function ensureAppFolder(token) {
  const existing = await findAppFolder(token);
  if (existing) return existing;
  return createAppFolder(token);
}

/**
 * Busca um arquivo por nome e tipo dentro da pasta CaloteirosApp.
 */
export async function findFile(token, name, mimeType, folderId) {
  if (!folderId) return null;

  const query = encodeURIComponent(
    `name = '${name}' and mimeType = '${mimeType}' ` +
    `and '${folderId}' in parents and trashed = false`
  );
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)&pageSize=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) return null;
  const data = await response.json();
  return data.files?.[0]?.id || null;
}
