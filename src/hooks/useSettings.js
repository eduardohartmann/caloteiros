import { useEffect, useMemo, useState } from "react";
import { makeSettingsApi } from "../services/googleSheets.js";
import { buildCategoryMap, buildAccountMap } from "../utils/resolvers.js";

/**
 * useSettings
 * Gerencia categorias, contas e o settingsApi.
 */
export default function useSettings(auth) {
  const { token, spreadsheetId, sheetIdMap, sheetData } = auth;

  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Carrega dados quando sheetData muda
  useEffect(() => {
    if (sheetData) {
      setCategories(sheetData.categories || []);
      setAccounts(sheetData.accounts || []);
    }
  }, [sheetData]);

  // Mapas id→nome
  const categoryMap = useMemo(() => buildCategoryMap(categories), [categories]);
  const accountMap = useMemo(() => buildAccountMap(accounts), [accounts]);

  // API de settings (criada sob demanda)
  const settingsApi = token && spreadsheetId
    ? makeSettingsApi(token, spreadsheetId, sheetIdMap)
    : null;

  function reset() {
    setCategories([]);
    setAccounts([]);
  }

  return {
    categories, setCategories,
    accounts, setAccounts,
    categoryMap, accountMap,
    settingsApi,
    settingsLoading, setSettingsLoading,
    reset
  };
}
