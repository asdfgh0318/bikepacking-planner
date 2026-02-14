import { Component, ErrorInfo, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null; showDetails: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, showDetails: false }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const s = {
      wrap: { display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: 'system-ui, sans-serif' } as const,
      box: { maxWidth: 520, padding: 32, textAlign: 'center' as const },
      title: { fontSize: 24, fontWeight: 700, marginBottom: 8 },
      msg: { fontSize: 14, opacity: 0.8, marginBottom: 24 },
      btn: { padding: '10px 24px', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 6,
        background: '#3b82f6', color: '#fff', cursor: 'pointer', marginBottom: 16 },
      toggle: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer',
        fontSize: 12, textDecoration: 'underline' as const },
      pre: { marginTop: 12, padding: 12, background: '#1e293b', borderRadius: 6,
        fontSize: 11, textAlign: 'left' as const, overflowX: 'auto' as const, whiteSpace: 'pre-wrap' as const },
    }

    return (
      <div style={s.wrap}>
        <div style={s.box}>
          <div style={s.title}>Something went wrong</div>
          <div style={s.msg}>{this.state.error?.message || 'An unexpected error occurred.'}</div>
          <button style={s.btn} onClick={() => window.location.reload()}>Reload App</button>
          <br />
          <button style={s.toggle} onClick={() => this.setState(p => ({ showDetails: !p.showDetails }))}>
            {this.state.showDetails ? 'Hide details' : 'Show details'}
          </button>
          {this.state.showDetails && (
            <pre style={s.pre}>{this.state.error?.stack}</pre>
          )}
        </div>
      </div>
    )
  }
}
