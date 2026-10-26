import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="view-container flex flex-col items-center justify-center p-8 text-center"
          style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            className="card p-8 max-w-lg mx-auto flex flex-col items-center gap-4 text-center"
            style={{
              backgroundColor: 'var(--bg-surface, #1e293b)',
              border: '1px solid var(--border-color, #334155)',
              borderRadius: '16px',
              padding: '36px',
              maxWidth: '520px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)'
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EF4444',
                margin: '0 auto 12px auto'
              }}
            >
              <AlertTriangle size={36} />
            </div>

            <h3
              className="font-heading text-lg font-bold"
              style={{ color: 'var(--text-main, #ffffff)', margin: '4px 0', fontSize: '1.25rem' }}
            >
              Terjadi Kendala Memuat Tampilan
            </h3>

            <p
              className="text-sm text-muted"
              style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.88rem', lineHeight: '1.6' }}
            >
              Sistem mendeteksi kendala pada menu yang dipilih. Klik tombol di bawah untuk memuat ulang tampilan dan kembali ke Terminal Scanner.
            </p>

            {this.state.error && (
              <div
                style={{
                  width: '100%',
                  textAlign: 'left',
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  fontSize: '0.78rem',
                  fontFamily: 'monospace',
                  color: '#F87171',
                  overflowX: 'auto',
                  maxHeight: '120px',
                  margin: '8px 0'
                }}
              >
                {String(this.state.error.message || this.state.error)}
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary flex items-center gap-2 mt-2"
              onClick={this.handleReset}
              style={{ padding: '10px 24px', fontSize: '0.95rem' }}
            >
              <RefreshCw size={16} />
              <span>Muat Ulang Tampilan Menu</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
