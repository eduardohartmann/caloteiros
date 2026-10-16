/**
 * auth.js
 * Autenticação OAuth2 via Google Identity Services (GIS) — token model.
 *
 * Substitui o antigo fluxo implícito via redirect. Agora o login acontece
 * em um popup oficial do Google (sem recarregar a página) e a renovação do
 * token é feita silenciosamente em background enquanto a sessão Google existir.
 *
 * Fluxo:
 * 1. connectGoogle(cb) → abre o popup de consentimento e devolve o token no callback
 * 2. refreshToken(cb)  → tenta renovar sem UI (prompt: "") quando o token expira
 * 3. revokeToken()     → revoga o access token (logout)
 *
 * Requer o script do GIS carregado no index.html:
 *   <script src="https://accounts.google.com/gsi/client" async defer></script>
 *
 * Docs: https://developers.google.com/identity/oauth2/web/guides/use-token-model
 */

import { GOOGLE_SCOPE } from "../constants.js";

let tokenClient = null;
let pendingCallback = null;

/** Lê o Client ID do ambiente e valida que foi configurado. */
function getClientId() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
  if (!clientId || clientId.includes("SUBSTITUA_")) {
    throw new Error("Configure VITE_GOOGLE_CLIENT_ID no arquivo .env antes de conectar.");
  }
  return clientId;
}

/** Garante que a biblioteca GIS foi carregada (script async no index.html). */
function getGoogleOAuth() {
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) {
    throw new Error("Biblioteca do Google ainda não carregou. Verifique sua conexão e tente novamente.");
  }
  return oauth2;
}

/**
 * Cria (uma única vez) o token client do GIS.
 * O callback é despachado para o `pendingCallback` da chamada atual, permitindo
 * reutilizar o mesmo client tanto para login quanto para refresh.
 */
function getTokenClient() {
  if (tokenClient) return tokenClient;

  const oauth2 = getGoogleOAuth();
  tokenClient = oauth2.initTokenClient({
    client_id: getClientId(),
    scope: GOOGLE_SCOPE,
    callback: (response) => {
      const cb = pendingCallback;
      pendingCallback = null;
      if (!cb) return;
      if (response.error) {
        cb(new Error(response.error_description || response.error), null);
        return;
      }
      cb(null, {
        accessToken: response.access_token,
        expiresIn: Number(response.expires_in) || 3600
      });
    },
    error_callback: (err) => {
      const cb = pendingCallback;
      pendingCallback = null;
      if (cb) cb(new Error(err?.message || "Falha ao autenticar com o Google."), null);
    }
  });

  return tokenClient;
}

/**
 * Inicia o fluxo de login interativo (popup de seleção de conta + consentimento).
 * @param {(err: Error|null, result: {accessToken: string, expiresIn: number}|null) => void} callback
 */
export function connectGoogle(callback) {
  const client = getTokenClient();
  pendingCallback = callback;
  // prompt "select_account" permite trocar de conta a cada login.
  client.requestAccessToken({ prompt: "select_account" });
}

/**
 * Tenta renovar o access token SEM interação (prompt vazio).
 * Funciona silenciosamente se a sessão do Google ainda estiver ativa e o
 * usuário já tiver concedido os scopes. Caso contrário, o callback recebe erro
 * e o chamador deve cair de volta no connectGoogle().
 * @param {(err: Error|null, result: {accessToken: string, expiresIn: number}|null) => void} callback
 */
export function refreshToken(callback) {
  const client = getTokenClient();
  pendingCallback = callback;
  client.requestAccessToken({ prompt: "" });
}

/**
 * Revoga o access token atual (best-effort, não bloqueia).
 * Usa a API do GIS quando disponível; cai no endpoint REST como fallback.
 */
export function revokeToken(token) {
  if (!token) return;
  const oauth2 = window.google?.accounts?.oauth2;
  if (oauth2?.revoke) {
    oauth2.revoke(token, () => {});
    return;
  }
  fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, { method: "POST" }).catch(() => {});
}
