import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useMediaQuery from "../hooks/useMediaQuery.js";

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
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const touchStartY = useRef(null);
  const isMobile = useMediaQuery("(max-width: 760px)");

  const selected = options.find((o) => o.id === value);

  useEffect(() => {
    if (!open || isMobile) return;
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, isMobile]);

  // Bloqueia scroll do body quando bottom sheet está aberto
  useEffect(() => {
    if (open && isMobile) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open, isMobile]);

  const filtered = search.trim()
    ? options.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()))
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

  // Detecta se o toque foi um tap (sem arrastar) ou um scroll
  function handleTouchStart(e) {
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e, id) {
    if (touchStartY.current === null) return;
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    touchStartY.current = null;
    // Se moveu menos de 10px, considera um tap
    if (deltaY < 10) {
      handleSelect(id);
    }
  }

  const displayLabel = selected
    ? selected.name
    : (allowAll && !value ? "Todas as contas" : placeholder);

  // ── Bottom sheet (mobile) ───────────────────────────────────────────────────
  const bottomSheet = open && isMobile
    ? createPortal(
        <>
          <div className="sheet-overlay" onClick={handleClose} />
          <div className="sheet-container">
            <div className="sheet-handle" />
            <div className="sheet-header">
              <h3>Selecionar conta</h3>
              <button className="sheet-close" type="button" onClick={handleClose}>✕</button>
            </div>
            <div className="sheet-search">
              <input
                type="text"
                placeholder="Buscar conta..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}

              />
            </div>
            <ul className="sheet-list">
              {allowAll && !search.trim() && (
                <li
                  className={!value ? "selected" : ""}
                  onMouseDown={() => handleSelect("")}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={(e) => handleTouchEnd(e, "")}
                >
                  <span className="sheet-item-icon">📋</span>
                  <span>Todas as contas</span>
                </li>
              )}
              {filtered.map((opt) => (
                <li
                  key={opt.id}
                  className={opt.id === value ? "selected" : ""}
                  onMouseDown={() => handleSelect(opt.id)}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={(e) => handleTouchEnd(e, opt.id)}
                >
                  <span className="sheet-item-icon">🏦</span>
                  <span>{opt.name}</span>
                </li>
              ))}
              {filtered.length === 0 && !allowAll && (
                <li className="sheet-empty">Nenhuma conta encontrada</li>
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
      )
    : null;

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

      {dropdown}
      {bottomSheet}
    </div>
  );
}
