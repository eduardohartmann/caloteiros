import { useEffect, useRef, useState } from "react";
import { STORAGE } from "../constants.js";
import { ensureSpreadsheet, loadGoogleProfile } from "../services/googleSheets.js";
import { connectGoogle as gisConnect, refreshToken as gisRefresh, revokeToken } from "../services/auth.js";
import { TokenExpiredError } from "../services/sheetsApi.js";
import { navigate, ROUTES } from "../routes.js";
import { monthNow } from "../utils/formatters.js";

function getSavedToken() {
  const token = localStorage.getItem(STORAGE.token);
  const expiry = localStorage.getItem(STORAGE.tokenExpiry);
  if (!token || !expiry) return null;
  if (Date.now() > Number(expiry) - 300000) {
    localStorage.removeItem(STORAGE.token);
    localStorage.removeItem(STORAGE.tokenExpiry);
    return null;
  }
  return token;
}

function saveToken(token, expiresIn = 3600) {
  localStorage.setItem(STORAGE.token, token);
  localStorage.setItem(STORAGE.tokenExpiry, String(Date.now() + expiresIn * 1000));
}

function clearToken() {
  localStorage.removeItem(STORAGE.token);
  localStorage.removeItem(STORAGE.tokenExpiry);
}

/**
 * useAuth
 * Gerencia autenticação via Google Identity Services (GIS) token model,
 * com persistência do token e renovação silenciosa em background.
 * Sem modo demo — sempre requer Google.
 */
export default function useAuth(notify) {
  const [authenticated, setAuthenticated] = useState(false);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [accountName, setAccountName] = useState(
    () => localStorage.getItem(STORAGE.userName) || ""
  );
  const [accountEmail, setAccountEmail] = useState(
    () => localStorage.getItem(STORAGE.userEmail) || ""
  );
  const [spreadsheetId, setSpreadsheetId] = useState(
    () => localStorage.getItem(STORAGE.sheetId) || ""
  );
  const [transactionSheetId, setTransactionSheetId] = useState(null);
  const [sheetIdMap, setSheetIdMap] = useState({});
  const [sheetData, setSheetData] = useState(null);

  const initRef = useRef(false);

  // ── inicialização ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const hasSheet = Boolean(localStorage.getItem(STORAGE.sheetId));
    const savedToken = getSavedToken();

    if (savedToken && hasSheet) {
      // Token ainda válido em cache → carrega direto.
      loadWithToken(savedToken);
      return;
    }

    if (hasSheet) {
      // Já conectou antes (tem planilha), mas o token expirou.
      // Tenta renovar silenciosamente, sem popup, via sessão ativa do Google.
      gisRefresh((err, result) => {
        if (err || !result) {
          setLoading(false); // renovação silenciosa falhou → mostra login
          return;
        }
        saveToken(result.accessToken, result.expiresIn);
        loadWithToken(result.accessToken);
      });
      return;
    }

    // Primeira vez — mostra tela de login
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Carrega perfil + planilha com um access token já válido e aplica o estado
   * de autenticação. Em caso de falha, limpa o token e volta para o login.
   */
  async function loadWithToken(accessToken) {
    try {
      const savedSheetId = localStorage.getItem(STORAGE.sheetId) || "";
      const [profile, data] = await Promise.all([
        loadGoogleProfile(accessToken),
        ensureSpreadsheet(accessToken, savedSheetId, monthNow())
      ]);
      applyAuth(accessToken, profile, data);
      // Só navega para overview se não está numa rota válida do dashboard
      const current = window.location.hash.replace(/^#/, "");
      const validRoutes = Object.values(ROUTES);
      if (!current || !validRoutes.includes(current)) {
        navigate(ROUTES.overview, true);
      }
    } catch (err) {
      clearToken();
      localStorage.removeItem(STORAGE.sheetId);
      setLoading(false);
      notify(err.message || "Falha ao conectar.", true);
    }
  }

  function applyAuth(newToken, profile, data) {
    const name = profile?.given_name || "você";
    const email = profile?.email || "";
    localStorage.setItem(STORAGE.userName, name);
    localStorage.setItem(STORAGE.userEmail, email);
    setToken(newToken);
    setAuthenticated(true);
    setLoading(false);
    setAccountName(name);
    setAccountEmail(email);
    setSpreadsheetId(data.spreadsheetId);
    setTransactionSheetId(data.transactionSheetId);
    setSheetIdMap(data.sheetIdMap || {});
    setSheetData(data);
  }

  function connectGoogle() {
    try {
      setLoading(true);
      gisConnect((err, result) => {
        if (err || !result) {
          setLoading(false);
          notify(err?.message || "Falha ao conectar.", true);
          return;
        }
        saveToken(result.accessToken, result.expiresIn);
        loadWithToken(result.accessToken);
      });
    } catch (err) {
      setLoading(false);
      notify(err.message, true);
    }
  }

  function disconnect() {
    revokeToken(token);
    clearToken();
    setToken("");
    setAuthenticated(false);
    setSheetIdMap({});
    setSheetData(null);
    localStorage.removeItem(STORAGE.sheetId);
    localStorage.removeItem(STORAGE.userName);
    localStorage.removeItem(STORAGE.userEmail);
    notify("Conta desconectada.");
  }

  function handleTokenExpired() {
    clearToken();
    // Tenta renovar sem interromper o usuário (renovação silenciosa).
    gisRefresh((err, result) => {
      if (err || !result) {
        // Sessão do Google não está mais ativa → precisa reautenticar.
        setToken("");
        setAuthenticated(false);
        notify("Sessão expirada. Conecte-se novamente.", true);
        return;
      }
      saveToken(result.accessToken, result.expiresIn);
      setToken(result.accessToken);
    });
  }

  return {
    authenticated, token, loading, accountName, accountEmail,
    spreadsheetId, transactionSheetId, sheetIdMap,
    sheetData,
    connectGoogle, disconnect, handleTokenExpired
  };
}
