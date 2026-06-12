import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useMediaQuery from "../hooks/useMediaQuery.js";

/**
 * SelectSheet
 * Componente base reutilizável para selects customizados com busca.
 * No mobile (≤ 760px), exibe um bottom sheet; no desktop, um dropdown flutuante.
 *
 * Props:
 * - options: array de { id, name, icon?, color?, depth? }
 * - value: id selecionado (ou "" para nenhum)
 * - onChange: (id) => void
 * - title: título exibido no header do bottom sheet
 * - searchPlaceholder: placeholder do campo de busca
 * - emptyMessage: mensagem quando nenhum resultado é encontrado
 * - defaultIcon: ícone padrão para itens sem opt.icon (ex: "🏦")
 * - placeholder: texto no trigger quando nada selecionado
 * - allowAll: se true, mostra uma opção "todos" no topo da lista
 * - allLabel: label da opção "todos" (ex: "Todas as contas")
 * - allIcon: ícone da opção "todos" (ex: "📋")
 */
export default function SelectSheet({
  options,
  value,
  onChange,
  title,
  searchPlaceholder = "Buscar...",
  emptyMessage = "Nenhum item encontrado",
  defaultIcon,
  placeholder = "Selecione...",
  allowAll = false,
  allLabel = "Todos",
  allIcon = "📋",
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const touchStartY = useRef(null);
  const isMobile = useMediaQuery("(max-width: 760px)");

  const selected = options.find((o) => o.id === value);

  // ── Click outside (desktop) ─────────────────────────────────────────────────
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

  // ── Bloqueia scroll do body (mobile) ────────────────────────────────────────
  useEffect(() => {
    if (open && isMobile) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open, isMobile]);

  // ── Filtro de busca ─────────────────────────────────────────────────────────
  const filtered = search.trim()
    ? options.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()))
    : options;

  // ── Handlers ────────────────────────────────────────────────────────────────
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
      handleSelect(id);
    }
  }

  // ── Helpers de renderização ─────────────────────────────────────────────────
  function getIcon(opt) {
    return opt.icon || defaultIcon || "";
  }

  function getIconStyle(opt) {
    return opt.color ? { color: opt.color } : undefined;
  }

  function getDepthPadding(opt, base) {
    return opt.depth ? `${base + opt.depth * 16}px` : undefined;
  }

  // ── Trigger display ─────────────────────────────────────────────────────────
  const displayLabel = selected
    ? selected.name
    : (allowAll && !value ? allLabel : placeholder);

  const triggerIcon = selected
    ? (selected.icon || defaultIcon || "")
    : (allowAll && !value ? allIcon : (defaultIcon || ""));

  const triggerIconStyle = selected?.color ? { color: selected.color } : undefined;

  // ── Bottom sheet (mobile) ───────────────────────────────────────────────────
  const bottomSheet = open && isMobile
    ? createPortal(
        <>
          <div className="sheet-overlay" onClick={handleClose} />
          <div className="sheet-container">
            <div className="sheet-handle" />
            <div className="sheet-header">
              <h3>{title}</h3>
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
                  onMouseDown={() => handleSelect("")}
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
                  style={{ paddingLeft: getDepthPadding(opt, 18) }}
                  onMouseDown={() => handleSelect(opt.id)}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={(e) => handleTouchEnd(e, opt.id)}
                >
                  <span className="sheet-item-icon" style={getIconStyle(opt)}>{getIcon(opt)}</span>
                  <span>{opt.name}</span>
                </li>
              ))}
              {filtered.length === 0 && !(allowAll && !search.trim()) && (
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
                style={{ paddingLeft: getDepthPadding(opt, 12) }}
                onMouseDown={() => handleSelect(opt.id)}
              >
                <span className="category-select-item-icon" style={getIconStyle(opt)}>{getIcon(opt)}</span>
                <span>{opt.name}</span>
              </li>
            ))}
            {filtered.length === 0 && !(allowAll && !search.trim()) && (
              <li className="category-select-empty">{emptyMessage}</li>
            )}
          </ul>
        </div>
      )
    : null;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="category-select" ref={ref}>
      <button
        type="button"
        className="category-select-trigger"
        onClick={() => setOpen(!open)}
      >
        {selected || (allowAll && !value) ? (
          <span className="category-select-value">
            <span className="category-select-icon" style={triggerIconStyle}>{triggerIcon}</span>
            {displayLabel}
          </span>
        ) : (
          <span className="category-select-placeholder">{placeholder}</span>
        )}
        <span className="category-select-arrow">▾</span>
      </button>

      {dropdown}
      {bottomSheet}
    </div>
  );
}
