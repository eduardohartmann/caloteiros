/**
 * Testes para src/utils/resolvers.js
 * Mapas de resolução id→nome usados em toda a UI.
 */
import { describe, it, expect } from "vitest";
import { buildCategoryMap, buildAccountMap, createResolvers } from "../../src/utils/resolvers.js";

const CATEGORIES = [
  { id: "cat-moradia", name: "Moradia" },
  { id: "cat-alimentacao", name: "Alimentação" },
  { id: "cat-transporte", name: "Transporte" }
];

const ACCOUNTS = [
  { id: "acc-corrente", name: "Conta corrente" },
  { id: "acc-cartao", name: "Cartão de crédito" }
];

// ─── buildCategoryMap ─────────────────────────────────────────────────────────

describe("buildCategoryMap", () => {
  it("cria mapa id→nome", () => {
    const map = buildCategoryMap(CATEGORIES);
    expect(map["cat-moradia"]).toBe("Moradia");
    expect(map["cat-alimentacao"]).toBe("Alimentação");
    expect(map["cat-transporte"]).toBe("Transporte");
  });

  it("retorna null para lista vazia", () => {
    expect(buildCategoryMap([])).toBeNull();
  });

  it("retorna null para null/undefined", () => {
    expect(buildCategoryMap(null)).toBeNull();
    expect(buildCategoryMap(undefined)).toBeNull();
  });
});

// ─── buildAccountMap ──────────────────────────────────────────────────────────

describe("buildAccountMap", () => {
  it("cria mapa id→nome", () => {
    const map = buildAccountMap(ACCOUNTS);
    expect(map["acc-corrente"]).toBe("Conta corrente");
    expect(map["acc-cartao"]).toBe("Cartão de crédito");
  });

  it("retorna null para lista vazia", () => {
    expect(buildAccountMap([])).toBeNull();
  });

  it("retorna null para null/undefined", () => {
    expect(buildAccountMap(null)).toBeNull();
    expect(buildAccountMap(undefined)).toBeNull();
  });
});

// ─── createResolvers ──────────────────────────────────────────────────────────

describe("createResolvers", () => {
  it("resolve categoria por id", () => {
    const { category } = createResolvers(CATEGORIES, ACCOUNTS);
    expect(category("cat-moradia")).toBe("Moradia");
  });

  it("resolve conta por id", () => {
    const { account } = createResolvers(CATEGORIES, ACCOUNTS);
    expect(account("acc-corrente")).toBe("Conta corrente");
  });

  it("retorna o próprio id quando não encontra", () => {
    const { category, account } = createResolvers(CATEGORIES, ACCOUNTS);
    expect(category("cat-inexistente")).toBe("cat-inexistente");
    expect(account("acc-inexistente")).toBe("acc-inexistente");
  });

  it("lida com listas vazias", () => {
    const { category, account } = createResolvers([], []);
    expect(category("any")).toBe("any");
    expect(account("any")).toBe("any");
  });
});
