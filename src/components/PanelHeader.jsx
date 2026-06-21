/**
 * PanelHeader
 * Cabeçalho reutilizável para painéis (.panel).
 *
 * Props:
 * - title: string (obrigatório)
 * - subtitle: string (opcional)
 * - titleId: string (opcional, para aria-labelledby)
 * - actions: ReactNode (opcional, renderizado à direita)
 */
export default function PanelHeader({ title, subtitle, titleId, actions }) {
  return (
    <div className="panel-header">
      <div>
        <h3 id={titleId}>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="settings-header-actions">{actions}</div>}
    </div>
  );
}
