import { useCallback, useState } from "react";

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
    message: "",
    resolve: null
  });

  const confirm = useCallback((message, title = "Confirmar") => {
    return new Promise((resolve) => {
      setState({ visible: true, title, message, resolve });
    });
  }, []);

  function handleConfirm() {
    state.resolve?.(true);
    setState((s) => ({ ...s, visible: false }));
  }

  function handleCancel() {
    state.resolve?.(false);
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
