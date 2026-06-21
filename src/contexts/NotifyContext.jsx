import { createContext, useContext } from "react";

/**
 * NotifyContext
 * Fornece a função `notify(message, isError?)` para qualquer componente.
 */
const NotifyContext = createContext(null);

export function NotifyProvider({ notify, children }) {
  return (
    <NotifyContext.Provider value={notify}>
      {children}
    </NotifyContext.Provider>
  );
}

/**
 * useNotify
 * Hook para acessar a função notify de dentro de qualquer componente.
 * Retorna (message: string, isError?: boolean) => void
 */
export function useNotify() {
  const notify = useContext(NotifyContext);
  if (!notify) {
    throw new Error("useNotify deve ser usado dentro de NotifyProvider");
  }
  return notify;
}
