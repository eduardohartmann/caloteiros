import { createContext, useContext } from "react";

/**
 * SettingsContext
 * Fornece categorias, contas e mapas de resolução para qualquer componente.
 */
const SettingsContext = createContext(null);

export function SettingsProvider({ settings, children }) {
  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}

/**
 * useSettingsContext
 * Hook para acessar settings (categories, accounts, categoryMap, accountMap, settingsApi, etc.)
 */
export function useSettingsContext() {
  const settings = useContext(SettingsContext);
  if (!settings) {
    throw new Error("useSettingsContext deve ser usado dentro de SettingsProvider");
  }
  return settings;
}
