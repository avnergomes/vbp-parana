import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#64748b',
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem'
        }}>
          <div style={{ fontSize: '2rem' }}>⚠️</div>
          <h3 style={{ margin: 0, color: '#334155' }}>
            Erro ao carregar este componente
          </h3>
          <p style={{ margin: 0, maxWidth: '400px' }}>
            Ocorreu um erro inesperado. Tente recarregar a página.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Recarregar página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
