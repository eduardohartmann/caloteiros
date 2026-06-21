import { useMemo } from "react";
import { TRANSFER_CATEGORY_ID } from "../constants.js";
import { useSettingsContext } from "../contexts/SettingsContext.jsx";
import CategoryBarChart from "./CategoryBarChart.jsx";
import TransactionCardList from "./TransactionCardList.jsx";
import EmptyState from "./EmptyState.jsx";
import PanelHeader from "./PanelHeader.jsx";

export default function CategoryChart({ transactions, onEdit }) {
  const { categoryMap } = useSettingsContext();

  function resolveCat(id) { return categoryMap?.[id] || id; }

  const expenseTransactions = useMemo(
    () => transactions.filter((item) => item.type === "expense" && item.category !== TRANSFER_CATEGORY_ID),
    [transactions]
  );

  return (
    <>
      <CategoryBarChart
        transactions={transactions}
        categoryMap={categoryMap}
        type="expense"
        title="Despesas por categoria"
        subtitle="Onde seu dinheiro foi usado"
        titleId="spending-title"
        emptyMessage="Sem despesas neste período."
      />

      <section className="panel transactions" aria-labelledby="expense-list-title">
        <PanelHeader
          title="Lançamentos de despesa"
          subtitle={`${expenseTransactions.length} ${expenseTransactions.length === 1 ? "registro" : "registros"}`}
          titleId="expense-list-title"
        />
        <TransactionCardList
          transactions={expenseTransactions}
          onEdit={onEdit}
          resolveCat={resolveCat}
          type="expense"
        />
        {!expenseTransactions.length && <EmptyState message="Nenhuma despesa neste mês." />}
      </section>
    </>
  );
}
