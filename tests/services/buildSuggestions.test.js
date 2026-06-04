/**
 * Testes para buildSuggestions (googleSheets.js)
 * Lógica de autocomplete a partir das transações existentes.
 */
import { describe, it, expect } from "vitest";
import { buildSuggestions } from "../../src/services/googleSheets.js";

const ACCOUNTS = [
  { id: "acc-corrente", name: "Conta corrente", active: true },
  { id: "acc-cartao", name: "Cartão de crédito", active: true },
  { id: "acc-inativa", name: "Conta antiga", active: false }
];

function makeTxn(desc, category, account, type = "expense") {
  return { description: desc, category, account, type, date: "2024-01-01" };
}

describe("buildSuggestions", () => {
  it("retorna sugestões únicas por chave composta (desc+cat+acc)", () => {
    const transactions = [
      makeTxn("Supermercado", "cat-alimentacao", "acc-corrente"),
      makeTxn("Supermercado", "cat-alimentacao", "acc-corrente"), // duplicada
      makeTxn("Supermercado", "cat-alimentacao", "acc-cartao"),   // conta diferente = nova
    ];

    const suggestions = buildSuggestions(transactions, ACCOUNTS);

    expect(suggestions).toHaveLength(2);
  });

  it("exclui transações de contas inativas", () => {
    const transactions = [
      makeTxn("Pagamento antigo", "cat-outros", "acc-inativa"),
      makeTxn("Mercado", "cat-alimentacao", "acc-corrente"),
    ];

    const suggestions = buildSuggestions(transactions, ACCOUNTS);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].description).toBe("Mercado");
  });

  it("ignora transações com descrição vazia", () => {
    const transactions = [
      makeTxn("", "cat-outros", "acc-corrente"),
      makeTxn("   ", "cat-outros", "acc-corrente"),
      makeTxn("Válida", "cat-outros", "acc-corrente"),
    ];

    const suggestions = buildSuggestions(transactions, ACCOUNTS);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].description).toBe("Válida");
  });

  it("preserva type, category e account na sugestão", () => {
    const transactions = [
      makeTxn("Salário", "cat-salario", "acc-corrente", "income"),
    ];

    const suggestions = buildSuggestions(transactions, ACCOUNTS);

    expect(suggestions[0]).toEqual({
      description: "Salário",
      type: "income",
      category: "cat-salario",
      account: "acc-corrente"
    });
  });

  it("case insensitive na deduplicação", () => {
    const transactions = [
      makeTxn("Supermercado", "cat-alimentacao", "acc-corrente"),
      makeTxn("supermercado", "cat-alimentacao", "acc-corrente"), // mesma chave
    ];

    const suggestions = buildSuggestions(transactions, ACCOUNTS);

    expect(suggestions).toHaveLength(1);
  });

  it("funciona sem lista de contas (null)", () => {
    const transactions = [
      makeTxn("Test", "cat-1", "acc-qualquer"),
    ];

    const suggestions = buildSuggestions(transactions, null);

    expect(suggestions).toHaveLength(1);
  });

  it("retorna array vazio para transações vazias", () => {
    const suggestions = buildSuggestions([], ACCOUNTS);
    expect(suggestions).toHaveLength(0);
  });

  it("mantém a primeira ocorrência (mais recente, iterando do fim)", () => {
    const transactions = [
      makeTxn("Uber", "cat-transporte", "acc-corrente", "expense"),   // index 0 (mais antigo)
      makeTxn("Uber", "cat-transporte", "acc-corrente", "income"),    // index 1 (mais recente) — mesmo key, type diferente
    ];

    // Itera do fim para o início, então index 1 é encontrado primeiro
    const suggestions = buildSuggestions(transactions, ACCOUNTS);

    expect(suggestions).toHaveLength(1);
    // A primeira encontrada (mais recente) vence
    expect(suggestions[0].type).toBe("income");
  });
});
