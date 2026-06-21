import { useEffect } from "react";

/**
 * useClickOutside
 * Detecta cliques fora de um elemento referenciado e executa o callback.
 *
 * @param {React.RefObject} ref - Referência ao elemento
 * @param {Function} onClickOutside - Callback executado ao clicar fora
 * @param {boolean} [active=true] - Se false, o listener não é registrado
 */
export default function useClickOutside(ref, onClickOutside, active = true) {
  useEffect(() => {
    if (!active) return;

    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        onClickOutside();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref, onClickOutside, active]);
}
