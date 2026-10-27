import { setupWorker } from 'msw/browser'
import { createHandlers, type MockOptions } from './handlers'

export const startMockWorker = (options: MockOptions = {}) =>
  setupWorker(...createHandlers(options)).start({ onUnhandledFrame: 'bypass' })
