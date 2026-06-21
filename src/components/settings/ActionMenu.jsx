import { useCallback, useRef, useState } from "react";
import useClickOutside from "../../hooks/useClickOutside.js";

/**
 * ActionMenu
 * Dropdown de ações com botão "⋮".
 */
export default function ActionMenu({ actions, loading }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const handleClose = useCallback(() => setOpen(false), []);
  useClickOutside(ref, handleClose, open);

  return (
    <div className="action-menu" ref={ref}>
      <button
        type="button"
        className="action-menu-trigger"
        onClick={() => setOpen(!open)}
        disabled={loading}
        aria-label="Opções"
      >
        ⋮
      </button>
      {open && (
        <ul className="action-menu-dropdown">
          {actions.map((action) => (
            <li key={action.label}>
              <button
                type="button"
                className={`action-menu-item${action.danger ? " danger" : ""}`}
                onClick={() => { setOpen(false); action.onClick(); }}
                disabled={loading}
              >
                {action.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
