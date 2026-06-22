import { useEffect, useMemo, useState } from "react";
import { deleteSheetTransaction, deleteLinkedTransactions, saveSheetTransaction, saveLinkedTransactions, appendLinkedTransactions } from "../services/googleSheets.js";
import { TokenExpiredError } from "../services/sheetsApi.js";
import { TRANSFER_CATEGORY_ID } from "../constants.js";
import { currentRoute, navigate, ROUTES } from "../routes.js";
import { amountFromInput, monthNow, newId, today } from "../utils/formatters.js";

const DRAFT_STORAGE_KEY = "caloteiros.draft";

function emptyTransaction() {
  return {
    id: "",
    type: "expense",
    description: "",
    amount: "",
    category: "",
    date: today(),
    account: "",
    createdAt: "",
    split: false
  };
}

function loadDraftFromSession() {
  try {
    const saved = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    // Só restaura se tem conteúdo relevante (descrição ou valor preenchido)
    if (parsed.description || parsed.amount) return parsed;
  } catch { /* ignora */ }
  return null;
}

function saveDraftToSession(draft) {
  try {
    // Só persiste se tem conteúdo relevante
    if (draft.description || draft.amount) {
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } else {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  } catch { /* ignora */ }
}

function clearDraftFromSession() {
  try { sessionStorage.removeItem(DRAFT_STORAGE_KEY); } catch { /* ignora */ }
}

/**
 * useTransactions
 * Gerencia transações pessoais, filtros, formulário e sugestões de autocomplete.
 */
export default function useTransactions(auth, notify, confirm, onSplit, settings) {
  const { token, spreadsheetId, transactionSheetId, sheetData, handleTokenExpired } = auth;

  const [transactions, setTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [transactionsReady, setTransactionsReady] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [saving, setSaving] = useState(false);

  // #6 - Restaurar mês selecionado do localStorage
  const [month, setMonth] = useState(() => {
    return localStorage.getItem("caloteiros.selectedMonth") || monthNow();
  });

  function changeMonth(newMonth) {
    setMonth(newMonth);
    localStorage.setItem("caloteiros.selectedMonth", newMonth);
  }
  const [search, setSearch] = useState("");
  const [draft, setDraftState] = useState(() => loadDraftFromSession() || emptyTransaction());
  const [previousRoute, setPreviousRoute] = useState(null);
  const [continueMode, setContinueMode] = useState(false);

  // Persiste draft no sessionStorage sempre que muda
  function setDraft(newDraft) {
    const value = typeof newDraft === "function" ? newDraft(draft) : newDraft;
    setDraftState(value);
    saveDraftToSession(value);
  }

  function handleError(error) {
    if (error instanceof TokenExpiredError) {
      handleTokenExpired();
    } else {
      notify(error.message, true);
    }
  }

  // Carrega dados quando sheetData muda (login bem-sucedido)
  useEffect(() => {
    if (sheetData) {
      setTransactions(sheetData.transactions || []);
      setAllTransactions(sheetData.allTransactions || []);
      setSuggestions(sheetData.suggestions || []);
      setTransactionsReady(true);
    }
  }, [sheetData]);

  // #11 - Transações filtradas por mês e busca (resolve IDs para nomes)
  const visibleTransactions = useMemo(() => {
    const source = allTransactions.length > 0 ? allTransactions : transactions;
    const query = search.trim().toLocaleLowerCase("pt-BR");

    const catMap = settings?.categoryMap || {};
    const accMap = settings?.accountMap || {};

    return source
      .filter((t) => t.date.startsWith(month))
      .filter((t) => {
        if (!query) return true;
        const catName = catMap[t.category] || t.category;
        const accName = accMap[t.account] || t.account;
        return `${t.description} ${catName} ${accName}`
          .toLocaleLowerCase("pt-BR")
          .includes(query);
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [allTransactions, transactions, month, search, settings?.categoryMap, settings?.accountMap]);

  function resetForm() {
    setDraft(emptyTransaction());
    clearDraftFromSession();
    const back = previousRoute || ROUTES.overview;
    setPreviousRoute(null);
    navigate(back);
  }

  async function saveTransaction(event) {
    event.preventDefault();
    // #10 - Proteção contra double submit
    if (saving) return;

    const amount = amountFromInput(draft.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      notify("Informe um valor maior que zero.", true);
      return;
    }
    if (!draft.account) {
      notify("Selecione uma conta.", true);
      return;
    }

    // #7 - Validação de description antes do split
    const trimmedDescription = draft.description.trim();
    if (!trimmedDescription) {
      notify("Informe uma descrição.", true);
      return;
    }

    const transaction = {
      ...draft,
      id: draft.id || newId(),
      description: trimmedDescription,
      amount,
      createdAt: draft.createdAt || new Date().toISOString()
    };
    const current = allTransactions.find((item) => item.id === transaction.id) ||
      transactions.find((item) => item.id === transaction.id);

    setSaving(true);
    try {
      const txnMonth = transaction.date.slice(0, 7);
      let result;

      // #4 - Se é edição de transação vinculada, usa batch update atômico
      if (transaction.linkedId && current) {
        const linked = allTransactions.find((t) => t.id === transaction.linkedId);
        if (linked) {
          const updatedLinked = {
            ...linked,
            date: transaction.date,
            description: transaction.description,
            amount: transaction.amount
          };
          result = await saveLinkedTransactions(
            token, spreadsheetId,
            transaction, current,
            updatedLinked, linked,
            txnMonth
          );
        } else {
          result = await saveSheetTransaction(token, spreadsheetId, transaction, current, txnMonth);
        }
      } else {
        result = await saveSheetTransaction(token, spreadsheetId, transaction, current, txnMonth);
      }

      setTransactions(result.transactions);
      setAllTransactions(result.allTransactions || []);

      // Navega para o mês da transação
      if (txnMonth !== month) changeMonth(txnMonth);

      // #2 + #7 + #9 - Dividir com parceiro (com try/catch e precisão corrigida)
      // Permite dividir na criação OU na edição (proteção contra duplicata fica no TransactionForm)
      if (transaction.split && onSplit) {
        // #9 - Precisão: divisão inteira em centavos
        const totalCents = Math.round(amount * 100);
        const halfCents = Math.floor(totalCents / 2);
        const amountDue = halfCents / 100;

        const coupleEntry = {
          id: newId(),
          date: transaction.date,
          description: transaction.description,
          totalAmount: amount,
          amountDue,
          status: "pendente",
          createdBy: auth.accountName,
          createdAt: new Date().toISOString(),
          sourceTransactionId: transaction.id,
          paymentTransactionId: ""
        };

        // #2 - Try/catch no split com retry queue
        try {
          await onSplit(coupleEntry);
        } catch (splitError) {
          notify(
            "Lançamento salvo, mas não foi possível compartilhar com o parceiro(a). Tente novamente pela aba Casal.",
            true
          );
          // Salva em localStorage para retry posterior
          const pending = JSON.parse(localStorage.getItem("caloteiros.pendingSplits") || "[]");
          pending.push(coupleEntry);
          localStorage.setItem("caloteiros.pendingSplits", JSON.stringify(pending));
        }
      }

      // Atualiza sugestões
      const newSuggestion = {
        description: transaction.description,
        type: transaction.type,
        category: transaction.category,
        account: transaction.account
      };
      setSuggestions((prev) => {
        const key = `${transaction.description.toLocaleLowerCase("pt-BR")}|${transaction.category}|${transaction.account}`;
        const exists = prev.some((s) =>
          `${s.description.toLocaleLowerCase("pt-BR")}|${s.category}|${s.account}` === key
        );
        return exists ? prev : [...prev, newSuggestion];
      });

      // Modo "inserir em sequência": mantém form aberto com mesma data
      if (continueMode && !current) {
        setDraft({ ...emptyTransaction(), date: transaction.date });
      } else {
        resetForm();
      }
      notify(current ? "Lançamento atualizado." : "Lançamento salvo.");
    } catch (error) {
      handleError(error);
    } finally {
      setSaving(false);
    }
  }

  // #5 - Edição de transferência detecta linked e popula destinationAccount
  function editTransaction(transaction) {
    setPreviousRoute(currentRoute());

    const isLinkedTransfer = transaction.linkedId && transaction.category === TRANSFER_CATEGORY_ID;

    if (isLinkedTransfer) {
      const linked = allTransactions.find((t) => t.id === transaction.linkedId);
      setDraft({
        ...transaction,
        type: "transfer",
        amount: transaction.amount.toFixed(2).replace(".", ","),
        destinationAccount: linked?.account || ""
      });
    } else {
      setDraft({ ...transaction, amount: transaction.amount.toFixed(2).replace(".", ",") });
    }
    navigate(ROUTES.newTransaction);
  }

  async function removeTransaction(transaction) {
    const linked = transaction.linkedId
      ? allTransactions.find((t) => t.id === transaction.linkedId)
      : null;

    const confirmMsg = linked
      ? `Excluir transferência "${transaction.description}"? (ambos os lançamentos serão removidos)`
      : `Excluir "${transaction.description}"?`;

    const ok = await confirm(confirmMsg, "Excluir lançamento");
    if (!ok) return;

    setSaving(true);
    try {
      if (linked) {
        // #1 - Batch delete atômico para transferências vinculadas
        const result = await deleteLinkedTransactions(
          token, spreadsheetId, transactionSheetId, transaction, linked, month
        );
        setTransactions(result.transactions);
        setAllTransactions(result.allTransactions || []);
        setSuggestions(result.suggestions || []);
      } else {
        const result = await deleteSheetTransaction(token, spreadsheetId, transactionSheetId, transaction, month);
        setTransactions(result.transactions);
        setAllTransactions(result.allTransactions || []);
        setSuggestions(result.suggestions || []);
      }

      const back = previousRoute || ROUTES.overview;
      setPreviousRoute(null);
      setDraft(emptyTransaction());
      clearDraftFromSession();
      navigate(back);
      notify(linked ? "Transferência excluída." : "Lançamento excluído.");
    } catch (error) {
      handleError(error);
    } finally {
      setSaving(false);
    }
  }

  async function transferBetweenAccounts(transferData) {
    // #10 - Proteção contra double submit
    if (saving) return;

    const amount = amountFromInput(transferData.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      notify("Informe um valor maior que zero.", true);
      return;
    }
    const txnMonth = transferData.date.slice(0, 7);
    const description = transferData.description.trim() || "Transferência entre contas";

    const outgoingId = newId();
    const incomingId = newId();

    // Lançamento de saída (conta origem) — vinculado ao de entrada
    const outgoing = {
      id: outgoingId,
      date: transferData.date,
      type: "expense",
      description,
      category: transferData.category,
      account: transferData.account,
      amount,
      createdAt: new Date().toISOString(),
      split: false,
      linkedId: incomingId
    };

    // Lançamento de entrada (conta destino) — vinculado ao de saída
    const incoming = {
      id: incomingId,
      date: transferData.date,
      type: "income",
      description,
      category: transferData.category,
      account: transferData.destinationAccount,
      amount,
      createdAt: new Date().toISOString(),
      split: false,
      linkedId: outgoingId
    };

    setSaving(true);
    try {
      const result = await appendLinkedTransactions(token, spreadsheetId, outgoing, incoming, txnMonth);
      setTransactions(result.transactions);
      setAllTransactions(result.allTransactions || []);
      if (txnMonth !== month) changeMonth(txnMonth);
      resetForm();
      notify("Transferência realizada.");
    } catch (error) {
      handleError(error);
    } finally {
      setSaving(false);
    }
  }

  return {
    transactions, allTransactions, visibleTransactions, suggestions,
    month, setMonth: changeMonth, search, setSearch,
    draft, setDraft, resetForm,
    saveTransaction, editTransaction, removeTransaction, transferBetweenAccounts,
    transactionsReady, saving,
    continueMode, setContinueMode
  };
}
