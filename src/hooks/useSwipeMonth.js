import { useEffect, useRef } from "react";

/**
 * useSwipeMonth
 * Detecta gestos de swipe horizontal para navegar entre meses.
 * Swipe para a esquerda → próximo mês
 * Swipe para a direita → mês anterior
 */
export default function useSwipeMonth(ref, month, onMonthChange) {
  const touchStart = useRef(null);
  const touchEnd = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const MIN_SWIPE_DISTANCE = 60;

    function handleTouchStart(e) {
      touchEnd.current = null;
      touchStart.current = e.targetTouches[0].clientX;
    }

    function handleTouchMove(e) {
      touchEnd.current = e.targetTouches[0].clientX;
    }

    function handleTouchEnd() {
      if (touchStart.current === null || touchEnd.current === null) return;
      const distance = touchStart.current - touchEnd.current;

      if (Math.abs(distance) < MIN_SWIPE_DISTANCE) return;

      const [year, m] = month.split("-").map(Number);

      if (distance > 0) {
        // Swipe esquerda → próximo mês
        const next = new Date(year, m);
        onMonthChange(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
      } else {
        // Swipe direita → mês anterior
        const prev = new Date(year, m - 2);
        onMonthChange(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`);
      }

      touchStart.current = null;
      touchEnd.current = null;
    }

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: true });
    el.addEventListener("touchend", handleTouchEnd);

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [ref, month, onMonthChange]);
}
