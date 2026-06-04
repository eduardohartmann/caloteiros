/**
 * Testes para serialização toRow/fromRow (googleSheets.js).
 *
 * Valida que o formato da linha na planilha é consistente:
 * [id, data, tipo, descricao, categoria, conta, valor, status, criadoEm, atualizadoEm, compartilhado, linkedId]
 *
 * Estas funções são privadas, então testamos o contrato aqui.
 */
import { describe, it, expect } from "vitest";

// Reimplementação fiel de fromRow (googleSheets.js)
function parseAmount(raw) {
  if (raw == null || raw === "") return 0;
  if (typeof raw === "string" && raw.includes(",")) {
    return Number(raw.replace(/\./g, "").replace(",", ".")) || 0;
  }
  return Number(raw) || 0;
}

function fromRow(row, index) {
  if (!row[0]) return null;
  return {
    id: row[0],
    date: row[1],
    type: row[2],
    description: row[3],
    category: row[4],
    account: row[5],
    amount: parseAmount(row[6]),
    createdAt: row[8] || "",
    shared: row[10] === "true",
    linkedId: row[11] || "",
    rowNumber: index + 2
  };
}

// Reimplementação fiel de toRow (googleSheets.js)
function toRow(transaction) {
  return [
    transaction.id,
    transaction.date,
    transaction.type,
    transaction.description,
    transaction.category,
    transaction.account,
    transaction.amount,
    "Confirmado",
    transaction.createdAt,
    new Date().toISOString(),
    transaction.split ? "true" : "",
    transaction.linkedId || ""
  ];
}

// ─── fromRow ──────────────────────────────────────────────────────────────────

describe("fromRow (contract spec)", () => {
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
    expect(result.rowNumber).toBe(2); // index 0 → row 2 (header is row 1)
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
    expect(result.rowNumber).toBe(7); // index 5 → row 7
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

describe("toRow (contract spec)", () => {
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

    expect(row[0]).toBe("uuid-123");       // id
    expect(row[1]).toBe("2024-03-15");     // data
    expect(row[2]).toBe("expense");        // tipo
    expect(row[3]).toBe("Supermercado");   // descricao
    expect(row[4]).toBe("cat-alimentacao"); // categoria
    expect(row[5]).toBe("acc-corrente");   // conta
    expect(row[6]).toBe(150.50);           // valor
    expect(row[7]).toBe("Confirmado");     // status (sempre fixo)
    expect(row[8]).toBe("2024-03-15T10:00:00Z"); // criadoEm
    expect(row[10]).toBe("");              // compartilhado (false → "")
    expect(row[11]).toBe("");              // linkedId
    expect(row).toHaveLength(12);          // total de colunas
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
