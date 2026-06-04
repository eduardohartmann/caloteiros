import { useEffect, useRef, useState } from "react";

/**
 * CategorySelect
 * Select customizado para categorias com busca e hierarquia visual.
 *
 * Props:
 * - options: array de { id, name, icon, color, depth, label } (flattenCategoryTree)
 * - value: id da categoria selecionada
 * - onChange: (id) => void
 */
export default function CategorySelect({ options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  const selected = options.find((o) => o.id === value);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);



  const filtered = search.trim()
    ? options.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()))
    : options;

  function handleSelect(id) {
    onChange(id);
    setOpen(false);
    setSearch("");
  }

  return (
    <div className="category-select" ref={ref}>
      <button
        type="button"
        className="category-select-trigger"
        onClick={() => setOpen(!open)}
      >
        {selected ? (
          <span className="category-select-value">
            <span className="category-select-icon" style={{ color: selected.color }}>{selected.icon}</span>
            {selected.name}
          </span>
        ) : (
          <span className="category-select-placeholder">Selecione...</span>
        )}
        <span className="category-select-arrow">▾</span>
      </button>

      {open && (
        <div className="category-select-dropdown">
          <div className="category-select-search">
            <input
              type="text"
              placeholder="Buscar categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ul className="category-select-list">
            {filtered.map((opt) => (
              <li
                key={opt.id}
                className={`category-select-item${opt.id === value ? " selected" : ""}`}
                style={{ paddingLeft: `${12 + (opt.depth || 0) * 16}px` }}
                onMouseDown={() => handleSelect(opt.id)}
              >
                <span className="category-select-item-icon" style={{ color: opt.color }}>{opt.icon}</span>
                <span>{opt.name}</span>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="category-select-empty">Nenhuma categoria encontrada</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
