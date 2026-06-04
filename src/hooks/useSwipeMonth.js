import { useEffect, useRef } from "react";

/**
 * useSwipeMonth
 * Detecta gestos de swipe horizontal para navegar entre meses.
 * Swipe para a esquerda → próximo mês
 * Swipe para a direita → mês anterior
 *
 * Proteções contra falsos positivos:
 * - Distância mínima horizontal de 90px
 * - Razão horizontal/vertical mínima de 2:1 (ignora scroll vertical)
 * - Tempo máximo de 400ms (ignora drags lentos)
 */
export default function useSwipeMonth(ref, month, onMonthChange) {
  const touchStart = useRef(null);
  const touchEnd = useRef(null);
  const touchStartY = useRef(null);
  const touchEndY = useRef(null);
  const touchStartTime = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const MIN_SWIPE_DISTANCE = 90;
    const MAX_SWIPE_TIME = 400; // ms
    const MIN_RATIO = 2; // horizontal deve ser pelo menos 2x o vertical

    function handleTouchStart(e) {
      touchEnd.current = null;
      touchEndY.current = null;
      touchStart.current = e.targetTouches[0].clientX;
      touchStartY.current = e.targetTouches[0].clientY;
      touchStartTime.current = Date.now();
    }

    function handleTouchMove(e) {
      touchEnd.current = e.targetTouches[0].clientX;
      touchEndY.current = e.targetTouches[0].clientY;
    }

    function handleTouchEnd() {
      if (touchStart.current === null || touchEnd.current === null) return;

      const distanceX = touchStart.current - touchEnd.current;
      const distanceY = touchStartY.current - touchEndY.current;
      const elapsed = Date.now() - touchStartTime.current;

      const absX = Math.abs(distanceX);
      const absY = Math.abs(distanceY);

      // Ignora se muito lento, muito curto, ou se é predominantemente vertical
      if (elapsed > MAX_SWIPE_TIME) return;
      if (absX < MIN_SWIPE_DISTANCE) return;
      if (absY > 0 && absX / absY < MIN_RATIO) return;

      const [year, m] = month.split("-").map(Number);

      if (distanceX > 0) {
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
      touchStartY.current = null;
      touchEndY.current = null;
      touchStartTime.current = null;
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
