/**
 * Testes para src/services/settingsSheets.js
 * buildCategoryTree, flattenCategoryTree, rowToCategory, categoryToRow, rowToAccount, accountToRow
 */
import { describe, it, expect } from "vitest";
import {
  buildCategoryTree,
  flattenCategoryTree,
  rowToCategory,
  categoryToRow,
  rowToAccount,
  accountToRow
} from "../../src/services/settingsSheets.js";

// ─── dados de teste ───────────────────────────────────────────────────────────

const FLAT_CATEGORIES = [
  { id: "cat-moradia", parentId: "", name: "Moradia", icon: "🏠", color: "#4A90D9", active: true },
  { id: "cat-aluguel", parentId: "cat-moradia", name: "Aluguel", icon: "🔑", color: "#4A90D9", active: true },
  { id: "cat-condominio", parentId: "cat-moradia", name: "Condomínio", icon: "🏢", color: "#4A90D9", active: true },
  { id: "cat-alimentacao", parentId: "", name: "Alimentação", icon: "🍔", color: "#E8A838", active: true },
  { id: "cat-mercado", parentId: "cat-alimentacao", name: "Supermercado", icon: "🛒", color: "#E8A838", active: true },
  { id: "cat-transporte", parentId: "", name: "Transporte", icon: "🚗", color: "#7B68EE", active: true },
  { id: "cat-inativa", parentId: "", name: "Inativa", icon: "❌", color: "#999", active: false }
];

// ─── rowToCategory ────────────────────────────────────────────────────────────

describe("rowToCategory", () => {
  it("converte linha completa para objeto de categoria", () => {
    const row = ["cat-moradia", "", "Moradia", "🏠", "#4A90D9", "true", "2024-01-01T00:00:00Z", "2024-01-01T00:00:00Z"];
    const result = rowToCategory(row, 0);

    expect(result.id).toBe("cat-moradia");
    expect(result.parentId).toBe("");
    expect(result.name).toBe("Moradia");
    expect(result.icon).toBe("🏠");
    expect(result.color).toBe("#4A90D9");
    expect(result.active).toBe(true);
    expect(result.createdAt).toBe("2024-01-01T00:00:00Z");
    expect(result.rowNumber).toBe(2);
  });

  it("retorna null para linha sem id", () => {
    const row = ["", "", "Sem ID"];
    expect(rowToCategory(row, 0)).toBeNull();
  });

  it("usa defaults para campos ausentes", () => {
    const row = ["cat-test", "", ""];
    const result = rowToCategory(row, 3);

    expect(result.name).toBe("");
    expect(result.icon).toBe("📦");
    expect(result.color).toBe("#95A5A6");
    expect(result.active).toBe(true);
    expect(result.rowNumber).toBe(5);
  });

  it("parseia active=false corretamente", () => {
    const row = ["cat-1", "", "Test", "📦", "#000", "false", "", ""];
    expect(rowToCategory(row, 0).active).toBe(false);
  });

  it("parseia active=FALSE (case insensitive)", () => {
    const row = ["cat-1", "", "Test", "📦", "#000", "FALSE", "", ""];
    expect(rowToCategory(row, 0).active).toBe(false);
  });

  it("qualquer valor diferente de 'false' é true", () => {
    const row = ["cat-1", "", "Test", "📦", "#000", "true", "", ""];
    expect(rowToCategory(row, 0).active).toBe(true);

    const row2 = ["cat-1", "", "Test", "📦", "#000", "sim", "", ""];
    expect(rowToCategory(row2, 0).active).toBe(true);
  });

  it("preserva parentId para subcategoria", () => {
    const row = ["cat-aluguel", "cat-moradia", "Aluguel", "🔑", "#4A90D9", "true", "", ""];
    const result = rowToCategory(row, 0);
    expect(result.parentId).toBe("cat-moradia");
  });
});

// ─── categoryToRow ────────────────────────────────────────────────────────────

