import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'
import { debugLog } from './utils/debugLogger'
import { initAutoWatch } from './utils/debugAutoWatch'

debugLog.info('app', 'init', { timestamp: new Date().toISOString(), userAgent: navigator.userAgent })
initAutoWatch()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
