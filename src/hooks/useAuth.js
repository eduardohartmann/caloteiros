import { useEffect, useRef, useState } from "react";
import { STORAGE } from "../constants.js";
import { ensureSpreadsheet, loadGoogleProfile } from "../services/googleSheets.js";
import { extractTokenFromUrl, redirectToGoogle, revokeToken } from "../services/auth.js";
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
 * Gerencia autenticação via redirect OAuth com persistência do token.
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

    const tokenFromUrl = extractTokenFromUrl();
    if (tokenFromUrl) {
      saveToken(tokenFromUrl);
      doLoad(tokenFromUrl);
      return;
    }

    const savedToken = getSavedToken();
    if (savedToken && localStorage.getItem(STORAGE.sheetId)) {
      doLoad(savedToken);
      return;
    }

    // Sem token — mostra tela de login
    setLoading(false);

    async function doLoad(accessToken) {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      redirectToGoogle();
    } catch (err) {
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
    notify("Sessão expirada. Reconectando…", true);
    setTimeout(() => redirectToGoogle(), 800);
  }

  return {
    authenticated, token, loading, accountName, accountEmail,
    spreadsheetId, transactionSheetId, sheetIdMap,
    sheetData,
    connectGoogle, disconnect, handleTokenExpired
  };
}
