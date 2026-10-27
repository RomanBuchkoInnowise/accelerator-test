import { useState } from 'react'
import { CreateSessionForm } from './components/CreateSessionForm'
import { SessionList } from './components/SessionList'
import { SessionStatusFilter, type StatusFilterValue } from './components/SessionStatusFilter'
import type { TrainingSession } from './types'
import { useSessions } from './useSessions'

const CREATE_FORM_ID = 'create-session-form'

export function TrainingSessionsWorkspace() {
  const { state, retry, addSession } = useSessions()
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)

  function handleCreated(session: TrainingSession) {
    addSession(session)
    setIsFormOpen(false)
    // Keep the new session visible if the active filter would hide it.
    setStatusFilter((current) => (current === 'all' || current === session.status ? current : 'all'))
  }

  return (
    <section className="workspace" aria-labelledby="workspace-heading">
      <header className="workspace__header">
        <h1 id="workspace-heading">Training sessions</h1>
        <button
          type="button"
          aria-expanded={isFormOpen}
          aria-controls={isFormOpen ? CREATE_FORM_ID : undefined}
          onClick={() => setIsFormOpen(true)}
        >
          New session
        </button>
      </header>

      {isFormOpen ? (
        <div id={CREATE_FORM_ID}>
          <CreateSessionForm onCreated={handleCreated} onCancel={() => setIsFormOpen(false)} />
        </div>
      ) : null}

      <SessionStatusFilter value={statusFilter} onChange={setStatusFilter} />

      {state.status === 'loading' ? (
        <p role="status">Loading sessions…</p>
      ) : state.status === 'error' ? (
        <div className="load-error" role="alert">
          <p>Couldn't load training sessions. Check your connection and try again.</p>
          <button type="button" onClick={retry}>
            Try again
          </button>
        </div>
      ) : (
        <SessionList
          sessions={
            statusFilter === 'all'
              ? state.sessions
              : state.sessions.filter((session) => session.status === statusFilter)
          }
          emptyMessage={statusFilter === 'all' ? 'No sessions yet.' : 'No sessions match this filter.'}
        />
      )}
    </section>
  )
}
