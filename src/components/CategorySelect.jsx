import CustomSelect from "./CustomSelect.jsx";

/**
 * CategorySelect
 * Select customizado para categorias com busca e hierarquia visual.
 *
 * Props:
 * - options: array de { id, name, icon, color, depth } (flattenCategoryTree)
 * - value: id da categoria selecionada
 * - onChange: (id) => void
 */
export default function CategorySelect({ options, value, onChange }) {
  return (
    <CustomSelect
      options={options}
      value={value}
      onChange={onChange}
      placeholder="Selecione..."
      sheetTitle="Selecionar categoria"
      searchPlaceholder="Buscar categoria..."
      emptyMessage="Nenhuma categoria encontrada"
      getItemStyle={(opt) => ({ paddingLeft: `${12 + (opt.depth || 0) * 16}px` })}
      renderOption={(opt) => (
        <>
          <span className="category-select-item-icon" style={{ color: opt.color }}>{opt.icon}</span>
          <span>{opt.name}</span>
        </>
      )}
      renderTrigger={(selected) =>
        selected ? (
          <span className="category-select-value">
            <span className="category-select-icon" style={{ color: selected.color }}>{selected.icon}</span>
            {selected.name}
          </span>
        ) : (
          <span className="category-select-placeholder">Selecione...</span>
        )
      }
    />
  );
}
