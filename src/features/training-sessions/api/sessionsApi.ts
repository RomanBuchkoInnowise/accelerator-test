import { isTrainingSession, type CreateSessionInput, type TrainingSession } from '../types'

export class ApiError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// Absolute URL: Node's fetch (used under Vitest) rejects relative URLs.
const sessionsUrl = () => new URL('/api/sessions', window.location.origin)

async function readJson(response: Response): Promise<unknown> {
  if (!response.ok) throw new ApiError(`Request failed with status ${response.status}`, response.status)
  try {
    return await response.json()
  } catch {
    throw new ApiError('Unexpected response', response.status)
  }
}

export async function fetchSessions(): Promise<TrainingSession[]> {
  const response = await fetch(sessionsUrl(), { headers: { Accept: 'application/json' } })
  const data = await readJson(response)
  if (!Array.isArray(data) || !data.every(isTrainingSession)) throw new ApiError('Unexpected response')
  return data
}

export async function createSession(input: CreateSessionInput): Promise<TrainingSession> {
  const response = await fetch(sessionsUrl(), {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await readJson(response)
  if (!isTrainingSession(data)) throw new ApiError('Unexpected response')
  return data
}
