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
  saveCoupleEntry,
  shareCoupleWithPartner
} from "../services/coupleSheets.js";

/**
 * useCouple
 * Gerencia a planilha compartilhada do casal.
 *
 * Novo fluxo:
 * - Lançamentos compartilhados vêm do formulário pessoal (checkbox "Dividir")
 * - Aba Casal mostra pendentes/pagos/confirmados por mês
 * - Parceiro marca "Paguei", criador confirma e recebe receita pré-preenchida
 *
 * IMPORTANTE: handleMarkAsPaid e handleConfirmPayment NÃO alteram a planilha imediatamente.
 * Elas apenas guardam a ação pendente e retornam o draft. A alteração real só acontece
 * quando commitCoupleAction() é chamado (após salvar a transação pessoal).
 * Se o usuário cancelar, cancelCoupleAction() limpa a ação sem efeito colateral.
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

  // Ação pendente do casal — só será executada após salvar a transação pessoal
  // { type: "markAsPaid" | "confirmPayment", entry: CoupleEntry }
  const [pendingCoupleAction, setPendingCoupleAction] = useState(null);

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

  // #2 - Retry de splits pendentes ao carregar
  useEffect(() => {
    if (!coupleReady || !coupleSpreadsheetId || !token) return;
    const pending = JSON.parse(localStorage.getItem("caloteiros.pendingSplits") || "[]");
    if (pending.length === 0) return;

    (async () => {
      const failed = [];
      for (const entry of pending) {
        try {
          await saveCoupleEntry(token, coupleSpreadsheetId, entry);
        } catch {
          failed.push(entry);
        }
      }
      if (failed.length > 0) {
        localStorage.setItem("caloteiros.pendingSplits", JSON.stringify(failed));
      } else {
        localStorage.removeItem("caloteiros.pendingSplits");
      }
      // Recarrega entradas após retry bem-sucedido
      if (pending.length > failed.length) {
        try {
          const data = await loadCoupleSpreadsheet(token, coupleSpreadsheetId);
          setCoupleEntries(data.entries);
        } catch {
          // Falha ao recarregar não é crítica — entradas serão carregadas no próximo acesso
        }
        if (failed.length > 0) {
          notify(`${pending.length - failed.length} lançamentos pendentes sincronizados. ${failed.length} ainda pendentes.`, true);
        }
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleReady, coupleSpreadsheetId, token]);

  // ── ações ───────────────────────────────────────────────────────────────────

  async function handleCreateCouple(partnerEmail) {
    setCoupleLoading(true);
    try {
      const data = await createCoupleSpreadsheet(token, accountName, accountEmail);
      await shareCoupleWithPartner(token, data.spreadsheetId, partnerEmail);
      setCoupleSpreadsheetId(data.spreadsheetId);
      setCoupleUserKey(data.userKey);
      setCoupleConfig(data.config);
      setCoupleEntries(data.entries);
      setCoupleReady(true);
      await saveSetting(token, spreadsheetId, "coupleSpreadsheetId", data.spreadsheetId);
      localStorage.setItem(STORAGE.coupleSheetId, data.spreadsheetId);
      notify("Planilha do casal criada e compartilhada. Envie o código ao seu parceiro(a).");
    } catch (error) {
      notify(error.message, true);
    } finally {
      setCoupleLoading(false);
    }
  }

  async function handleJoinCouple(code) {
    setCoupleLoading(true);
    try {
      const data = await joinCoupleSpreadsheet(token, code, accountName, accountEmail);
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
   * NÃO altera a planilha ainda — apenas guarda a ação pendente e retorna o draft.
   * A planilha só será alterada quando commitCoupleAction() for chamado.
   */
  async function handleMarkAsPaid(entry) {
    // Guarda a ação para executar depois
    setPendingCoupleAction({ type: "markAsPaid", entry });
    notify("Preencha o lançamento de pagamento e salve para confirmar.");
    // Retorna dados para pré-preencher formulário de despesa
    return {
      type: "expense",
      description: `Pagamento - ${entry.description}`,
      amount: entry.amountDue.toFixed(2).replace(".", ","),
      category: "",
      account: "",
      date: new Date().toISOString().slice(0, 10)
    };
  }

  /**
   * Criador confirma o recebimento.
   * NÃO altera a planilha ainda — apenas guarda a ação pendente e retorna o draft.
   * A planilha só será alterada quando commitCoupleAction() for chamado.
   */
  async function handleConfirmPayment(entry) {
    // Guarda a ação para executar depois
    setPendingCoupleAction({ type: "confirmPayment", entry });
    notify("Preencha o lançamento de reembolso e salve para confirmar.");
    // Retorna dados para pré-preencher o formulário de receita
    return {
      type: "income",
      description: `Reembolso - ${entry.description}`,
      amount: entry.amountDue.toFixed(2).replace(".", ","),
      category: "",
      account: "",
      date: new Date().toISOString().slice(0, 10)
    };
  }

  /**
   * Executa a ação pendente na planilha do casal.
   * Chamado pelo useTransactions APÓS salvar a transação pessoal com sucesso.
   */
  async function commitCoupleAction() {
    if (!pendingCoupleAction) return;
    const { type, entry } = pendingCoupleAction;
    setCoupleLoading(true);
    try {
      if (type === "markAsPaid") {
        const data = await markEntryAsPaid(token, coupleSpreadsheetId, entry);
        setCoupleEntries(data.entries);
      } else if (type === "confirmPayment") {
        const data = await confirmEntryPayment(token, coupleSpreadsheetId, entry);
        setCoupleEntries(data.entries);
      }
    } catch (error) {
      notify("Transação salva, mas houve erro ao atualizar o status no casal: " + error.message, true);
    } finally {
      setPendingCoupleAction(null);
      setCoupleLoading(false);
    }
  }

  /**
   * Cancela a ação pendente sem alterar nada na planilha.
   * Chamado quando o usuário cancela/navega fora do formulário sem salvar.
   */
  function cancelCoupleAction() {
    setPendingCoupleAction(null);
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
    pendingCoupleAction,
    handleCreateCouple, handleJoinCouple,
    addSharedEntry, handleMarkAsPaid, handleConfirmPayment, handleDeleteEntry,
    commitCoupleAction, cancelCoupleAction,
    reset
  };
}
