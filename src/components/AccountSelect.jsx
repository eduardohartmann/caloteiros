import SelectSheet from "./SelectSheet.jsx";

/**
 * AccountSelect
 * Select customizado para contas com busca.
 * No mobile (≤ 760px), exibe um bottom sheet em vez do dropdown flutuante.
 *
 * Props:
 * - options: array de { id, name } (contas ativas)
 * - value: id da conta selecionada (ou "" para todas)
 * - onChange: (id) => void
 * - allowAll: se true, mostra opção "Todas as contas" no topo
 * - placeholder: texto quando nenhuma conta selecionada
 */
export default function AccountSelect({ options, value, onChange, allowAll = false, placeholder = "Selecione..." }) {
  return (
    <SelectSheet
      options={options}
      value={value}
      onChange={onChange}
      title="Selecionar conta"
      searchPlaceholder="Buscar conta..."
      emptyMessage="Nenhuma conta encontrada"
      defaultIcon="🏦"
      placeholder={placeholder}
      allowAll={allowAll}
      allLabel="Todas as contas"
      allIcon="📋"
    />
  );
}
