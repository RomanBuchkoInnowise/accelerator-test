import { SESSION_STATUSES, STATUS_LABELS, type SessionStatus } from '../types'

export type StatusFilterValue = 'all' | SessionStatus

interface SessionStatusFilterProps {
  value: StatusFilterValue
  onChange: (value: StatusFilterValue) => void
}

const isStatusFilterValue = (value: string): value is StatusFilterValue =>
  value === 'all' || (SESSION_STATUSES as readonly string[]).includes(value)

export function SessionStatusFilter({ value, onChange }: SessionStatusFilterProps) {
  return (
    <div className="field field--inline">
      <label htmlFor="session-status-filter">Status</label>
      <select
        id="session-status-filter"
        name="status"
        value={value}
        onChange={(event) => {
          if (isStatusFilterValue(event.target.value)) onChange(event.target.value)
        }}
      >
        <option value="all">All</option>
        {SESSION_STATUSES.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </select>
    </div>
  )
}
