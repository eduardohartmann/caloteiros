import { useEffect } from "react";

/**
 * useBodyScrollLock
 * Bloqueia o scroll do body quando `active` é true.
 * Restaura automaticamente ao desmontar ou quando `active` muda para false.
 *
 * @param {boolean} active - Se true, bloqueia o scroll do body
 */
export default function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [active]);
}
