/**
 * Testes para serialização de coupleSheets.js (rowToEntry/entryToRow).
 *
 * Colunas de Divisao (A→J):
 *   id | data | descricao | valorTotal | valorDevido | status | cadastradoPor | criadoEm | transacaoOrigem | transacaoPagamento
 */
import { describe, it, expect } from "vitest";

// Reimplementação fiel de parseAmount (coupleSheets.js)
function parseAmount(raw) {
  if (raw == null || raw === "") return 0;
  if (typeof raw === "string" && raw.includes(",")) {
    return Number(raw.replace(/\./g, "").replace(",", ".")) || 0;
  }
  return Number(raw) || 0;
}

// Reimplementação fiel de rowToEntry (coupleSheets.js)
function rowToEntry(row, index) {
  if (!row[0]) return null;
  return {
    id: row[0],
    date: row[1],
    description: row[2],
    totalAmount: parseAmount(row[3]),
    amountDue: parseAmount(row[4]),
    status: row[5] || "pendente",
    createdBy: row[6] || "",
    createdAt: row[7] || "",
    sourceTransactionId: row[8] || "",
    paymentTransactionId: row[9] || "",
    rowNumber: index + 2
  };
}

// Reimplementação fiel de entryToRow (coupleSheets.js)
function entryToRow(entry) {
  return [
    entry.id,
    entry.date,
    entry.description,
    entry.totalAmount,
    entry.amountDue,
    entry.status,
    entry.createdBy,
    entry.createdAt,
    entry.sourceTransactionId || "",
    entry.paymentTransactionId || ""
  ];
}

// ─── rowToEntry ───────────────────────────────────────────────────────────────

describe("rowToEntry (couple contract spec)", () => {
  it("converte linha completa para entry", () => {
    const row = [
      "entry-1", "2024-03-15", "Supermercado",
      "200", "100", "pendente",
      "Eduardo", "2024-03-15T10:00:00Z",
      "txn-origin-1", ""
    ];
    const result = rowToEntry(row, 0);

    expect(result.id).toBe("entry-1");
    expect(result.date).toBe("2024-03-15");
    expect(result.description).toBe("Supermercado");
    expect(result.totalAmount).toBe(200);
    expect(result.amountDue).toBe(100);
    expect(result.status).toBe("pendente");
    expect(result.createdBy).toBe("Eduardo");
    expect(result.sourceTransactionId).toBe("txn-origin-1");
    expect(result.paymentTransactionId).toBe("");
    expect(result.rowNumber).toBe(2);
  });

  it("retorna null para linha sem id", () => {
    const row = ["", "2024-01-01", "Teste"];
    expect(rowToEntry(row, 0)).toBeNull();
  });

  it("parseia valores em formato brasileiro", () => {
    const row = ["id-1", "2024-01-01", "Test", "1.500,00", "750,00", "pago", "", "", "", ""];
    const result = rowToEntry(row, 3);
    expect(result.totalAmount).toBe(1500);
    expect(result.amountDue).toBe(750);
    expect(result.rowNumber).toBe(5);
  });

  it("status default é 'pendente' quando vazio", () => {
    const row = ["id-1", "2024-01-01", "Test", "100", "50", "", "", "", "", ""];
    const result = rowToEntry(row, 0);
    expect(result.status).toBe("pendente");
  });

  it("preserva status 'confirmado'", () => {
    const row = ["id-1", "2024-01-01", "Test", "100", "50", "confirmado", "", "", "", "pay-txn-1"];
    const result = rowToEntry(row, 0);
    expect(result.status).toBe("confirmado");
    expect(result.paymentTransactionId).toBe("pay-txn-1");
  });
});

// ─── entryToRow ───────────────────────────────────────────────────────────────

describe("entryToRow (couple contract spec)", () => {
  it("serializa entry completo", () => {
    const entry = {
      id: "entry-1",
      date: "2024-03-15",
      description: "Jantar",
      totalAmount: 180,
      amountDue: 90,
      status: "pendente",
      createdBy: "Eduardo",
      createdAt: "2024-03-15T20:00:00Z",
      sourceTransactionId: "txn-1",
      paymentTransactionId: ""
    };
    const row = entryToRow(entry);

    expect(row[0]).toBe("entry-1");
    expect(row[1]).toBe("2024-03-15");
    expect(row[2]).toBe("Jantar");
    expect(row[3]).toBe(180);
    expect(row[4]).toBe(90);
    expect(row[5]).toBe("pendente");
    expect(row[6]).toBe("Eduardo");
    expect(row[7]).toBe("2024-03-15T20:00:00Z");
    expect(row[8]).toBe("txn-1");
    expect(row[9]).toBe("");
    expect(row).toHaveLength(10);
  });

  it("roundtrip: entryToRow → rowToEntry preserva dados", () => {
    const original = {
      id: "roundtrip-entry",
      date: "2024-06-01",
      description: "Aluguel",
      totalAmount: 2000,
      amountDue: 1000,
      status: "pago",
      createdBy: "Partner",
      createdAt: "2024-06-01T12:00:00Z",
      sourceTransactionId: "src-txn",
      paymentTransactionId: "pay-txn"
    };
    const row = entryToRow(original);
    const restored = rowToEntry(row, 5);

    expect(restored.id).toBe(original.id);
    expect(restored.date).toBe(original.date);
    expect(restored.description).toBe(original.description);
    expect(restored.totalAmount).toBe(original.totalAmount);
    expect(restored.amountDue).toBe(original.amountDue);
    expect(restored.status).toBe(original.status);
    expect(restored.createdBy).toBe(original.createdBy);
    expect(restored.createdAt).toBe(original.createdAt);
    expect(restored.sourceTransactionId).toBe(original.sourceTransactionId);
    expect(restored.paymentTransactionId).toBe(original.paymentTransactionId);
  });

  it("divisão 50/50 com precisão de centavos", () => {
    // Simula a lógica do useTransactions: divisão inteira em centavos
    const amount = 151.73;
    const totalCents = Math.round(amount * 100);
    const halfCents = Math.floor(totalCents / 2);
    const amountDue = halfCents / 100;

    expect(amountDue).toBe(75.86); // floor(15173/2) = 7586 → 75.86
    expect(totalCents).toBe(15173);

    const entry = {
      id: "split-test", date: "2024-01-01", description: "Odd amount",
      totalAmount: amount, amountDue,
      status: "pendente", createdBy: "Test", createdAt: "",
      sourceTransactionId: "", paymentTransactionId: ""
    };
    const row = entryToRow(entry);
    const restored = rowToEntry(row, 0);

    expect(restored.totalAmount).toBe(151.73);
    expect(restored.amountDue).toBe(75.86);
  });
});
