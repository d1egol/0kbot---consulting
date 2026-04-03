import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryProvider } from '@/providers/QueryProvider'
import { AuthProvider } from '@/providers/AuthProvider'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import App from '@/App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <QueryProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </QueryProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
