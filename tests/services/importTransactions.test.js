/**
 * Testes para src/services/importTransactions.js
 * Funções exportadas: analyzeImportData, buildCategoryMap, buildAccountMap, buildRows
 */
import { describe, it, expect } from "vitest";
import { analyzeImportData, buildCategoryMap, buildAccountMap, buildRows } from "../../src/services/importTransactions.js";

const CATEGORIES = [
  { id: "cat-transferencia", parentId: "", name: "Transferência", icon: "🔄", color: "#6C7A89", active: true },
  { id: "cat-alimentacao", parentId: "", name: "Alimentação", icon: "🍔", color: "#E8A838", active: true },
  { id: "cat-mercado", parentId: "cat-alimentacao", name: "Supermercado", icon: "🛒", color: "#E8A838", active: true },
  { id: "cat-transporte", parentId: "", name: "Transporte", icon: "🚗", color: "#7B68EE", active: true },
  { id: "cat-salario", parentId: "", name: "Salário", icon: "💰", color: "#2ECC71", active: true }
];

const ACCOUNTS = [
  { id: "acc-corrente", name: "Conta corrente", active: true },
  { id: "acc-cartao", name: "Cartão de crédito", active: true },
  { id: "acc-invest", name: "Investimentos", active: true }
];

// ─── analyzeImportData ────────────────────────────────────────────────────────

describe("analyzeImportData", () => {
  it("classifica lançamentos normais de receita e despesa", () => {
    const rawData = [
      { date: "15/03/2024", description: "Salario", amount: 5000, category: "Salário", account: "Conta corrente" },
      { date: "16/03/2024", description: "Mercado", amount: -200, category: "Supermercado", account: "Cartão de crédito" }
    ];

    const result = analyzeImportData(rawData, CATEGORIES, ACCOUNTS);

    expect(result.entries).toHaveLength(2);
    expect(result.transfers).toHaveLength(0);
    expect(result.unknownCategories).toHaveLength(0);
    expect(result.unknownAccounts).toHaveLength(0);
  });

  it("detecta pares de transferência", () => {
    const rawData = [
      { date: "10/03/2024", description: "Transferência entre contas", amount: -1000, category: "Transferência", account: "Conta corrente" },
      { date: "10/03/2024", description: "Transferência entre contas", amount: 1000, category: "Transferência", account: "Investimentos" }
    ];

    const result = analyzeImportData(rawData, CATEGORIES, ACCOUNTS);

    expect(result.entries).toHaveLength(0);
    expect(result.transfers).toHaveLength(1);
    expect(result.transfers[0].amount).toBe(1000);
    expect(result.transfers[0].sourceAccount).toBe("Conta corrente");
    expect(result.transfers[0].destAccount).toBe("Investimentos");
  });

  it("identifica categorias desconhecidas", () => {
    const rawData = [
      { date: "01/01/2024", description: "Netflix", amount: -40, category: "Streaming", account: "Conta corrente" }
    ];

    const result = analyzeImportData(rawData, CATEGORIES, ACCOUNTS);

    expect(result.unknownCategories).toHaveLength(1);
    expect(result.unknownCategories[0]).toBe("Streaming");
  });

  it("identifica contas desconhecidas", () => {
    const rawData = [
      { date: "01/01/2024", description: "Pix", amount: -50, category: "Alimentação", account: "Nubank" }
    ];

    const result = analyzeImportData(rawData, CATEGORIES, ACCOUNTS);

    expect(result.unknownAccounts).toHaveLength(1);
    expect(result.unknownAccounts[0]).toBe("Nubank");
  });

  it("não marca transferência como categoria desconhecida", () => {
    const rawData = [
      { date: "01/01/2024", description: "TED", amount: -500, category: "Transferência", account: "Conta corrente" }
    ];

    const result = analyzeImportData(rawData, CATEGORIES, ACCOUNTS);

    expect(result.unknownCategories).toHaveLength(0);
  });

  it("lida com array vazio", () => {
    const result = analyzeImportData([], CATEGORIES, ACCOUNTS);

    expect(result.entries).toHaveLength(0);
    expect(result.transfers).toHaveLength(0);
    expect(result.unknownCategories).toHaveLength(0);
    expect(result.unknownAccounts).toHaveLength(0);
  });

  it("case-insensitive para categorias e contas", () => {
    const rawData = [
      { date: "01/01/2024", description: "Test", amount: -10, category: "ALIMENTAÇÃO", account: "conta CORRENTE" }
    ];

    const result = analyzeImportData(rawData, CATEGORIES, ACCOUNTS);

    expect(result.unknownCategories).toHaveLength(0);
    expect(result.unknownAccounts).toHaveLength(0);
  });
});

