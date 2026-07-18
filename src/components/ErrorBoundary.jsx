import { Component } from "react";

/**
 * ErrorBoundary
 * Captura erros de renderização e exibe fallback amigável
 * ao invés de tela branca.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <h1>Algo deu errado</h1>
            <p>O app encontrou um erro inesperado.</p>
            {this.state.error && (
              <details className="error-boundary-details">
                <summary>Detalhes técnicos</summary>
                <pre>{this.state.error.message}</pre>
              </details>
            )}
            <div className="error-boundary-actions">
              <button className="primary-button" onClick={this.handleReload}>
                Recarregar app
              </button>
              <button className="secondary-button" onClick={this.handleReset}>
                Tentar continuar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
