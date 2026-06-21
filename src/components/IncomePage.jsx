import { useMemo } from "react";
import { TRANSFER_CATEGORY_ID } from "../constants.js";
import CategoryBarChart from "./CategoryBarChart.jsx";
import TransactionCardList from "./TransactionCardList.jsx";
import EmptyState from "./EmptyState.jsx";
import PanelHeader from "./PanelHeader.jsx";

export default function IncomePage({ transactions, categoryMap, onEdit }) {
  function resolveCat(id) { return categoryMap?.[id] || id; }

  const incomeTransactions = useMemo(
    () => transactions.filter((item) => item.type === "income" && item.category !== TRANSFER_CATEGORY_ID),
    [transactions]
  );

  return (
    <>
      <CategoryBarChart
        transactions={transactions}
        categoryMap={categoryMap}
        type="income"
        title="Receitas por categoria"
        subtitle="De onde veio seu dinheiro"
        titleId="income-title"
        barClass="bar--income"
        emptyMessage="Sem receitas neste período."
      />

      <section className="panel transactions" aria-labelledby="income-list-title">
        <PanelHeader
          title="Lançamentos de receita"
          subtitle={`${incomeTransactions.length} ${incomeTransactions.length === 1 ? "registro" : "registros"}`}
          titleId="income-list-title"
        />
        <TransactionCardList
          transactions={incomeTransactions}
          onEdit={onEdit}
          resolveCat={resolveCat}
          type="income"
        />
        {!incomeTransactions.length && <EmptyState message="Nenhuma receita neste mês." />}
      </section>
    </>
  );
}
