import React, { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback(this.state.error, this.handleReset)
          : this.props.fallback;
      }

      return (
        <div
          style={{
            padding: '2.5rem',
            margin: '2rem auto',
            maxWidth: '640px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #fee2e2',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#fef2f2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              fontSize: '1.5rem',
              fontWeight: 'bold'
            }}
          >
            !
          </div>
          <h3 style={{ color: '#1e293b', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            {this.props.title || 'Something went wrong displaying this view'}
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {this.state.error?.message || 'An unexpected rendering error occurred. Please refresh the page or return to courses.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              className="btn-primary"
              onClick={this.handleReset}
              style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}
            >
              Try Again
            </button>
            <button
              className="btn-secondary"
              onClick={() => window.location.reload()}
              style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
