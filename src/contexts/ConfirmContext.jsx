import { createContext, useContext } from "react";

/**
 * ConfirmContext
 * Fornece a função `confirm(message, title?)` que retorna Promise<boolean>.
 */
const ConfirmContext = createContext(null);

export function ConfirmProvider({ confirm, children }) {
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
    </ConfirmContext.Provider>
  );
}

/**
 * useConfirmContext
 * Hook para acessar a função confirm de dentro de qualquer componente.
 * Retorna (message: string, title?: string) => Promise<boolean>
 */
export function useConfirmContext() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error("useConfirmContext deve ser usado dentro de ConfirmProvider");
  }
  return confirm;
}
