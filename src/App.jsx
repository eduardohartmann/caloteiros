import CategoryChart from "./components/CategoryChart.jsx";
import ConfirmModal from "./components/ConfirmModal.jsx";
import CouplePage from "./components/CouplePage.jsx";
import DashboardHeader from "./components/DashboardHeader.jsx";
import IncomePage from "./components/IncomePage.jsx";
import OverviewPage from "./components/OverviewPage.jsx";
import SettingsRoute from "./components/SettingsRoute.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Spinner from "./components/Spinner.jsx";
import Toast from "./components/Toast.jsx";
import TransactionForm from "./components/TransactionForm.jsx";
import { navigate, ROUTES } from "./routes.js";
import useRouter from "./hooks/useRouter.js";
import useToast from "./hooks/useToast.js";
import useAuth from "./hooks/useAuth.js";
import useTransactions from "./hooks/useTransactions.js";
import useCouple from "./hooks/useCouple.js";
import useSettings from "./hooks/useSettings.js";
import useConfirm from "./hooks/useConfirm.js";
import useSwipeMonth from "./hooks/useSwipeMonth.js";
import Brand from "./components/Brand.jsx";
import { useRef } from "react";

export default function App() {
  const route = useRouter();
  const { toast, notify } = useToast();
  const { confirm, confirmProps } = useConfirm();
  const auth = useAuth(notify);
  const settings = useSettings(auth);
  const couple = useCouple(auth, notify, confirm);
  const txns = useTransactions(auth, notify, confirm, (entry) => couple.addSharedEntry(entry), settings);
  const workspaceRef = useRef(null);
  useSwipeMonth(workspaceRef, txns.month, txns.setMonth);

  function handleDisconnect() {
    auth.disconnect();
    couple.reset();
    settings.reset();
  }

  // ── loading ─────────────────────────────────────────────────────────────────
  if (auth.loading) {
    return (
      <>
        <div className="grain" />
        <div className="restoring-screen">
          <Brand />
          <Spinner text="Conectando…" />
        </div>
      </>
    );
  }

  // ── tela de login ───────────────────────────────────────────────────────────
  if (!auth.authenticated) {
    return (
      <>
        <div className="grain" />
        <div className="login-screen">
          <Brand />
          <h1>Controle financeiro do casal</h1>
          <p>Conecte sua conta Google para começar. Seus dados ficam na sua própria planilha.</p>
          <button className="google-button" type="button" onClick={auth.connectGoogle}>
            Conectar com Google
          </button>
        </div>
        <Toast toast={toast} />
      </>
    );
  }

  // ── dashboard ───────────────────────────────────────────────────────────────
  const routeTitle = {
    [ROUTES.overview]: "Visão geral",
    [ROUTES.categories]: "Despesas",
    [ROUTES.incomes]: "Receitas",
    [ROUTES.newTransaction]: txns.draft.id ? "Editar lançamento" : "Novo lançamento",
    [ROUTES.couple]: "Casal",
    [ROUTES.settings]: "Configurações"
  }[route] || "Visão geral";

  return (
    <>
      <div className="grain" />
      <main className="app" id="app">
        <Sidebar
          connected={true}
          route={route}
          spreadsheetId={auth.spreadsheetId}
          onNavigate={navigate}
        />
        <section className="workspace" ref={workspaceRef} id="dashboard-content" aria-label="Painel financeiro">
          <DashboardHeader
            name={auth.accountName}
            title={routeTitle}
            month={txns.month}
            onMonthChange={txns.setMonth}
          />

          {route === ROUTES.overview && (
            <div className="route-page">
              <OverviewPage
                txns={txns}
                settings={settings}
                onExpenseClick={() => navigate(ROUTES.categories)}
                onIncomeClick={() => navigate(ROUTES.incomes)}
              />
            </div>
          )}

          {route === ROUTES.categories && (
            <div className="route-page route-page--wide">
              <CategoryChart
                transactions={txns.visibleTransactions}
                categoryMap={settings.categoryMap}
                onEdit={txns.editTransaction}
              />
            </div>
          )}

          {route === ROUTES.incomes && (
            <div className="route-page route-page--wide">
              <IncomePage
                transactions={txns.visibleTransactions}
                categoryMap={settings.categoryMap}
                onEdit={txns.editTransaction}
              />
            </div>
          )}

          {route === ROUTES.newTransaction && (
            <div className="route-page route-page--form">
              <TransactionForm
                transaction={txns.draft}
                editing={Boolean(txns.draft.id)}
                onChange={txns.setDraft}
                onCancel={txns.resetForm}
                onSubmit={txns.saveTransaction}
                onRemove={txns.removeTransaction}
                onTransfer={txns.transferBetweenAccounts}
                categories={settings.categories}
                accounts={settings.accounts}
                suggestions={txns.suggestions}
                saving={txns.saving}
              />
            </div>
          )}

          {route === ROUTES.couple && (
            <div className="route-page">
              <CouplePage
                auth={auth}
                couple={couple}
                month={txns.month}
                onConfirmReimbursement={(reimbursement) => {
                  txns.setDraft({ ...reimbursement, id: "", createdAt: "", split: false, lockType: true });
                  navigate(ROUTES.newTransaction);
                }}
                onPaymentDraft={(paymentDraft) => {
                  txns.setDraft({ ...paymentDraft, id: "", createdAt: "", split: false, lockType: true });
                  navigate(ROUTES.newTransaction);
                }}
              />
            </div>
          )}

          {route === ROUTES.settings && (
            <div className="route-page">
              <SettingsRoute
                settings={settings}
                notify={notify}
                onDisconnect={handleDisconnect}
                auth={auth}
                confirm={confirm}
                onImportComplete={() => {
                  // Recarrega dados após importação
                  auth.reload && auth.reload();
                }}
              />
            </div>
          )}
        </section>
      </main>
      <Toast toast={toast} />
      <ConfirmModal {...confirmProps} />
    </>
  );
}
