/**
 * auth.js
 * Autenticação OAuth2 via redirect (sem popup).
 *
 * Fluxo:
 * 1. connectGoogle() → redireciona para accounts.google.com
 * 2. Google redireciona de volta com access_token no hash da URL
 * 3. extractTokenFromUrl() → lê o token do hash e limpa a URL
 *
 * Funciona em qualquer browser, PWA instalada, e nunca é bloqueado.
 */

import { GOOGLE_SCOPE } from "../constants.js";

/**
 * Redireciona o usuário para a tela de login do Google.
 * Após autorizar, o Google redireciona de volta para a URL atual
 * com o access_token no fragment (#).
 */
export function redirectToGoogle() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
  if (!clientId || clientId.includes("SUBSTITUA_")) {
    throw new Error("Configure VITE_GOOGLE_CLIENT_ID no arquivo .env antes de conectar.");
  }

  // A redirect_uri deve ser a URL base do app (sem hash/query)
  const redirectUri = window.location.origin + window.location.pathname;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "token",
    scope: GOOGLE_SCOPE,
    include_granted_scopes: "true",
    // prompt: "select_account" permite trocar de conta
    // prompt: "consent" força re-autorização
    prompt: "select_account"
  });

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Verifica se a URL atual contém um retorno do OAuth do Google.
 * Detecta: access_token (sucesso), error (falha), ou outros parâmetros OAuth (iss, state, etc.)
 * Se for retorno OAuth, limpa o hash e retorna o token (ou null se falhou).
 * Se não for OAuth (hash normal do app como #/visao-geral), retorna null sem limpar.
 */
export function extractTokenFromUrl() {
  const hash = window.location.hash;
  if (!hash || hash.length < 2) return null;

  // Hashes do app começam com #/ (rotas)
  if (hash.startsWith("#/")) return null;

  const params = new URLSearchParams(hash.substring(1));
  const accessToken = params.get("access_token");

  // Se tem qualquer parâmetro OAuth (access_token, error, token_type, iss, state),
  // é um retorno do Google — limpa o hash independente do resultado
  const isOAuthReturn = accessToken ||
    params.has("error") ||
    params.has("token_type") ||
    params.has("iss") ||
    params.has("state");

  if (!isOAuthReturn) return null;   // hash desconhecido, não mexe

  // Limpa o hash da URL
  const cleanUrl = window.location.origin + window.location.pathname;
  window.history.replaceState({}, "", cleanUrl);

  return accessToken || null;
}

/**
 * Revoga o token atual (best-effort, não bloqueia).
 */
export function revokeToken(token) {
  if (!token) return;
  fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, { method: "POST" }).catch(() => {});
}
