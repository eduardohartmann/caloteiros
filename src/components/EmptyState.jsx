/**
 * EmptyState
 * Mensagem de estado vazio reutilizável.
 *
 * Props:
 * - message: string (obrigatório)
 */
export default function EmptyState({ message }) {
  return <div className="empty">{message}</div>;
}
