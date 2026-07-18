import { useCallback, useEffect, useRef, useState } from "react";

export default function useToast() {
  const [toast, setToast] = useState({ message: "", visible: false, error: false });
  const queueRef = useRef([]);
  const timerRef = useRef(null);

  function showNext() {
    if (queueRef.current.length === 0) return;
    const next = queueRef.current.shift();
    setToast({ message: next.message, error: next.error, visible: true });
    timerRef.current = window.setTimeout(() => {
      setToast((c) => ({ ...c, visible: false }));
      // Pequeno delay para a animação de saída antes de mostrar o próximo
      window.setTimeout(showNext, 200);
    }, 3600);
  }

  const notify = useCallback((message, error = false) => {
    queueRef.current.push({ message, error });
    // Se não tem toast visível, mostra imediatamente
    if (!timerRef.current) {
      showNext();
    }
  }, []);

  // Limpa timer ao desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  // Quando o toast fica invisível, limpa o timer ref para permitir novos
  useEffect(() => {
    if (!toast.visible) {
      timerRef.current = null;
    }
  }, [toast.visible]);

  return { toast, notify };
}
