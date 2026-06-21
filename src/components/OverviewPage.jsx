import SummaryCards from "./SummaryCards.jsx";
import TransactionsTable from "./TransactionsTable.jsx";
import { useSettingsContext } from "../contexts/SettingsContext.jsx";

/**
 * OverviewPage
 * Página de visão geral com cards de resumo e tabela de lançamentos.
 */
export default function OverviewPage({ txns, onExpenseClick, onIncomeClick }) {
  const { accounts, categories, categoryMap, accountMap } = useSettingsContext();

  return (
    <>
      <SummaryCards
        transactions={txns.visibleTransactions}
        allTransactions={txns.allTransactions}
        month={txns.month}
        accounts={accounts}
        onExpenseClick={onExpenseClick}
        onIncomeClick={onIncomeClick}
      />
      <TransactionsTable
        transactions={txns.visibleTransactions}
        onEdit={txns.editTransaction}
        categoryMap={categoryMap}
        accountMap={accountMap}
        accounts={accounts}
        categories={categories}
      />
    </>
  );
}
