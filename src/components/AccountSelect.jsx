import CustomSelect from "./CustomSelect.jsx";

/**
 * AccountSelect
 * Select customizado para contas com busca.
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
    <CustomSelect
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      sheetTitle="Selecionar conta"
      searchPlaceholder="Buscar conta..."
      emptyMessage="Nenhuma conta encontrada"
      allowAll={allowAll}
      allLabel="Todas as contas"
      allIcon="📋"
      renderOption={(opt) => (
        <>
          <span className="category-select-item-icon">🏦</span>
          <span>{opt.name}</span>
        </>
      )}
      renderTrigger={(selected) => (
        <span className="category-select-value">
          <span className="category-select-icon">🏦</span>
          {selected ? selected.name : (allowAll && !value ? "Todas as contas" : placeholder)}
        </span>
      )}
    />
  );
}
