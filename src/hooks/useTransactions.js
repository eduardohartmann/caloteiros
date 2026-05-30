import { useEffect, useMemo, useState } from "react";
import { deleteSheetTransaction, saveSheetTransaction } from "../services/googleSheets.js";
import { TokenExpiredError } from "../services/sheetsApi.js";
import { currentRoute, navigate, ROUTES } from "../routes.js";
import { amountFromInput, monthNow, newId, today } from "../utils/formatters.js";

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

/**
 * useTransactions
 * Gerencia transações pessoais, filtros, formulário e sugestões de autocomplete.
 */
export default function useTransactions(auth, notify, confirm, onSplit) {
  const { token, spreadsheetId, transactionSheetId, sheetData, handleTokenExpired } = auth;

  const [transactions, setTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [transactionsReady, setTransactionsReady] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [month, setMonth] = useState(monthNow);

  function changeMonth(newMonth) {
    setMonth(newMonth);
    localStorage.setItem("caloteiros.selectedMonth", newMonth);
  }
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState(emptyTransaction);
  const [previousRoute, setPreviousRoute] = useState(null);

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

  // Transações filtradas por mês e busca
  const visibleTransactions = useMemo(() => {
    const source = allTransactions.length > 0 ? allTransactions : transactions;
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return source
      .filter((t) => t.date.startsWith(month))
      .filter((t) => !query ||
        `${t.description} ${t.category} ${t.account}`.toLocaleLowerCase("pt-BR").includes(query))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [allTransactions, transactions, month, search]);

  function resetForm() {
    setDraft(emptyTransaction());
    const back = previousRoute || ROUTES.overview;
    setPreviousRoute(null);
    navigate(back);
  }

  async function saveTransaction(event) {
    event.preventDefault();
    const amount = amountFromInput(draft.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      notify("Informe um valor maior que zero.", true);
      return;
    }
    if (!draft.account) {
      notify("Selecione uma conta.", true);
      return;
    }
    const transaction = {
      ...draft,
      id: draft.id || newId(),
      description: draft.description.trim(),
      amount,
      createdAt: draft.createdAt || new Date().toISOString()
    };
    const current = transactions.find((item) => item.id === transaction.id);
    try {
      const txnMonth = transaction.date.slice(0, 7);
      let result = await saveSheetTransaction(token, spreadsheetId, transaction, current, txnMonth);

      // Se é uma transação vinculada (transferência), atualiza a outra também
      if (transaction.linkedId && current) {
        const linked = result.allTransactions.find((t) => t.id === transaction.linkedId);
        if (linked) {
          const updatedLinked = {
            ...linked,
            date: transaction.date,
            description: transaction.description,
            amount: transaction.amount
          };
          result = await saveSheetTransaction(token, spreadsheetId, updatedLinked, linked, txnMonth);
        }
      }

      setTransactions(result.transactions);
      setAllTransactions(result.allTransactions || []);

      // Navega para o mês da transação
      if (txnMonth !== month) changeMonth(txnMonth);

      // Se marcou "Dividir com parceiro", salva na planilha do casal
      if (transaction.split && onSplit && !current) {
        const coupleEntry = {
          id: newId(),
          date: transaction.date,
          description: transaction.description,
          totalAmount: amount,
          amountDue: Number((amount / 2).toFixed(2)),
          status: "pendente",
          createdBy: auth.accountName,
          createdAt: new Date().toISOString(),
          sourceTransactionId: transaction.id,
          paymentTransactionId: ""
        };
        onSplit(coupleEntry);
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

      resetForm();
      notify(current ? "Lançamento atualizado." : "Lançamento salvo.");
    } catch (error) { handleError(error); }
  }

  function editTransaction(transaction) {
    setPreviousRoute(currentRoute());
    setDraft({ ...transaction, amount: transaction.amount.toFixed(2).replace(".", ",") });
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

    try {
      if (linked) {
        // Exclui na ordem correta para não invalidar rowNumbers
        const first = linked.rowNumber > transaction.rowNumber ? linked : transaction;
        const second = linked.rowNumber > transaction.rowNumber ? transaction : linked;
        await deleteSheetTransaction(token, spreadsheetId, transactionSheetId, first, month);
        // Após excluir a de rowNumber maior, a menor não muda
        const result = await deleteSheetTransaction(token, spreadsheetId, transactionSheetId, second, month);
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
      navigate(back);
      notify(linked ? "Transferência excluída." : "Lançamento excluído.");
    } catch (error) { handleError(error); }
  }

  async function transferBetweenAccounts(transferData) {
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

    try {
      await saveSheetTransaction(token, spreadsheetId, outgoing, null, txnMonth);
      const result = await saveSheetTransaction(token, spreadsheetId, incoming, null, txnMonth);
      setTransactions(result.transactions);
      setAllTransactions(result.allTransactions || []);
      if (txnMonth !== month) changeMonth(txnMonth);
      resetForm();
      notify("Transferência realizada.");
    } catch (error) { handleError(error); }
  }

  return {
    transactions, allTransactions, visibleTransactions, suggestions,
    month, setMonth: changeMonth, search, setSearch,
    draft, setDraft, resetForm,
    saveTransaction, editTransaction, removeTransaction, transferBetweenAccounts,
    transactionsReady
  };
}
