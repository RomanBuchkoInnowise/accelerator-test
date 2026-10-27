export const SESSION_STATUSES = ['scheduled', 'completed', 'cancelled'] as const

export type SessionStatus = (typeof SESSION_STATUSES)[number]

export const STATUS_LABELS: Record<SessionStatus, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export interface TrainingSession {
  id: string
  title: string
  status: SessionStatus
  /** ISO 8601 */
  startsAt: string
}

export interface CreateSessionInput {
  title: string
  /** ISO 8601 */
  startsAt: string
}

const isSessionStatus = (value: unknown): value is SessionStatus =>
  typeof value === 'string' && (SESSION_STATUSES as readonly string[]).includes(value)

export function isTrainingSession(value: unknown): value is TrainingSession {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    isSessionStatus(candidate.status) &&
    typeof candidate.startsAt === 'string' &&
    !Number.isNaN(Date.parse(candidate.startsAt))
  )
}
