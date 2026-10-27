import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, onTestFinished } from 'vitest'
import { server } from '../../mocks/server'
import { TrainingSessionsWorkspace } from './TrainingSessionsWorkspace'

const SCHEDULED_TITLES = ['TypeScript Fundamentals', 'Accessible Forms Workshop']
const COMPLETED_TITLES = ['React Testing Basics', 'Git Branching Strategies']
const CANCELLED_TITLES = ['Performance Profiling']
const ALL_TITLES = [...SCHEDULED_TITLES, ...COMPLETED_TITLES, ...CANCELLED_TITLES]

const DAY_MS = 24 * 60 * 60 * 1000
const pad = (value: number) => String(value).padStart(2, '0')

/** Local `YYYY-MM-DDTHH:mm`, the value format of `<input type="datetime-local">`. */
function toDateTimeLocal(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const yesterday = () => toDateTimeLocal(new Date(Date.now() - DAY_MS))
const tomorrow = () => toDateTimeLocal(new Date(Date.now() + DAY_MS))

const sessionList = () => screen.findByRole('list', { name: 'Training sessions' })

function expectVisibleTitles(list: HTMLElement, visible: string[], hidden: string[]) {
  for (const title of visible) expect(within(list).getByText(title)).toBeInTheDocument()
  for (const title of hidden) expect(within(list).queryByText(title)).not.toBeInTheDocument()
}

describe('TrainingSessionsWorkspace', () => {
  it('shows loading, renders the sessions, and filters them by status', async () => {
    const user = userEvent.setup()
    render(<TrainingSessionsWorkspace />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading sessions…')

    const list = await sessionList()
    expect(screen.queryByText('Loading sessions…')).not.toBeInTheDocument()
    expectVisibleTitles(list, ALL_TITLES, [])
    expect(within(list).getAllByRole('listitem')).toHaveLength(ALL_TITLES.length)

    const [firstItem] = within(list).getAllByRole('listitem')
    expect(within(firstItem).getByText('Scheduled')).toBeInTheDocument()
    expect(firstItem.querySelector('time')).toHaveAttribute('datetime')

    const filter = screen.getByRole('combobox', { name: 'Status' })
    await user.selectOptions(filter, 'Completed')
    expectVisibleTitles(await sessionList(), COMPLETED_TITLES, [...SCHEDULED_TITLES, ...CANCELLED_TITLES])

    await user.selectOptions(filter, 'All')
    expectVisibleTitles(await sessionList(), ALL_TITLES, [])
  })

  it('rejects invalid input without sending a request, then creates a valid session', async () => {
    let postCount = 0
    const countPosts = ({ request }: { request: Request }) => {
      if (request.method === 'POST') postCount++
    }
    server.events.on('request:start', countPosts)
    onTestFinished(() => server.events.removeListener('request:start', countPosts))
    const user = userEvent.setup()
    render(<TrainingSessionsWorkspace />)
    await sessionList()

    await user.click(screen.getByRole('button', { name: 'New session' }))
    const titleInput = screen.getByLabelText('Title')
    const startsAtInput = screen.getByLabelText('Start date and time')

    await user.type(titleInput, 'ab')
    fireEvent.change(startsAtInput, { target: { value: yesterday() } })
    await user.click(screen.getByRole('button', { name: 'Create session' }))

    expect(screen.getByText('Title must be between 3 and 80 characters.')).toBeInTheDocument()
    expect(screen.getByText('Choose a date and time in the future.')).toBeInTheDocument()
    expect(titleInput).toHaveAttribute('aria-invalid', 'true')
    expect(titleInput).toHaveFocus()
    expect(postCount).toBe(0)
    expect(within(await sessionList()).getAllByRole('listitem')).toHaveLength(ALL_TITLES.length)

    await user.clear(titleInput)
    await user.type(titleInput, '  Intro to React  ')
    fireEvent.change(startsAtInput, { target: { value: tomorrow() } })
    await user.click(screen.getByRole('button', { name: 'Create session' }))

    const list = await sessionList()
    expect(await within(list).findByText('Intro to React')).toBeInTheDocument()
    expect(within(list).getAllByRole('listitem')).toHaveLength(ALL_TITLES.length + 1)
    expect(postCount).toBe(1)
    expect(screen.queryByRole('form', { name: 'New training session' })).not.toBeInTheDocument()
  })

  it('shows an error when loading fails and recovers on retry', async () => {
    server.use(
      http.get('*/api/sessions', () => HttpResponse.json({ message: 'x' }, { status: 500 }), { once: true }),
    )
    const user = userEvent.setup()
    render(<TrainingSessionsWorkspace />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent("Couldn't load training sessions. Check your connection and try again.")
    expect(screen.queryByRole('list', { name: 'Training sessions' })).not.toBeInTheDocument()

    await user.click(within(alert).getByRole('button', { name: 'Try again' }))

    // The first GET failed once, so a rendered list proves Try again re-requested.
    expectVisibleTitles(await sessionList(), ALL_TITLES, [])
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('sends exactly one request when the form is submitted twice while a create is pending', async () => {
    let postCount = 0
    let release!: () => void
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      http.post('*/api/sessions', async ({ request }) => {
        postCount++
        const { title, startsAt } = (await request.json()) as { title: string; startsAt: string }
        await pending
        return HttpResponse.json({ id: 'created-1', title, startsAt, status: 'scheduled' }, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    render(<TrainingSessionsWorkspace />)
    const initialCount = within(await sessionList()).getAllByRole('listitem').length

    await user.click(screen.getByRole('button', { name: 'New session' }))
    await user.type(screen.getByLabelText('Title'), 'Double Submit Check')
    fireEvent.change(screen.getByLabelText('Start date and time'), { target: { value: tomorrow() } })

    await user.click(screen.getByRole('button', { name: 'Create session' }))
    const busyButton = await screen.findByRole('button', { name: 'Creating…' })
    expect(busyButton).toBeDisabled()

    // Submitting the form directly bypasses the disabled button and exercises the in-flight guard.
    fireEvent.submit(screen.getByRole('form', { name: 'New training session' }))
    expect(postCount).toBe(1)

    release()

    const list = await sessionList()
    expect(await within(list).findByText('Double Submit Check')).toBeInTheDocument()
    expect(postCount).toBe(1)
    expect(screen.getAllByText('Double Submit Check')).toHaveLength(1)
    expect(within(list).getAllByRole('listitem')).toHaveLength(initialCount + 1)
    expect(screen.queryByRole('button', { name: 'Creating…' })).not.toBeInTheDocument()
  })
})
