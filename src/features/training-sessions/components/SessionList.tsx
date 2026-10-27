import { STATUS_LABELS, type TrainingSession } from '../types'

const startFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

interface SessionListProps {
  sessions: TrainingSession[]
  emptyMessage: string
}

export function SessionList({ sessions, emptyMessage }: SessionListProps) {
  if (sessions.length === 0) return <p className="empty">{emptyMessage}</p>

  return (
    <ul className="session-list" aria-label="Training sessions">
      {sessions.map((session) => (
        <li key={session.id} className="session">
          <strong className="session__title">{session.title}</strong>
          <span className={`session__status session__status--${session.status}`}>
            {STATUS_LABELS[session.status]}
          </span>
          <time className="session__time" dateTime={session.startsAt}>
            {startFormatter.format(new Date(session.startsAt))}
          </time>
        </li>
      ))}
    </ul>
  )
}
