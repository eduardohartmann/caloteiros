import { useCallback, useRef, useState } from "react";

/**
 * useConfirm
 * Substitui window.confirm por um modal customizado.
 *
 * Uso:
 *   const { confirm, confirmProps } = useConfirm();
 *   const ok = await confirm("Excluir?", "Essa ação não pode ser desfeita.");
 *   if (ok) { ... }
 *
 *   <ConfirmModal {...confirmProps} />
 */
export default function useConfirm() {
  const [state, setState] = useState({
    visible: false,
    title: "",
    message: ""
  });

  const resolveRef = useRef(null);

  const confirm = useCallback((message, title = "Confirmar") => {
    // Se já existe um confirm pendente, resolve com false (cancelado implicitamente)
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ visible: true, title, message });
    });
  }, []);

  function handleConfirm() {
    resolveRef.current?.(true);
    resolveRef.current = null;
    setState((s) => ({ ...s, visible: false }));
  }

  function handleCancel() {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setState((s) => ({ ...s, visible: false }));
  }

  const confirmProps = {
    visible: state.visible,
    title: state.title,
    message: state.message,
    onConfirm: handleConfirm,
    onCancel: handleCancel
  };

  return { confirm, confirmProps };
}
