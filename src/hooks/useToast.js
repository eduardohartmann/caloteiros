import { useCallback, useEffect, useRef, useState } from "react";

export default function useToast() {
  const [toast, setToast] = useState({ message: "", visible: false, error: false });
  const queueRef = useRef([]);
  const timerRef = useRef(null);
  const showingRef = useRef(false);

  function showNext() {
    if (queueRef.current.length === 0) {
      showingRef.current = false;
      return;
    }
    showingRef.current = true;
    const next = queueRef.current.shift();
    setToast({ message: next.message, error: next.error, visible: true });
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setToast((c) => ({ ...c, visible: false }));
      // Pequeno delay para a animação de saída antes de mostrar o próximo
      window.setTimeout(showNext, 200);
    }, 3600);
  }

  const notify = useCallback((message, error = false) => {
    queueRef.current.push({ message, error });
    // Se não está no meio de uma sequência de toasts, mostra imediatamente
    if (!showingRef.current && !timerRef.current) {
      showNext();
    }
  }, []);

  // Limpa timer ao desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  return { toast, notify };
}
