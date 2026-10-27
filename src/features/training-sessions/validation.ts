import type { CreateSessionInput } from './types'

export const TITLE_MIN = 3
export const TITLE_MAX = 80

export interface SessionFormValues {
  title: string
  /** Raw `datetime-local` value, e.g. `2026-10-28T09:30`. */
  startsAt: string
}

export type SessionFormErrors = Partial<Record<keyof SessionFormValues, string>>

export interface SessionFormValidation {
  errors: SessionFormErrors
  input?: CreateSessionInput
}

function validateTitle(rawTitle: string): string | undefined {
  const title = rawTitle.trim()
  if (title.length === 0) return 'Enter a session title.'
  if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
    return `Title must be between ${TITLE_MIN} and ${TITLE_MAX} characters.`
  }
  return undefined
}

function validateStartsAt(rawStartsAt: string, now: Date): string | undefined {
  if (rawStartsAt === '') return 'Choose a start date and time.'
  const startsAt = new Date(rawStartsAt)
  if (Number.isNaN(startsAt.getTime())) return 'Choose a start date and time.'
  if (startsAt.getTime() <= now.getTime()) return 'Choose a date and time in the future.'
  return undefined
}

export function validateSessionForm(values: SessionFormValues, now: Date): SessionFormValidation {
  const titleError = validateTitle(values.title)
  const startsAtError = validateStartsAt(values.startsAt, now)

  if (titleError || startsAtError) {
    const errors: SessionFormErrors = {}
    if (titleError) errors.title = titleError
    if (startsAtError) errors.startsAt = startsAtError
    return { errors }
  }

  return {
    errors: {},
    input: { title: values.title.trim(), startsAt: new Date(values.startsAt).toISOString() },
  }
}
