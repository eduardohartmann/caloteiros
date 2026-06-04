/**
 * @file Definições de tipos JSDoc para o projeto Caloteiros.
 * Importar via: `@import { Transaction, Category, Account } from "../types.js"`
 * Ou referenciar diretamente com `@type {import("../types.js").Transaction}`
 *
 * Esses tipos servem para autocomplete e validação no VSCode (com @ts-check).
 * Não geram código em runtime.
 */

// ─── Transaction ──────────────────────────────────────────────────────────────

/**
 * Lançamento financeiro pessoal (despesa, receita ou transferência).
 * @typedef {Object} Transaction
 * @property {string} id - UUID único do lançamento.
 * @property {string} date - Data no formato "YYYY-MM-DD".
 * @property {"expense"|"income"|"transfer"} type - Tipo do lançamento.
 * @property {string} description - Descrição livre.
 * @property {string} category - ID da categoria associada.
 * @property {string} account - ID da conta associada.
 * @property {number} amount - Valor em reais (sempre positivo).
 * @property {string} createdAt - ISO timestamp de criação.
 * @property {boolean} shared - Se foi compartilhado com o parceiro (casal).
 * @property {string} linkedId - ID da transação vinculada (transferências).
 * @property {number} rowNumber - Número da linha na planilha (2-indexed, cabeçalho na 1).
 */

// ─── Category ─────────────────────────────────────────────────────────────────

/**
 * Categoria de lançamento (pode ter hierarquia pai/filho).
 * @typedef {Object} Category
 * @property {string} id - UUID único da categoria.
 * @property {string} parentId - ID da categoria pai (vazio se for raiz).
 * @property {string} name - Nome exibido.
 * @property {string} icon - Emoji do ícone.
 * @property {string} color - Cor hex (ex: "#95A5A6").
 * @property {boolean} active - Se está ativa (visível para seleção).
 * @property {string} createdAt - ISO timestamp de criação.
 * @property {number} rowNumber - Número da linha na planilha.
 */

// ─── Account ──────────────────────────────────────────────────────────────────

/**
 * Conta financeira (banco, carteira, etc).
 * @typedef {Object} Account
 * @property {string} id - UUID único da conta.
 * @property {string} name - Nome exibido.
 * @property {boolean} active - Se está ativa.
 * @property {string} createdAt - ISO timestamp de criação.
 * @property {number} rowNumber - Número da linha na planilha.
 */

// ─── CoupleEntry ──────────────────────────────────────────────────────────────

/**
 * Lançamento compartilhado do casal (planilha do casal).
 * @typedef {Object} CoupleEntry
 * @property {string} id - UUID único.
 * @property {string} date - Data no formato "YYYY-MM-DD".
 * @property {string} description - Descrição do lançamento.
 * @property {number} totalAmount - Valor total da despesa.
 * @property {number} amountDue - Valor que o parceiro deve (geralmente 50%).
 * @property {"pendente"|"pago"|"confirmado"} status - Status do pagamento.
 * @property {string} createdBy - Quem cadastrou ("A" ou "B").
 * @property {string} createdAt - ISO timestamp de criação.
 * @property {string} sourceTransactionId - ID da transação original na planilha pessoal.
 * @property {string} paymentTransactionId - ID da transação de pagamento (quando pago).
 * @property {number} rowNumber - Número da linha na planilha.
 */

// ─── SheetsClient ─────────────────────────────────────────────────────────────

/**
 * Cliente da Google Sheets API com token embutido.
 * Criado via `createSheetsClient(token)`.
 * @typedef {Object} SheetsClient
 * @property {(path: string, options?: RequestInit) => Promise<any>} request - Faz requisição à Sheets API.
 * @property {(spreadsheetId: string, range: string, values: any[][]) => Promise<any>} updateValues - Atualiza valores em um range.
 * @property {string} token - OAuth2 access token.
 */

// ─── Suggestion ───────────────────────────────────────────────────────────────

/**
 * Sugestão de autocomplete baseada em lançamentos anteriores.
 * @typedef {Object} Suggestion
 * @property {string} description - Descrição do lançamento anterior.
 * @property {"expense"|"income"|"transfer"} type - Tipo sugerido.
 * @property {string} category - ID da categoria sugerida.
 * @property {string} account - ID da conta sugerida.
 */

// ─── SpreadsheetData ──────────────────────────────────────────────────────────

/**
 * Dados completos retornados ao carregar/criar uma planilha.
 * @typedef {Object} SpreadsheetData
 * @property {string} spreadsheetId - ID da planilha no Google Sheets.
 * @property {number} transactionSheetId - sheetId numérico da aba de transações.
 * @property {Object<string, number>} sheetIdMap - Mapa de nome da aba → sheetId.
 * @property {Transaction[]} transactions - Transações filtradas pelo mês atual.
 * @property {Transaction[]} allTransactions - Todas as transações.
 * @property {Category[]} categories - Categorias carregadas.
 * @property {Account[]} accounts - Contas carregadas.
 * @property {Suggestion[]} suggestions - Sugestões de autocomplete.
 * @property {string} [coupleSpreadsheetId] - ID da planilha do casal (se configurada).
 */

// Exporta vazio para que o arquivo seja tratado como módulo ES
export {};
