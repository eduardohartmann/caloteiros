/**
 * sheetsApi.js
 * Camada HTTP compartilhada para a Google Sheets API.
 * Inclui retry automático e detecção de token expirado.
 */

const SHEETS_BASE = "https://sheets.googleapis.com/v4";
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const RATE_LIMIT_DELAY = 10000; // 10s para erros 429 (quota exceeded)

/**
 * Faz uma requisição à Sheets API com retry automático.
 * Lança erro com mensagem legível em caso de falha.
 */
export async function request(token, path, options = {}) {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${SHEETS_BASE}/${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(options.headers || {})
        }
      });

      if (response.status === 401) {
        throw new TokenExpiredError("Sessão expirada. Reconecte sua conta Google.");
      }

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        const message = result.error?.message || `Erro ${response.status} ao acessar o Google Sheets.`;

        // Não faz retry em erros de cliente (4xx) exceto 429 (rate limit)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw new Error(message);
        }

        lastError = new Error(message);
        lastError._isRateLimit = response.status === 429;
      } else {
        return response.status === 204 ? null : response.json();
      }
    } catch (error) {
      if (error instanceof TokenExpiredError) throw error;
      lastError = error;
    }

    // Espera antes de tentar de novo (exceto na última tentativa)
    if (attempt < MAX_RETRIES) {
      const delay = lastError?._isRateLimit
        ? RATE_LIMIT_DELAY * (attempt + 1)
        : RETRY_DELAY * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error("Falha ao acessar o Google Sheets.");
}

/**
 * Atualiza valores em um range da planilha.
 */
export async function updateValues(token, spreadsheetId, range, values) {
  return request(
    token,
    `spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    { method: "PUT", body: JSON.stringify({ values }) }
  );
}

/**
 * Cria versões com token vinculado para passar a módulos que esperam funções.
 */
export function makeRequestFn(token) {
  return (path, options = {}) => request(token, path, options);
}

export function makeUpdateFn(token) {
  return (spreadsheetId, range, values) => updateValues(token, spreadsheetId, range, values);
}

/**
 * Erro específico de token expirado — permite tratamento diferenciado na UI.
 */
export class TokenExpiredError extends Error {
  constructor(message) {
    super(message);
    this.name = "TokenExpiredError";
  }
}
