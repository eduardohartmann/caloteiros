import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useMediaQuery from "../hooks/useMediaQuery.js";
import useClickOutside from "../hooks/useClickOutside.js";
import useBodyScrollLock from "../hooks/useBodyScrollLock.js";

/**
 * CustomSelect
 * Select genérico com dropdown (desktop) e bottom sheet (mobile).
 *
 * Props:
 * - options: array de objetos (deve ter `id` e `name`)
 * - value: id do item selecionado (ou "" para nenhum/all)
 * - onChange: (id) => void
 * - placeholder: texto quando nenhum item selecionado
 * - sheetTitle: título do bottom sheet no mobile
 * - searchPlaceholder: placeholder do input de busca
 * - emptyMessage: mensagem quando não há resultados
 * - allowAll: se true, mostra opção "todos" no topo
 * - allLabel: texto da opção "todos" (padrão: "Todos")
 * - allIcon: ícone da opção "todos" (padrão: "📋")
 * - renderOption: (option, { selected }) => ReactNode — customiza renderização de cada opção
 * - renderTrigger: (selectedOption) => ReactNode — customiza o conteúdo do botão trigger
 * - getItemStyle: (option) => object — estilo inline extra para cada item (ex: indent)
 * - filterFn: (option, searchQuery) => boolean — lógica de filtro customizada
 */
export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Selecione...",
  sheetTitle = "Selecionar",
  searchPlaceholder = "Buscar...",
  emptyMessage = "Nenhum item encontrado",
  allowAll = false,
  allLabel = "Todos",
  allIcon = "📋",
  renderOption,
  renderTrigger,
  getItemStyle,
  filterFn
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const touchStartY = useRef(null);
  const isMobile = useMediaQuery("(max-width: 760px)");

  const selected = options.find((o) => o.id === value);

  const handleCloseDropdown = useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);

  useClickOutside(ref, handleCloseDropdown, open && !isMobile);
  useBodyScrollLock(open && isMobile);

  const filtered = search.trim()
    ? options.filter((o) => filterFn
        ? filterFn(o, search)
        : o.name.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  function handleSelect(id) {
    onChange(id);
    setOpen(false);
    setSearch("");
  }

  function handleClose() {
    setOpen(false);
    setSearch("");
  }

  function handleTouchStart(e) {
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e, id) {
    if (touchStartY.current === null) return;
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    touchStartY.current = null;
    if (deltaY < 10) {
      e.preventDefault();
      handleSelect(id);
    }
  }

  // Renderização padrão de opção
  function defaultRenderOption(opt) {
    return <span>{opt.name}</span>;
  }

  const renderOpt = renderOption || defaultRenderOption;

  // ── Bottom sheet (mobile) ───────────────────────────────────────────────────
  const bottomSheet = open && isMobile
    ? createPortal(
        <>
          <div className="sheet-overlay" onClick={handleClose} />
          <div className="sheet-container">
            <div className="sheet-handle" />
            <div className="sheet-header">
              <h3>{sheetTitle}</h3>
              <button className="sheet-close" type="button" onClick={handleClose}>✕</button>
            </div>
            <div className="sheet-search">
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <ul className="sheet-list">
              {allowAll && !search.trim() && (
                <li
                  className={!value ? "selected" : ""}
                  onClick={() => handleSelect("")}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={(e) => handleTouchEnd(e, "")}
                >
                  <span className="sheet-item-icon">{allIcon}</span>
                  <span>{allLabel}</span>
                </li>
              )}
              {filtered.map((opt) => (
                <li
                  key={opt.id}
                  className={opt.id === value ? "selected" : ""}
                  style={getItemStyle ? getItemStyle(opt) : undefined}
                  onClick={() => handleSelect(opt.id)}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={(e) => handleTouchEnd(e, opt.id)}
                >
                  {renderOpt(opt, { selected: opt.id === value })}
                </li>
              ))}
              {filtered.length === 0 && !allowAll && (
                <li className="sheet-empty">{emptyMessage}</li>
              )}
            </ul>
          </div>
        </>,
        document.body
      )
    : null;

  // ── Dropdown (desktop) ──────────────────────────────────────────────────────
  const dropdown = open && !isMobile
    ? (
        <div className="category-select-dropdown">
          <div className="category-select-search">
            <input
              type="text"
              placeholder={searchPlaceholder}
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
                <span className="category-select-item-icon">{allIcon}</span>
                <span>{allLabel}</span>
              </li>
            )}
            {filtered.map((opt) => (
              <li
                key={opt.id}
                className={`category-select-item${opt.id === value ? " selected" : ""}`}
                style={getItemStyle ? getItemStyle(opt) : undefined}
                onMouseDown={() => handleSelect(opt.id)}
              >
                {renderOpt(opt, { selected: opt.id === value })}
              </li>
            ))}
            {filtered.length === 0 && !allowAll && (
              <li className="category-select-empty">{emptyMessage}</li>
            )}
          </ul>
        </div>
      )
    : null;

  // ── Trigger ─────────────────────────────────────────────────────────────────
  const triggerContent = renderTrigger
    ? renderTrigger(selected)
    : selected
      ? (
          <span className="category-select-value">
            <span className="category-select-icon">{selected.icon || ""}</span>
            {selected.name}
          </span>
        )
      : (
          <span className="category-select-placeholder">{allowAll && !value ? allLabel : placeholder}</span>
        );

  return (
    <div className="category-select" ref={ref}>
      <button
        type="button"
        className="category-select-trigger"
        onClick={() => setOpen(!open)}
      >
        {triggerContent}
        <span className="category-select-arrow">▾</span>
      </button>

      {dropdown}
      {bottomSheet}
    </div>
  );
}
