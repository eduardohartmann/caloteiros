/**
 * Testes para src/utils/formatters.js
 * Funções financeiras críticas — erros aqui significam dados incorretos.
 */
import { describe, it, expect } from "vitest";
import {
  amountFromInput,
  maskCurrency,
  brl,
  today,
  monthNow,
  newId,
  dateShort,
  dateBR
} from "../../src/utils/formatters.js";

// ─── amountFromInput ──────────────────────────────────────────────────────────

describe("amountFromInput", () => {
  it("converte formato brasileiro com vírgula decimal", () => {
    expect(amountFromInput("1.234,56")).toBe(1234.56);
  });

  it("converte valor simples com vírgula", () => {
    expect(amountFromInput("15,00")).toBe(15);
  });

  it("converte valor sem separador de milhar", () => {
    expect(amountFromInput("100,50")).toBe(100.5);
  });

  it("converte valor inteiro sem vírgula", () => {
    expect(amountFromInput("100")).toBe(100);
  });

  it("converte valor com espaços ao redor", () => {
    expect(amountFromInput("  50,00  ")).toBe(50);
  });

  it("retorna NaN para string vazia", () => {
    expect(amountFromInput("")).toBeNaN();
  });

  it("converte centavos corretamente", () => {
    expect(amountFromInput("0,01")).toBe(0.01);
  });

  it("converte valor grande com múltiplos pontos de milhar", () => {
    expect(amountFromInput("1.000.000,99")).toBe(1000000.99);
  });

  it("converte valor com espaço interno (edge case)", () => {
    expect(amountFromInput("1 000,50")).toBe(1000.5);
  });
});

// ─── maskCurrency ─────────────────────────────────────────────────────────────

describe("maskCurrency", () => {
  it("1 dígito → centavos", () => {
    expect(maskCurrency("1")).toBe("0,01");
  });

  it("2 dígitos → centavos", () => {
    expect(maskCurrency("15")).toBe("0,15");
  });

  it("3 dígitos → reais + centavos", () => {
    expect(maskCurrency("150")).toBe("1,50");
  });

  it("4 dígitos", () => {
    expect(maskCurrency("1500")).toBe("15,00");
  });

  it("6 dígitos com separador de milhar", () => {
    expect(maskCurrency("123456")).toBe("1.234,56");
  });

  it("string vazia retorna vazio", () => {
    expect(maskCurrency("")).toBe("");
  });

  it("zeros retorna 0,00", () => {
    expect(maskCurrency("000")).toBe("0,00");
  });

  it("ignora caracteres não numéricos", () => {
    expect(maskCurrency("abc123")).toBe("1,23");
  });

  it("valor grande com múltiplos separadores de milhar", () => {
    expect(maskCurrency("10000000")).toBe("100.000,00");
  });

  it("apenas um zero", () => {
    expect(maskCurrency("0")).toBe("0,00");
  });
});

// ─── brl ──────────────────────────────────────────────────────────────────────

describe("brl", () => {
  it("formata valor positivo", () => {
    const result = brl(1234.56);
    // Intl pode usar espaço normal ou non-breaking space
    expect(result).toMatch(/R\$\s*1[.\u00a0]?234,56/);
  });

  it("formata zero", () => {
    const result = brl(0);
    expect(result).toMatch(/R\$\s*0,00/);
  });

  it("formata centavos", () => {
    const result = brl(0.01);
    expect(result).toMatch(/R\$\s*0,01/);
  });

  it("formata valor negativo", () => {
    const result = brl(-50);
    expect(result).toMatch(/50,00/);
  });
});

// ─── today ────────────────────────────────────────────────────────────────────

describe("today", () => {
  it("retorna formato yyyy-mm-dd", () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("retorna data de hoje", () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    expect(today()).toBe(expected);
  });
});

// ─── monthNow ─────────────────────────────────────────────────────────────────

describe("monthNow", () => {
  it("retorna formato yyyy-mm", () => {
    expect(monthNow()).toMatch(/^\d{4}-\d{2}$/);
  });

  it("é prefixo de today()", () => {
    expect(monthNow()).toBe(today().slice(0, 7));
  });
});

// ─── newId ────────────────────────────────────────────────────────────────────

describe("newId", () => {
  it("retorna string não vazia", () => {
    const id = newId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("gera IDs únicos", () => {
    const ids = new Set(Array.from({ length: 100 }, () => newId()));
    expect(ids.size).toBe(100);
  });
});

// ─── dateShort ────────────────────────────────────────────────────────────────

describe("dateShort", () => {
  it("formata como dd/mm", () => {
    expect(dateShort("2024-03-15")).toBe("15/03");
  });

  it("formata primeiro dia do ano", () => {
    expect(dateShort("2024-01-01")).toBe("01/01");
  });
});

// ─── dateBR ───────────────────────────────────────────────────────────────────

describe("dateBR", () => {
  it("formata como dd/mm/yyyy", () => {
    expect(dateBR("2024-03-15")).toBe("15/03/2024");
  });

  it("formata data de fim de ano", () => {
    expect(dateBR("2024-12-31")).toBe("31/12/2024");
  });
});