// ─── buildCategoryMap / buildAccountMap ────────────────────────────────────────

describe("buildCategoryMap (importTransactions)", () => {
  it("mapeia nome lowercase → id", () => {
    const map = buildCategoryMap(CATEGORIES);
    expect(map.get("alimentação")).toBe("cat-alimentacao");
    expect(map.get("supermercado")).toBe("cat-mercado");
    expect(map.get("salário")).toBe("cat-salario");
  });

  it("inclui categorias adicionais do usuário", () => {
    const newCats = [{ name: "Streaming", id: "cat-streaming" }];
    const map = buildCategoryMap(CATEGORIES, newCats);
    expect(map.get("streaming")).toBe("cat-streaming");
  });
});

describe("buildAccountMap (importTransactions)", () => {
  it("mapeia nome lowercase → id", () => {
    const map = buildAccountMap(ACCOUNTS);
    expect(map.get("conta corrente")).toBe("acc-corrente");
    expect(map.get("cartão de crédito")).toBe("acc-cartao");
  });

  it("inclui contas adicionais do usuário", () => {
    const newAccs = [{ name: "Nubank", id: "acc-nubank" }];
    const map = buildAccountMap(ACCOUNTS, newAccs);
    expect(map.get("nubank")).toBe("acc-nubank");
  });
});

// ─── buildRows ────────────────────────────────────────────────────────────────

describe("buildRows", () => {
  it("converte entries normais em linhas com formato correto", () => {
    const entries = [
      { date: "15/03/2024", description: "Salario", amount: 5000, category: "Salário", account: "Conta corrente" },
      { date: "16/03/2024", description: "Mercado", amount: -200, category: "Alimentação", account: "Cartão de crédito" }
    ];
    const categoryMap = buildCategoryMap(CATEGORIES);
    const accountMap = buildAccountMap(ACCOUNTS);

    const rows = buildRows(entries, [], categoryMap, accountMap);

    expect(rows).toHaveLength(2);

    // Primeira linha (sorted by date, so "15/03" comes first)
    const [id, date, type, desc, cat, acc, amount] = rows[0];
    expect(id).toMatch(/^[0-9a-f-]+$/i); // UUID
    expect(date).toBe("2024-03-15");
    expect(type).toBe("income");
    expect(desc).toBe("Salario");
    expect(cat).toBe("cat-salario");
    expect(acc).toBe("acc-corrente");
    expect(amount).toBe(5000);

    // Segunda linha (despesa)
    expect(rows[1][2]).toBe("expense");
    expect(rows[1][6]).toBe(200); // abs value
  });

  it("converte transfers em pares vinculados", () => {
    const transfers = [
      { date: "10/03/2024", description: "TED", amount: 1000, sourceAccount: "Conta corrente", destAccount: "Investimentos" }
    ];
    const categoryMap = buildCategoryMap(CATEGORIES);
    const accountMap = buildAccountMap(ACCOUNTS);

    const rows = buildRows([], transfers, categoryMap, accountMap);

    expect(rows).toHaveLength(2);

    // Saída
    const outgoing = rows.find(r => r[2] === "expense");
    expect(outgoing[4]).toBe("cat-transferencia"); // categoria
    expect(outgoing[5]).toBe("acc-corrente"); // conta origem
    expect(outgoing[6]).toBe(1000);

    // Entrada
    const incoming = rows.find(r => r[2] === "income");
    expect(incoming[4]).toBe("cat-transferencia");
    expect(incoming[5]).toBe("acc-invest"); // conta destino
    expect(incoming[6]).toBe(1000);

    // Vinculados (linkedId cruzado)
    expect(outgoing[11]).toBe(incoming[0]); // outgoing.linkedId = incoming.id
    expect(incoming[11]).toBe(outgoing[0]); // incoming.linkedId = outgoing.id
  });

  it("linhas são ordenadas por data", () => {
    const entries = [
      { date: "20/03/2024", description: "Depois", amount: -50, category: "Alimentação", account: "Conta corrente" },
      { date: "01/03/2024", description: "Antes", amount: -30, category: "Alimentação", account: "Conta corrente" }
    ];
    const categoryMap = buildCategoryMap(CATEGORIES);
    const accountMap = buildAccountMap(ACCOUNTS);

    const rows = buildRows(entries, [], categoryMap, accountMap);

    expect(rows[0][1]).toBe("2024-03-01"); // Antes
    expect(rows[1][1]).toBe("2024-03-20"); // Depois
  });

  it("lida com arrays vazios", () => {
    const categoryMap = buildCategoryMap(CATEGORIES);
    const accountMap = buildAccountMap(ACCOUNTS);
    const rows = buildRows([], [], categoryMap, accountMap);
    expect(rows).toHaveLength(0);
  });
});
