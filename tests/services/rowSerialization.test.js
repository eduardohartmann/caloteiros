/**
 * Testes para serialização toRow/fromRow (googleSheets.js).
 *
 * Valida que o formato da linha na planilha é consistente:
 * [id, data, tipo, descricao, categoria, conta, valor, status, criadoEm, atualizadoEm, compartilhado, linkedId]
 */
import { describe, it, expect } from "vitest";
import { fromRow, toRow } from "../../src/services/googleSheets.js";
import { parseAmount } from "../../src/utils/formatters.js";

// ─── parseAmount ──────────────────────────────────────────────────────────────

describe("parseAmount (googleSheets)", () => {
  it("retorna 0 para null", () => {
    expect(parseAmount(null)).toBe(0);
  });

  it("retorna 0 para undefined", () => {
    expect(parseAmount(undefined)).toBe(0);
  });

  it("retorna 0 para string vazia", () => {
    expect(parseAmount("")).toBe(0);
  });

  it("converte número direto", () => {
    expect(parseAmount(123.45)).toBe(123.45);
  });

  it("converte string numérica simples", () => {
    expect(parseAmount("100")).toBe(100);
  });

  it("converte string com ponto decimal (padrão EN)", () => {
    expect(parseAmount("99.99")).toBe(99.99);
  });

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

  it("retorna 0 para string não numérica", () => {
    expect(parseAmount("abc")).toBe(0);
  });

  it("converte zero", () => {
    expect(parseAmount(0)).toBe(0);
  });

  it("converte string '0,00'", () => {
    expect(parseAmount("0,00")).toBe(0);
  });
});

// ─── fromRow ──────────────────────────────────────────────────────────────────

describe("fromRow", () => {
  it("converte linha completa para objeto de transação", () => {
    const row = [
      "uuid-123", "2024-03-15", "expense", "Supermercado",
      "cat-alimentacao", "acc-corrente", "150.50",
      "Confirmado", "2024-03-15T10:00:00Z", "2024-03-15T10:00:00Z",
      "true", "linked-456"
    ];
    const result = fromRow(row, 0);

    expect(result.id).toBe("uuid-123");
    expect(result.date).toBe("2024-03-15");
    expect(result.type).toBe("expense");
    expect(result.description).toBe("Supermercado");
    expect(result.category).toBe("cat-alimentacao");
    expect(result.account).toBe("acc-corrente");
    expect(result.amount).toBe(150.50);
    expect(result.createdAt).toBe("2024-03-15T10:00:00Z");
    expect(result.shared).toBe(true);
    expect(result.linkedId).toBe("linked-456");
    expect(result.rowNumber).toBe(2);
  });

  it("retorna null para linha sem id", () => {
    const row = ["", "2024-03-15", "expense"];
    expect(fromRow(row, 0)).toBeNull();
  });

  it("lida com campos ausentes gracefully", () => {
    const row = ["uuid-789", "2024-01-01", "income", "Salário", "cat-salario", "acc-corrente", "5000"];
    const result = fromRow(row, 5);

    expect(result.id).toBe("uuid-789");
    expect(result.amount).toBe(5000);
    expect(result.createdAt).toBe("");
    expect(result.shared).toBe(false);
    expect(result.linkedId).toBe("");
    expect(result.rowNumber).toBe(7);
  });

  it("parseia amount em formato brasileiro", () => {
    const row = ["id-1", "2024-01-01", "expense", "Test", "cat", "acc", "1.234,56", "Confirmado", "", "", "", ""];
    const result = fromRow(row, 0);
    expect(result.amount).toBe(1234.56);
  });

  it("calcula rowNumber correto para diferentes índices", () => {
    const row = ["id-1", "2024-01-01", "expense", "Test", "cat", "acc", "100"];
    expect(fromRow(row, 0).rowNumber).toBe(2);
    expect(fromRow(row, 10).rowNumber).toBe(12);
    expect(fromRow(row, 99).rowNumber).toBe(101);
  });
});

// ─── toRow ────────────────────────────────────────────────────────────────────

describe("toRow", () => {
  it("serializa transação de despesa", () => {
    const transaction = {
      id: "uuid-123",
      date: "2024-03-15",
      type: "expense",
      description: "Supermercado",
      category: "cat-alimentacao",
      account: "acc-corrente",
      amount: 150.50,
      createdAt: "2024-03-15T10:00:00Z",
      split: false,
      linkedId: ""
    };
    const row = toRow(transaction);

    expect(row[0]).toBe("uuid-123");
    expect(row[1]).toBe("2024-03-15");
    expect(row[2]).toBe("expense");
    expect(row[3]).toBe("Supermercado");
    expect(row[4]).toBe("cat-alimentacao");
    expect(row[5]).toBe("acc-corrente");
    expect(row[6]).toBe(150.50);
    expect(row[7]).toBe("Confirmado");
    expect(row[8]).toBe("2024-03-15T10:00:00Z");
    expect(row[10]).toBe("");
    expect(row[11]).toBe("");
    expect(row).toHaveLength(12);
  });

  it("marca compartilhado quando split=true", () => {
    const transaction = {
      id: "id", date: "2024-01-01", type: "expense",
      description: "Test", category: "cat", account: "acc",
      amount: 100, createdAt: "", split: true, linkedId: ""
    };
    const row = toRow(transaction);
    expect(row[10]).toBe("true");
  });

  it("inclui linkedId quando presente", () => {
    const transaction = {
      id: "id-out", date: "2024-01-01", type: "expense",
      description: "Transferência", category: "cat-transferencia", account: "acc-1",
      amount: 500, createdAt: "", split: false, linkedId: "id-in"
    };
    const row = toRow(transaction);
    expect(row[11]).toBe("id-in");
  });

  it("roundtrip: toRow → fromRow preserva dados", () => {
    const original = {
      id: "roundtrip-id",
      date: "2024-06-20",
      type: "income",
      description: "Freelance",
      category: "cat-freelance",
      account: "acc-corrente",
      amount: 3500,
      createdAt: "2024-06-20T08:00:00Z",
      split: true,
      linkedId: "link-123"
    };
    const row = toRow(original);
    const restored = fromRow(row, 0);

    expect(restored.id).toBe(original.id);
    expect(restored.date).toBe(original.date);
    expect(restored.type).toBe(original.type);
    expect(restored.description).toBe(original.description);
    expect(restored.category).toBe(original.category);
    expect(restored.account).toBe(original.account);
    expect(restored.amount).toBe(original.amount);
    expect(restored.createdAt).toBe(original.createdAt);
    expect(restored.shared).toBe(true);
    expect(restored.linkedId).toBe(original.linkedId);
  });
});