describe("categoryToRow", () => {
  it("serializa categoria completa", () => {
    const cat = {
      id: "cat-moradia",
      parentId: "",
      name: "Moradia",
      icon: "🏠",
      color: "#4A90D9",
      active: true,
      createdAt: "2024-01-01T00:00:00Z"
    };
    const row = categoryToRow(cat);

    expect(row[0]).toBe("cat-moradia");
    expect(row[1]).toBe("");
    expect(row[2]).toBe("Moradia");
    expect(row[3]).toBe("🏠");
    expect(row[4]).toBe("#4A90D9");
    expect(row[5]).toBe("true");
    expect(row[6]).toBe("2024-01-01T00:00:00Z");
    expect(row).toHaveLength(8);
  });

  it("serializa categoria inativa", () => {
    const cat = { id: "cat-1", parentId: "", name: "Test", icon: "📦", color: "#000", active: false, createdAt: "" };
    const row = categoryToRow(cat);
    expect(row[5]).toBe("false");
  });

  it("usa defaults para icon e color ausentes", () => {
    const cat = { id: "cat-1", parentId: "", name: "Test", createdAt: "" };
    const row = categoryToRow(cat);
    expect(row[3]).toBe("📦");
    expect(row[4]).toBe("#95A5A6");
  });

  it("roundtrip: categoryToRow → rowToCategory preserva dados", () => {
    const original = {
      id: "cat-roundtrip",
      parentId: "cat-parent",
      name: "Roundtrip",
      icon: "🔄",
      color: "#FF0000",
      active: true,
      createdAt: "2024-06-01T12:00:00Z"
    };
    const row = categoryToRow(original);
    const restored = rowToCategory(row, 0);

    expect(restored.id).toBe(original.id);
    expect(restored.parentId).toBe(original.parentId);
    expect(restored.name).toBe(original.name);
    expect(restored.icon).toBe(original.icon);
    expect(restored.color).toBe(original.color);
    expect(restored.active).toBe(original.active);
    expect(restored.createdAt).toBe(original.createdAt);
  });
});

// ─── rowToAccount ─────────────────────────────────────────────────────────────

describe("rowToAccount", () => {
  it("converte linha completa para objeto de conta", () => {
    const row = ["acc-corrente", "Conta corrente", "true", "2024-01-01T00:00:00Z", "2024-01-01T00:00:00Z"];
    const result = rowToAccount(row, 0);

    expect(result.id).toBe("acc-corrente");
    expect(result.name).toBe("Conta corrente");
    expect(result.active).toBe(true);
    expect(result.createdAt).toBe("2024-01-01T00:00:00Z");
    expect(result.rowNumber).toBe(2);
  });

  it("retorna null para linha sem id", () => {
    const row = ["", "Sem ID", "true"];
    expect(rowToAccount(row, 0)).toBeNull();
  });

  it("parseia active=false", () => {
    const row = ["acc-1", "Test", "false", "", ""];
    expect(rowToAccount(row, 0).active).toBe(false);
  });

  it("calcula rowNumber corretamente", () => {
    const row = ["acc-1", "Test", "true", "", ""];
    expect(rowToAccount(row, 0).rowNumber).toBe(2);
    expect(rowToAccount(row, 5).rowNumber).toBe(7);
  });
});

// ─── accountToRow ─────────────────────────────────────────────────────────────

describe("accountToRow", () => {
  it("serializa conta completa", () => {
    const acc = { id: "acc-corrente", name: "Conta corrente", active: true, createdAt: "2024-01-01T00:00:00Z" };
    const row = accountToRow(acc);

    expect(row[0]).toBe("acc-corrente");
    expect(row[1]).toBe("Conta corrente");
    expect(row[2]).toBe("true");
    expect(row[3]).toBe("2024-01-01T00:00:00Z");
    expect(row).toHaveLength(5);
  });

  it("serializa conta inativa", () => {
    const acc = { id: "acc-1", name: "Test", active: false, createdAt: "" };
    const row = accountToRow(acc);
    expect(row[2]).toBe("false");
  });

  it("roundtrip: accountToRow → rowToAccount preserva dados", () => {
    const original = { id: "acc-roundtrip", name: "Nubank", active: true, createdAt: "2024-06-01T12:00:00Z" };
    const row = accountToRow(original);
    const restored = rowToAccount(row, 0);

    expect(restored.id).toBe(original.id);
    expect(restored.name).toBe(original.name);
    expect(restored.active).toBe(original.active);
    expect(restored.createdAt).toBe(original.createdAt);
  });
});

// ─── buildCategoryTree ────────────────────────────────────────────────────────

