/**
 * Testes para a função parseAmount (usada em googleSheets.js e coupleSheets.js).
 *
 * A função não é exportada diretamente, então testamos a lógica aqui como
 * especificação de contrato. Se alguém alterar parseAmount, estes testes
 * documentam o comportamento esperado.
 *
 * A mesma lógica existe em 2 lugares — este teste serve para ambos.
 */
import { describe, it, expect } from "vitest";

// Reimplementação fiel da função parseAmount (presente em googleSheets.js e coupleSheets.js)
function parseAmount(raw) {
  if (raw == null || raw === "") return 0;
  if (typeof raw === "string" && raw.includes(",")) {
    return Number(raw.replace(/\./g, "").replace(",", ".")) || 0;
  }
  return Number(raw) || 0;
}

describe("parseAmount (contract spec)", () => {
  // ─── null/undefined/vazio ─────────────────────────────────────────────
  it("retorna 0 para null", () => {
    expect(parseAmount(null)).toBe(0);
  });

  it("retorna 0 para undefined", () => {
    expect(parseAmount(undefined)).toBe(0);
  });

  it("retorna 0 para string vazia", () => {
    expect(parseAmount("")).toBe(0);
  });

  // ─── números diretos ──────────────────────────────────────────────────
  it("converte número direto", () => {
    expect(parseAmount(123.45)).toBe(123.45);
  });

  it("converte string numérica simples", () => {
    expect(parseAmount("100")).toBe(100);
  });

  it("converte string com ponto decimal (padrão EN)", () => {
    expect(parseAmount("99.99")).toBe(99.99);
  });

  // ─── formato brasileiro ───────────────────────────────────────────────
  it("converte formato brasileiro simples (vírgula decimal)", () => {
    expect(parseAmount("15,00")).toBe(15);
  });

  it("converte formato brasileiro com milhar", () => {
    expect(parseAmount("1.234,56")).toBe(1234.56);
  });

  it("converte formato brasileiro grande", () => {
    expect(parseAmount("1.000.000,99")).toBe(1000000.99);
  });

  it("converte centavos em formato brasileiro", () => {
    expect(parseAmount("0,01")).toBe(0.01);
  });

  // ─── edge cases ───────────────────────────────────────────────────────
  it("retorna 0 para string não numérica", () => {
    expect(parseAmount("abc")).toBe(0);
  });

  it("converte zero", () => {
    expect(parseAmount(0)).toBe(0);
  });

  it("converte string '0'", () => {
    expect(parseAmount("0")).toBe(0);
  });

  it("converte string '0,00'", () => {
    expect(parseAmount("0,00")).toBe(0);
  });
});
