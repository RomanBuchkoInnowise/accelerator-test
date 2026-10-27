import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

async function enableMocking() {
  // No backend exists yet: the mock API only runs in development.
  if (!import.meta.env.DEV) return
  const listError = new URLSearchParams(window.location.search).get('mock') === 'list-error'
  const { startMockWorker } = await import('./mocks/browser')
  await startMockWorker({ listError })
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root not found')

await enableMocking()

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
