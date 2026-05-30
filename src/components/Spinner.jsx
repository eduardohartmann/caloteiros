/**
 * Spinner
 * Indicador de carregamento visual.
 */
export default function Spinner({ text = "Carregando…" }) {
  return (
    <div className="spinner-container">
      <div className="spinner" />
      {text && <p className="spinner-text">{text}</p>}
    </div>
  );
}
