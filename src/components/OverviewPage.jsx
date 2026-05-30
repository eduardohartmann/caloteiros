import SummaryCards from "./SummaryCards.jsx";
import TransactionsTable from "./TransactionsTable.jsx";

/**
 * OverviewPage
 * Página de visão geral com cards de resumo e tabela de lançamentos.
 */
export default function OverviewPage({ txns, settings }) {
  return (
    <>
      <SummaryCards
        transactions={txns.visibleTransactions}
        allTransactions={txns.allTransactions}
        month={txns.month}
        accounts={settings.accounts}
      />
      <TransactionsTable
        transactions={txns.visibleTransactions}
        onEdit={txns.editTransaction}
        categoryMap={settings.categoryMap}
        accountMap={settings.accountMap}
        accounts={settings.accounts}
        categories={settings.categories}
      />
    </>
  );
}
