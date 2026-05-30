/**
 * resolvers.js
 * Utilitário para resolver IDs de categorias e contas para nomes legíveis.
 * Usado por todos os componentes que exibem dados de transações.
 */

/**
 * Cria funções de resolução a partir das listas de categorias e contas.
 *
 * @param {Array} categories - lista de objetos { id, name, ... }
 * @param {Array} accounts   - lista de objetos { id, name, ... }
 * @returns {{ category: (id) => string, account: (id) => string }}
 */
export function createResolvers(categories, accounts) {
  const catMap = Object.fromEntries((categories || []).map((c) => [c.id, c.name]));
  const accMap = Object.fromEntries((accounts || []).map((a) => [a.id, a.name]));

  return {
    category: (id) => catMap[id] || id,
    account: (id) => accMap[id] || id
  };
}

/**
 * Cria mapas simples id→nome (para passar como props quando necessário).
 */
export function buildCategoryMap(categories) {
  if (!categories || !categories.length) return null;
  return Object.fromEntries(categories.map((c) => [c.id, c.name]));
}

export function buildAccountMap(accounts) {
  if (!accounts || !accounts.length) return null;
  return Object.fromEntries(accounts.map((a) => [a.id, a.name]));
}
