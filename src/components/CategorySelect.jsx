import SelectSheet from "./SelectSheet.jsx";

/**
 * CategorySelect
 * Select customizado para categorias com busca e hierarquia visual.
 * No mobile (≤ 760px), exibe um bottom sheet em vez do dropdown flutuante.
 *
 * Props:
 * - options: array de { id, name, icon, color, depth, label } (flattenCategoryTree)
 * - value: id da categoria selecionada
 * - onChange: (id) => void
 */
export default function CategorySelect({ options, value, onChange }) {
  return (
    <SelectSheet
      options={options}
      value={value}
      onChange={onChange}
      title="Selecionar categoria"
      searchPlaceholder="Buscar categoria..."
      emptyMessage="Nenhuma categoria encontrada"
    />
  );
}
