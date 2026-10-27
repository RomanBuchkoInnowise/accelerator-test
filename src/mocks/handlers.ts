import { delay, http, HttpResponse } from 'msw'
import type { TrainingSession } from '../features/training-sessions/types'
import { createSeedSessions } from './data'

let db: TrainingSession[] = createSeedSessions()

export function resetMockDb(): void {
  db = createSeedSessions()
}

export interface MockOptions {
  /** Make every `GET /api/sessions` fail with 500 (dev error mode). */
  listError?: boolean
}

function readCreateBody(body: unknown): { title: string; startsAt: string } | undefined {
  if (typeof body !== 'object' || body === null) return undefined
  const { title, startsAt } = body as Record<string, unknown>
  if (typeof title !== 'string' || title === '' || typeof startsAt !== 'string' || startsAt === '') return undefined
  return { title, startsAt }
}

export function createHandlers({ listError = false }: MockOptions = {}) {
  return [
    http.get('*/api/sessions', async () => {
      await delay()
      if (listError) return HttpResponse.json({ message: 'Mock failure' }, { status: 500 })
      return HttpResponse.json(db)
    }),

    http.post('*/api/sessions', async ({ request }) => {
      await delay()
      const input = readCreateBody(await request.json().catch(() => null))
      if (!input) return HttpResponse.json({ message: 'title and startsAt are required' }, { status: 400 })
      const session: TrainingSession = { id: crypto.randomUUID(), ...input, status: 'scheduled' }
      db = [...db, session]
      return HttpResponse.json(session, { status: 201 })
    }),
  ]
}

export const handlers = createHandlers()
