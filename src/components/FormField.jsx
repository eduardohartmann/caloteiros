/**
 * FormField
 * Campo de formulário reutilizável com label.
 *
 * Props:
 * - label: string — texto do label
 * - children: ReactNode — input/select/componente customizado
 * - className: string (opcional) — classe extra no wrapper
 * - htmlFor: string (opcional) — ID do input para acessibilidade
 */
export default function FormField({ label, children, className = "", htmlFor }) {
  return (
    <label className={className} htmlFor={htmlFor}>
      {label}
      {children}
    </label>
  );
}
