/**
 * Testes para src/routes.js
 * currentRoute, navigate, ROUTES, DASHBOARD_ROUTES
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ROUTES, DASHBOARD_ROUTES, currentRoute, navigate } from "../src/routes.js";

// ─── setup: mock window.location e window.history ─────────────────────────────

beforeEach(() => {
  // Reset hash
  window.location.hash = "";
});

// ─── ROUTES ───────────────────────────────────────────────────────────────────

describe("ROUTES", () => {
  it("contém todas as rotas esperadas", () => {
    expect(ROUTES.welcome).toBe("/");
    expect(ROUTES.overview).toBe("/visao-geral");
    expect(ROUTES.categories).toBe("/categorias");
    expect(ROUTES.incomes).toBe("/receitas");
    expect(ROUTES.newTransaction).toBe("/novo-lancamento");
    expect(ROUTES.couple).toBe("/casal");
    expect(ROUTES.settings).toBe("/configuracoes");
  });

  it("todas as rotas começam com /", () => {
    for (const route of Object.values(ROUTES)) {
      expect(route).toMatch(/^\//);
    }
  });
});

// ─── DASHBOARD_ROUTES ─────────────────────────────────────────────────────────

describe("DASHBOARD_ROUTES", () => {
  it("cada item tem id, path, label, shortLabel e icon", () => {
    for (const item of DASHBOARD_ROUTES) {
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("path");
      expect(item).toHaveProperty("label");
      expect(item).toHaveProperty("shortLabel");
      expect(item).toHaveProperty("icon");
    }
  });

  it("todos os paths referenciam rotas válidas", () => {
    const validPaths = Object.values(ROUTES);
    for (const item of DASHBOARD_ROUTES) {
      expect(validPaths).toContain(item.path);
    }
  });

  it("contém ao menos overview e settings", () => {
    const ids = DASHBOARD_ROUTES.map((r) => r.id);
    expect(ids).toContain("overview");
    expect(ids).toContain("settings");
  });
});

// ─── currentRoute ─────────────────────────────────────────────────────────────

describe("currentRoute", () => {
  it("retorna welcome (/) quando hash está vazio", () => {
    window.location.hash = "";
    expect(currentRoute()).toBe(ROUTES.welcome);
  });

  it("retorna a rota correta para hash válido", () => {
    window.location.hash = "#/visao-geral";
    expect(currentRoute()).toBe(ROUTES.overview);
  });

  it("retorna a rota de categorias", () => {
    window.location.hash = "#/categorias";
    expect(currentRoute()).toBe(ROUTES.categories);
  });

  it("retorna welcome para hash inválido (rota não existe)", () => {
    window.location.hash = "#/rota-inexistente";
    expect(currentRoute()).toBe(ROUTES.welcome);
  });

  it("retorna welcome para hash sem barra", () => {
    window.location.hash = "#invalido";
    expect(currentRoute()).toBe(ROUTES.welcome);
  });
});

// ─── navigate ─────────────────────────────────────────────────────────────────

describe("navigate", () => {
  it("navega para uma rota do dashboard (altera hash)", () => {
    const spy = vi.spyOn(window.history, "pushState");
    navigate(ROUTES.overview);
    expect(spy).toHaveBeenCalledWith({}, "", "#/visao-geral");
    spy.mockRestore();
  });

  it("navega para welcome removendo o hash", () => {
    const spy = vi.spyOn(window.history, "pushState");
    navigate(ROUTES.welcome);
    // Welcome não tem hash — usa pathname + search
    expect(spy).toHaveBeenCalled();
    const calledUrl = spy.mock.calls[0][2];
    expect(calledUrl).not.toContain("#");
    spy.mockRestore();
  });

  it("usa replaceState quando replace=true", () => {
    const spy = vi.spyOn(window.history, "replaceState");
    navigate(ROUTES.settings, true);
    expect(spy).toHaveBeenCalledWith({}, "", "#/configuracoes");
    spy.mockRestore();
  });

  it("dispara evento popstate após navegar", () => {
    const handler = vi.fn();
    window.addEventListener("popstate", handler);
    navigate(ROUTES.couple);
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener("popstate", handler);
  });
});
