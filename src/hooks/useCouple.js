import { useEffect, useState } from "react";
import { STORAGE } from "../constants.js";
import { saveSetting } from "../services/googleSheets.js";
import {
  confirmEntryPayment,
  createCoupleSpreadsheet,
  deleteCoupleEntry,
  joinCoupleSpreadsheet,
  loadCoupleSpreadsheet,
  markEntryAsPaid,
  saveCoupleEntry
} from "../services/coupleSheets.js";

/**
 * useCouple
 * Gerencia a planilha compartilhada do casal.
 *
 * Novo fluxo:
 * - Lançamentos compartilhados vêm do formulário pessoal (checkbox "Dividir")
 * - Aba Casal mostra pendentes/pagos/confirmados por mês
 * - Parceiro marca "Paguei", criador confirma e recebe receita pré-preenchida
 */
export default function useCouple(auth, notify, confirm) {
  const { token, spreadsheetId, accountName, accountEmail, sheetData } = auth;

  const [coupleSpreadsheetId, setCoupleSpreadsheetId] = useState(
    () => localStorage.getItem(STORAGE.coupleSheetId) || ""
  );
  const [coupleUserKey, setCoupleUserKey] = useState(
    () => localStorage.getItem(STORAGE.coupleUserKey) || ""
  );
  const [coupleConfig, setCoupleConfig] = useState({});
  const [coupleEntries, setCoupleEntries] = useState([]);
  const [coupleReady, setCoupleReady] = useState(false);
  const [coupleLoading, setCoupleLoading] = useState(false);

  // Restaura coupleSpreadsheetId da planilha pessoal
  useEffect(() => {
    if (sheetData?.coupleSpreadsheetId && !coupleSpreadsheetId) {
      setCoupleSpreadsheetId(sheetData.coupleSpreadsheetId);
      localStorage.setItem(STORAGE.coupleSheetId, sheetData.coupleSpreadsheetId);
    }
  }, [sheetData, coupleSpreadsheetId]);

  // Carrega planilha do casal
  useEffect(() => {
    if (!token || !coupleSpreadsheetId || coupleReady) return;
    setCoupleLoading(true);
    loadCoupleSpreadsheet(token, coupleSpreadsheetId)
      .then((data) => {
        setCoupleUserKey(data.userKey);
        setCoupleConfig(data.config);
        setCoupleEntries(data.entries);
        setCoupleReady(true);
      })
      .catch(() => {
        localStorage.removeItem(STORAGE.coupleSheetId);
        localStorage.removeItem(STORAGE.coupleUserKey);
        setCoupleSpreadsheetId("");
        setCoupleUserKey("");
      })
      .finally(() => setCoupleLoading(false));
  }, [token, coupleSpreadsheetId, coupleReady]);

  // ── ações ───────────────────────────────────────────────────────────────────

  async function handleCreateCouple() {
    setCoupleLoading(true);
    try {
      const data = await createCoupleSpreadsheet(token, accountName, accountEmail);
      setCoupleSpreadsheetId(data.spreadsheetId);
      setCoupleUserKey(data.userKey);
      setCoupleConfig(data.config);
      setCoupleEntries(data.entries);
      setCoupleReady(true);
      await saveSetting(token, spreadsheetId, "coupleSpreadsheetId", data.spreadsheetId);
      localStorage.setItem(STORAGE.coupleSheetId, data.spreadsheetId);
      notify("Planilha do casal criada. Compartilhe o código com seu parceiro(a).");
    } catch (error) {
      notify(error.message, true);
    } finally {
      setCoupleLoading(false);
    }
  }

  async function handleJoinCouple(code, partnerName) {
    setCoupleLoading(true);
    try {
      const data = await joinCoupleSpreadsheet(token, code, partnerName, accountEmail);
      setCoupleSpreadsheetId(data.spreadsheetId);
      setCoupleUserKey(data.userKey);
      setCoupleConfig(data.config);
      setCoupleEntries(data.entries);
      setCoupleReady(true);
      await saveSetting(token, spreadsheetId, "coupleSpreadsheetId", data.spreadsheetId);
      localStorage.setItem(STORAGE.coupleSheetId, data.spreadsheetId);
      notify("Conectado à planilha do casal.");
    } catch (error) {
      notify(error.message, true);
    } finally {
      setCoupleLoading(false);
    }
  }

  /**
   * Salva um lançamento na planilha do casal.
   * Chamado pelo useTransactions quando o checkbox "Dividir" está marcado.
   */
  async function addSharedEntry(entry) {
    if (!coupleSpreadsheetId || !coupleReady) return;
    setCoupleLoading(true);
    try {
      const data = await saveCoupleEntry(token, coupleSpreadsheetId, entry);
      setCoupleEntries(data.entries);
    } catch (error) {
      notify(error.message, true);
    } finally {
      setCoupleLoading(false);
    }
  }

  /**
   * Parceiro marca que pagou sua parte.
   * Retorna dados para pré-preencher o formulário de despesa (pagamento da metade).
   * O paymentTransactionId será passado depois quando o lançamento for salvo.
   */
  async function handleMarkAsPaid(entry) {
    setCoupleLoading(true);
    try {
      const data = await markEntryAsPaid(token, coupleSpreadsheetId, entry);
      setCoupleEntries(data.entries);
      notify("Marcado como pago. Preencha o lançamento de pagamento.");
      // Retorna dados para pré-preencher formulário de despesa
      return {
        type: "expense",
        description: `Pagamento - ${entry.description}`,
        amount: entry.amountDue.toFixed(2).replace(".", ","),
        category: entry.category,
        account: entry.account,
        date: new Date().toISOString().slice(0, 10)
      };
    } catch (error) {
      notify(error.message, true);
      return null;
    } finally {
      setCoupleLoading(false);
    }
  }

  /**
   * Criador confirma o recebimento.
   * Retorna dados para pré-preencher o formulário de receita (reembolso).
   */
  async function handleConfirmPayment(entry) {
    setCoupleLoading(true);
    try {
      const data = await confirmEntryPayment(token, coupleSpreadsheetId, entry);
      setCoupleEntries(data.entries);
      notify("Pagamento confirmado. Preencha o lançamento de reembolso.");
      // Retorna dados para pré-preencher o formulário de receita
      return {
        type: "income",
        description: `Reembolso - ${entry.description}`,
        amount: entry.amountDue.toFixed(2).replace(".", ","),
        category: entry.category,
        account: entry.account,
        date: new Date().toISOString().slice(0, 10)
      };
    } catch (error) {
      notify(error.message, true);
      return null;
    } finally {
      setCoupleLoading(false);
    }
  }

  async function handleDeleteEntry(entry) {
    const ok = await confirm(`Excluir "${entry.description}" dos lançamentos compartilhados?`, "Excluir");
    if (!ok) return;
    setCoupleLoading(true);
    try {
      const data = await deleteCoupleEntry(token, coupleSpreadsheetId, entry);
      setCoupleEntries(data.entries);
      notify("Lançamento compartilhado excluído.");
    } catch (error) {
      notify(error.message, true);
    } finally {
      setCoupleLoading(false);
    }
  }

  function reset() {
    setCoupleReady(false);
    setCoupleEntries([]);
    setCoupleConfig({});
  }

  return {
    coupleSpreadsheetId, coupleUserKey, coupleConfig,
    coupleEntries,
    coupleReady, coupleLoading,
    handleCreateCouple, handleJoinCouple,
    addSharedEntry, handleMarkAsPaid, handleConfirmPayment, handleDeleteEntry,
    reset
  };
}