describe("buildCategoryTree", () => {
  it("organiza categorias planas em árvore com children", () => {
    const tree = buildCategoryTree(FLAT_CATEGORIES);

    // Raízes: moradia, alimentação, transporte, inativa
    const rootNames = tree.map((n) => n.name);
    expect(rootNames).toContain("Moradia");
    expect(rootNames).toContain("Alimentação");
    expect(rootNames).toContain("Transporte");
    expect(rootNames).toContain("Inativa");
  });

  it("categorias filho ficam dentro de children do pai", () => {
    const tree = buildCategoryTree(FLAT_CATEGORIES);
    const moradia = tree.find((n) => n.id === "cat-moradia");

    expect(moradia.children).toHaveLength(2);
    expect(moradia.children.map((c) => c.name)).toContain("Aluguel");
    expect(moradia.children.map((c) => c.name)).toContain("Condomínio");
  });

  it("categorias sem filhos têm children vazio", () => {
    const tree = buildCategoryTree(FLAT_CATEGORIES);
    const transporte = tree.find((n) => n.id === "cat-transporte");
    expect(transporte.children).toHaveLength(0);
  });

  it("lida com lista vazia", () => {
    const tree = buildCategoryTree([]);
    expect(tree).toHaveLength(0);
  });

  it("categoria órfã (parentId inválido) vai para raiz", () => {
    const cats = [
      { id: "cat-1", parentId: "inexistente", name: "Órfã", icon: "?", color: "#000", active: true }
    ];
    const tree = buildCategoryTree(cats);
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe("Órfã");
  });
});

// ─── flattenCategoryTree ──────────────────────────────────────────────────────

describe("flattenCategoryTree", () => {
  it("retorna lista achatada com depth e label", () => {
    const flat = flattenCategoryTree(FLAT_CATEGORIES);

    expect(flat.length).toBeGreaterThan(0);
    expect(flat[0]).toHaveProperty("depth");
    expect(flat[0]).toHaveProperty("label");
  });

  it("categorias raiz têm depth=0", () => {
    const flat = flattenCategoryTree(FLAT_CATEGORIES);
    const moradia = flat.find((c) => c.id === "cat-moradia");
    expect(moradia.depth).toBe(0);
  });

  it("subcategorias têm depth=1", () => {
    const flat = flattenCategoryTree(FLAT_CATEGORIES);
    const aluguel = flat.find((c) => c.id === "cat-aluguel");
    expect(aluguel.depth).toBe(1);
  });

  it("filtra inativos por default (onlyActive=true)", () => {
    const flat = flattenCategoryTree(FLAT_CATEGORIES);
    const inativa = flat.find((c) => c.id === "cat-inativa");
    expect(inativa).toBeUndefined();
  });

  it("inclui inativos quando onlyActive=false", () => {
    const flat = flattenCategoryTree(FLAT_CATEGORIES, false);
    const inativa = flat.find((c) => c.id === "cat-inativa");
    expect(inativa).toBeDefined();
  });

  it("label contém ícone e nome", () => {
    const flat = flattenCategoryTree(FLAT_CATEGORIES);
    const moradia = flat.find((c) => c.id === "cat-moradia");
    expect(moradia.label).toContain("🏠");
    expect(moradia.label).toContain("Moradia");
  });

  it("subcategorias têm indentação no label", () => {
    const flat = flattenCategoryTree(FLAT_CATEGORIES);
    const aluguel = flat.find((c) => c.id === "cat-aluguel");
    // Subcategorias devem começar com espaço ideográfico (indentação)
    expect(aluguel.label).toMatch(/^[\u3000]/);
  });

  it("mantém ordem: pai seguido de filhos", () => {
    const flat = flattenCategoryTree(FLAT_CATEGORIES);
    const moradiaIdx = flat.findIndex((c) => c.id === "cat-moradia");
    const aluguelIdx = flat.findIndex((c) => c.id === "cat-aluguel");
    const condominioIdx = flat.findIndex((c) => c.id === "cat-condominio");

    expect(aluguelIdx).toBeGreaterThan(moradiaIdx);
    expect(condominioIdx).toBeGreaterThan(moradiaIdx);
  });

  it("lida com lista vazia", () => {
    const flat = flattenCategoryTree([]);
    expect(flat).toHaveLength(0);
  });
});
