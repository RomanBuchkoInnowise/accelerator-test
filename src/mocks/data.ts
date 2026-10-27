import type { TrainingSession } from '../features/training-sessions/types'

const DAY_MS = 24 * 60 * 60 * 1000

function atHour(base: Date, dayOffset: number, hour: number): string {
  const date = new Date(base.getTime() + dayOffset * DAY_MS)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

export function createSeedSessions(now = new Date()): TrainingSession[] {
  return [
    { id: 'seed-1', title: 'TypeScript Fundamentals', status: 'scheduled', startsAt: atHour(now, 3, 10) },
    { id: 'seed-2', title: 'Accessible Forms Workshop', status: 'scheduled', startsAt: atHour(now, 7, 14) },
    { id: 'seed-3', title: 'React Testing Basics', status: 'completed', startsAt: atHour(now, -5, 11) },
    { id: 'seed-4', title: 'Git Branching Strategies', status: 'completed', startsAt: atHour(now, -12, 9) },
    { id: 'seed-5', title: 'Performance Profiling', status: 'cancelled', startsAt: atHour(now, 2, 16) },
  ]
}
