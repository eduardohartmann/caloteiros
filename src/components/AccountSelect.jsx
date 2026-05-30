import { useEffect, useRef, useState } from "react";

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
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

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

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const filtered = search.trim()
    ? options.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()))
    : options;

  function handleSelect(id) {
    onChange(id);
    setOpen(false);
    setSearch("");
  }

  const displayLabel = selected
    ? selected.name
    : (allowAll && !value ? "Todas as contas" : placeholder);

  return (
    <div className="category-select" ref={ref}>
      <button
        type="button"
        className="category-select-trigger"
        onClick={() => setOpen(!open)}
      >
        <span className="category-select-value">
          <span className="category-select-icon">🏦</span>
          {displayLabel}
        </span>
        <span className="category-select-arrow">▾</span>
      </button>

      {open && (
        <div className="category-select-dropdown">
          <div className="category-select-search">
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar conta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ul className="category-select-list">
            {allowAll && !search.trim() && (
              <li
                className={`category-select-item${!value ? " selected" : ""}`}
                onMouseDown={() => handleSelect("")}
              >
                <span className="category-select-item-icon">📋</span>
                <span>Todas as contas</span>
              </li>
            )}
            {filtered.map((opt) => (
              <li
                key={opt.id}
                className={`category-select-item${opt.id === value ? " selected" : ""}`}
                onMouseDown={() => handleSelect(opt.id)}
              >
                <span className="category-select-item-icon">🏦</span>
                <span>{opt.name}</span>
              </li>
            ))}
            {filtered.length === 0 && !allowAll && (
              <li className="category-select-empty">Nenhuma conta encontrada</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
