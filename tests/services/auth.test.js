/**
 * Testes para src/services/auth.js
 * connectGoogle, refreshToken, revokeToken (Google Identity Services — token model)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ─── setup ────────────────────────────────────────────────────────────────────

let lastInit;
let requestSpy;
let auth; // módulo recarregado a cada teste (reseta o singleton tokenClient)

beforeEach(async () => {
  vi.restoreAllMocks();
  vi.resetModules(); // zera o cache do módulo → tokenClient recriado por teste
  lastInit = null;
  requestSpy = vi.fn();

  // Mock da biblioteca GIS (window.google.accounts.oauth2)
  globalThis.window = globalThis.window || {};
  window.google = {
    accounts: {
      oauth2: {
        initTokenClient: vi.fn((config) => {
          lastInit = config;
          return { requestAccessToken: requestSpy };
        }),
        revoke: vi.fn((token, cb) => cb && cb())
      }
    }
  };

  // Client ID válido no ambiente
  import.meta.env.VITE_GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com";

  auth = await import("../../src/services/auth.js");
});

afterEach(() => {
  delete window.google;
});

// ─── connectGoogle ────────────────────────────────────────────────────────────

describe("connectGoogle", () => {
  it("inicia o fluxo interativo com prompt select_account", () => {
    auth.connectGoogle(() => {});
    expect(window.google.accounts.oauth2.initTokenClient).toHaveBeenCalled();
    expect(requestSpy).toHaveBeenCalledWith({ prompt: "select_account" });
  });

  it("entrega accessToken e expiresIn no callback em caso de sucesso", () => {
    const cb = vi.fn();
    auth.connectGoogle(cb);
    // Simula o Google chamando o callback do token client
    lastInit.callback({ access_token: "ya29.abc", expires_in: "3600" });
    expect(cb).toHaveBeenCalledWith(null, { accessToken: "ya29.abc", expiresIn: 3600 });
  });

  it("entrega erro no callback quando a resposta contém error", () => {
    const cb = vi.fn();
    auth.connectGoogle(cb);
    lastInit.callback({ error: "access_denied", error_description: "User denied" });
    expect(cb).toHaveBeenCalledWith(expect.any(Error), null);
    expect(cb.mock.calls[0][0].message).toBe("User denied");
  });
});

// ─── refreshToken ─────────────────────────────────────────────────────────────

describe("refreshToken", () => {
  it("tenta renovar silenciosamente com prompt vazio", () => {
    auth.refreshToken(() => {});
    expect(requestSpy).toHaveBeenCalledWith({ prompt: "" });
  });

  it("reutiliza o mesmo token client (initTokenClient chamado uma vez)", () => {
    auth.connectGoogle(() => {});
    auth.refreshToken(() => {});
    expect(window.google.accounts.oauth2.initTokenClient).toHaveBeenCalledTimes(1);
  });
});

// ─── revokeToken ──────────────────────────────────────────────────────────────

describe("revokeToken", () => {
  it("não faz nada com token vazio", () => {
    auth.revokeToken("");
    auth.revokeToken(null);
    auth.revokeToken(undefined);
    expect(window.google.accounts.oauth2.revoke).not.toHaveBeenCalled();
  });

  it("usa google.accounts.oauth2.revoke quando disponível", () => {
    auth.revokeToken("my-token-123");
    expect(window.google.accounts.oauth2.revoke).toHaveBeenCalledWith(
      "my-token-123",
      expect.any(Function)
    );
  });

  it("cai no endpoint REST quando a API do GIS não expõe revoke", () => {
    delete window.google.accounts.oauth2.revoke;
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true });
    auth.revokeToken("my-token-123");
    expect(spy).toHaveBeenCalledWith(
      "https://oauth2.googleapis.com/revoke?token=my-token-123",
      { method: "POST" }
    );
  });

  it("não lança erro se fetch falhar (best-effort)", () => {
    delete window.google.accounts.oauth2.revoke;
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));
    expect(() => auth.revokeToken("token")).not.toThrow();
  });
});
