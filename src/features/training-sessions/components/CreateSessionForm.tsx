import { useId, useRef, useState, type FormEvent } from 'react'
import { createSession } from '../api/sessionsApi'
import type { TrainingSession } from '../types'
import { validateSessionForm, type SessionFormErrors } from '../validation'

interface CreateSessionFormProps {
  onCreated: (session: TrainingSession) => void
  onCancel: () => void
}

const SUBMIT_ERROR = "Couldn't create the session. Check the details and try again."

export function CreateSessionForm({ onCreated, onCancel }: CreateSessionFormProps) {
  const id = useId()
  const headingId = `${id}-heading`
  const titleId = `${id}-title`
  const titleErrorId = `${id}-title-error`
  const startsAtId = `${id}-starts-at`
  const startsAtErrorId = `${id}-starts-at-error`

  const [title, setTitle] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [errors, setErrors] = useState<SessionFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Synchronous guard: a second submit can arrive before React re-renders the disabled button.
  const inFlight = useRef(false)
  const titleInput = useRef<HTMLInputElement>(null)
  const startsAtInput = useRef<HTMLInputElement>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current) return

    const result = validateSessionForm({ title, startsAt }, new Date())
    setErrors(result.errors)
    setSubmitError(null)
    if (!result.input) {
      if (result.errors.title) titleInput.current?.focus()
      else startsAtInput.current?.focus()
      return
    }

    inFlight.current = true
    setIsSubmitting(true)
    try {
      const session = await createSession(result.input)
      setTitle('')
      setStartsAt('')
      onCreated(session)
    } catch {
      setSubmitError(SUBMIT_ERROR)
    } finally {
      inFlight.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <form className="create-form" aria-labelledby={headingId} noValidate onSubmit={handleSubmit}>
      <h2 id={headingId}>New training session</h2>

      <div className="field">
        <label htmlFor={titleId}>Title</label>
        <input
          ref={titleInput}
          id={titleId}
          name="title"
          type="text"
          autoComplete="off"
          placeholder="e.g. Intro to React…"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? titleErrorId : undefined}
        />
        {errors.title ? (
          <p id={titleErrorId} className="field__error" role="alert">
            {errors.title}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor={startsAtId}>Start date and time</label>
        <input
          ref={startsAtInput}
          id={startsAtId}
          name="startsAt"
          type="datetime-local"
          autoComplete="off"
          value={startsAt}
          onChange={(event) => setStartsAt(event.target.value)}
          aria-invalid={errors.startsAt ? true : undefined}
          aria-describedby={errors.startsAt ? startsAtErrorId : undefined}
        />
        {errors.startsAt ? (
          <p id={startsAtErrorId} className="field__error" role="alert">
            {errors.startsAt}
          </p>
        ) : null}
      </div>

      {submitError ? (
        <p className="form-error" role="alert">
          {submitError}
        </p>
      ) : null}

      <div className="actions">
        <button type="submit" disabled={isSubmitting} aria-busy={isSubmitting || undefined}>
          {isSubmitting ? 'Creating…' : 'Create session'}
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
