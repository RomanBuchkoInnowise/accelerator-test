import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchSessions } from './api/sessionsApi'
import type { TrainingSession } from './types'

export type SessionsState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; sessions: TrainingSession[] }

export function useSessions() {
  const [state, setState] = useState<SessionsState>({ status: 'loading' })
  // Only the latest request may write state; older responses are ignored.
  const latestRequestId = useRef(0)

  const request = useCallback(() => {
    const requestId = ++latestRequestId.current
    fetchSessions().then(
      (sessions) => {
        if (requestId === latestRequestId.current) setState({ status: 'success', sessions })
      },
      () => {
        if (requestId === latestRequestId.current) setState({ status: 'error' })
      },
    )
  }, [])

  // StrictMode mounts twice in dev; the request id keeps only the second response.
  useEffect(() => {
    request()
  }, [request])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    request()
  }, [request])

  const addSession = useCallback((session: TrainingSession) => {
    setState((current) =>
      current.status === 'success' ? { status: 'success', sessions: [...current.sessions, session] } : current,
    )
  }, [])

  return { state, retry, addSession }
}
