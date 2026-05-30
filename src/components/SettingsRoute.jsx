import { useState } from "react";
import SettingsPage from "./SettingsPage.jsx";
import ImportTransactions from "./ImportTransactions.jsx";

/**
 * SettingsRoute
 * Página de configurações com abas de categorias, contas e importação.
 */
export default function SettingsRoute({ settings, notify, onDisconnect, auth, confirm, onImportComplete }) {
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
      notify={notify}
      onDisconnect={onDisconnect}
      confirm={confirm}
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
          notify={notify}
        />
      }
    />
  );
}
