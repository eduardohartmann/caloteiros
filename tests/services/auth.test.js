/**
 * Testes para src/services/auth.js
 * extractTokenFromUrl, redirectToGoogle, revokeToken
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { extractTokenFromUrl, revokeToken } from "../../src/services/auth.js";

// ─── setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Reset hash e history mock
  window.location.hash = "";
  vi.restoreAllMocks();
});

// ─── extractTokenFromUrl ──────────────────────────────────────────────────────

describe("extractTokenFromUrl", () => {
  it("retorna null quando não há hash", () => {
    window.location.hash = "";
    expect(extractTokenFromUrl()).toBeNull();
  });

  it("retorna null para hashes de rota do app (#/...)", () => {
    window.location.hash = "#/visao-geral";
    expect(extractTokenFromUrl()).toBeNull();
  });

  it("retorna null para hash #/ (welcome)", () => {
    window.location.hash = "#/";
    expect(extractTokenFromUrl()).toBeNull();
  });

  it("extrai access_token do hash de retorno OAuth", () => {
    const spy = vi.spyOn(window.history, "replaceState");
    window.location.hash = "#access_token=ya29.abc123&token_type=Bearer&expires_in=3600";

    const token = extractTokenFromUrl();

    expect(token).toBe("ya29.abc123");
    expect(spy).toHaveBeenCalled(); // Limpa o hash
    spy.mockRestore();
  });

  it("retorna null (e limpa hash) quando OAuth retorna error", () => {
    const spy = vi.spyOn(window.history, "replaceState");
    window.location.hash = "#error=access_denied&error_description=User+denied";

    const token = extractTokenFromUrl();

    expect(token).toBeNull();
    expect(spy).toHaveBeenCalled(); // Ainda limpa o hash
    spy.mockRestore();
  });

  it("retorna null para hash desconhecido sem parâmetros OAuth", () => {
    window.location.hash = "#qualquer-coisa-sem-parametros-oauth";
    // Sem access_token, error, token_type, iss ou state → não é OAuth
    expect(extractTokenFromUrl()).toBeNull();
  });

  it("detecta retorno OAuth por token_type mesmo sem access_token", () => {
    const spy = vi.spyOn(window.history, "replaceState");
    window.location.hash = "#token_type=Bearer";

    const token = extractTokenFromUrl();

    expect(token).toBeNull(); // Não tem access_token, mas é OAuth return
    expect(spy).toHaveBeenCalled(); // Limpa hash
    spy.mockRestore();
  });

  it("detecta retorno OAuth por state parameter", () => {
    const spy = vi.spyOn(window.history, "replaceState");
    window.location.hash = "#state=abc123";

    const token = extractTokenFromUrl();

    expect(token).toBeNull();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("não limpa hash de rotas válidas do app", () => {
    const spy = vi.spyOn(window.history, "replaceState");
    window.location.hash = "#/configuracoes";

    extractTokenFromUrl();

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

// ─── revokeToken ──────────────────────────────────────────────────────────────

describe("revokeToken", () => {
  it("não faz nada com token vazio", () => {
    const spy = vi.spyOn(globalThis, "fetch");
    revokeToken("");
    revokeToken(null);
    revokeToken(undefined);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("faz POST para endpoint de revogação com token", () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true });
    revokeToken("my-token-123");

    expect(spy).toHaveBeenCalledWith(
      "https://oauth2.googleapis.com/revoke?token=my-token-123",
      { method: "POST" }
    );
    spy.mockRestore();
  });

  it("não lança erro se fetch falhar (best-effort)", () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    // Não deve lançar
    expect(() => revokeToken("token")).not.toThrow();
  });
});
