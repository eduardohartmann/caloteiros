import SettingsPage from "./SettingsPage.jsx";
import ImportTransactions from "./ImportTransactions.jsx";
import { useSettingsContext } from "../contexts/SettingsContext.jsx";

/**
 * SettingsRoute
 * Página de configurações com abas de categorias, contas e importação.
 * Consome settings via Context.
 */
export default function SettingsRoute({ onDisconnect, auth, onImportComplete }) {
  const settings = useSettingsContext();

  if (!settings.settingsApi) return null;

  return (
    <SettingsPage
      categories={settings.categories}
      accounts={settings.accounts}
      settingsApi={settings.settingsApi}
      onCategoriesChange={settings.setCategories}
      onAccountsChange={settings.setAccounts}
      loading={settings.settingsLoading}
      setLoading={settings.setSettingsLoading}
      onDisconnect={onDisconnect}
      importTab={
        <ImportTransactions
          categories={settings.categories}
          accounts={settings.accounts}
          settingsApi={settings.settingsApi}
          token={auth.token}
          spreadsheetId={auth.spreadsheetId}
          onComplete={() => {
            if (onImportComplete) onImportComplete();
          }}
        />
      }
    />
  );
}
