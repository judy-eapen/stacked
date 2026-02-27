import { test, expect, APIResponse } from '@playwright/test'

async function timed<T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const start = Date.now()
  const value = await fn()
  return { value, ms: Date.now() - start }
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

test.describe('API core (authenticated)', () => {
  test('GET /api/habits/today returns habits payload quickly', async ({ request }) => {
    const { value: res, ms } = await timed(() => request.get('/api/habits/today'))
    expect(res.status()).toBe(200)
    expect(ms).toBeLessThan(2500)

    const body = await res.json()
    expect(Array.isArray(body.habits)).toBeTruthy()
    expect(typeof body.date).toBe('string')
  })

  test('GET /api/reviews/summary returns weekly summary quickly', async ({ request }) => {
    const { value: res, ms } = await timed(() =>
      request.get(`/api/reviews/summary?period=weekly&date=${todayDate()}`)
    )
    expect(res.status()).toBe(200)
    expect(ms).toBeLessThan(2500)

    const body = await res.json()
    expect(Array.isArray(body.habits)).toBeTruthy()
    expect(typeof body.week_start).toBe('string')
  })

  test('GET /api/partners returns partner payload quickly', async ({ request }) => {
    const { value: res, ms } = await timed(() => request.get('/api/partners'))
    expect(res.status()).toBe(200)
    expect(ms).toBeLessThan(2500)

    const body = await res.json()
    expect(Array.isArray(body.partners)).toBeTruthy()
    expect(Array.isArray(body.pending_invites)).toBeTruthy()
  })

  test('GET /api/partners lightweight mode returns fast base payload', async ({ request }) => {
    const { value: res, ms } = await timed(() => request.get('/api/partners'))
    expect(res.status()).toBe(200)
    expect(ms).toBeLessThan(2000)

    const body = await res.json()
    expect(Array.isArray(body.partners)).toBeTruthy()
    expect(Array.isArray(body.my_habits)).toBeTruthy()
    expect(typeof body.habit_shares_by_habit).toBe('object')
    expect((body.pending_invites ?? []).length).toBe(0)
    expect((body.shared_habits ?? []).length).toBe(0)
    expect((body.received_checkins ?? []).length).toBe(0)
  })

  test('GET /api/partners dashboard mode returns expanded payload', async ({ request }) => {
    const { value: res, ms } = await timed(() => request.get('/api/partners?dashboard=1'))
    expect(res.status()).toBe(200)
    expect(ms).toBeLessThan(3000)

    const body = await res.json()
    expect(Array.isArray(body.partners)).toBeTruthy()
    expect(Array.isArray(body.pending_invites)).toBeTruthy()
    expect(Array.isArray(body.shared_habits)).toBeTruthy()
    expect(Array.isArray(body.received_checkins)).toBeTruthy()
    expect(Array.isArray(body.my_habits)).toBeTruthy()
  })

  test('GET /api/export returns csv quickly', async ({ request }) => {
    const { value: res, ms } = await timed(() => request.get('/api/export'))
    expect(res.status()).toBe(200)
    expect(ms).toBeLessThan(4000)

    const contentType = res.headers()['content-type'] || ''
    expect(contentType).toContain('text/csv')
    const text = await res.text()
    expect(text.startsWith('habit_name,identity,date,completed,streak_at_time')).toBeTruthy()
  })

  test('habit-specific APIs (streaks, contract, complete) are healthy when a habit exists', async ({ request }) => {
    const partnersRes = await request.get('/api/partners')
    expect(partnersRes.status()).toBe(200)
    const partnersBody = await partnersRes.json()

    const habitId = partnersBody?.my_habits?.[0]?.id as string | undefined
    test.skip(!habitId, 'No habit found for this account to run habit-specific API checks')

    const to = todayDate()
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - 30)
    const from = fromDate.toISOString().slice(0, 10)

    const streakTimed = await timed(() =>
      request.get(`/api/habits/${habitId}/streaks?from=${from}&to=${to}`)
    )
    expect(streakTimed.value.status()).toBe(200)
    expect(streakTimed.ms).toBeLessThan(2500)

    const contractTimed = await timed(() => request.get(`/api/habits/${habitId}/contract`))
    expect(contractTimed.value.status()).toBe(200)
    expect(contractTimed.ms).toBeLessThan(2500)

    const completeTimed = await timed(() =>
      request.post(`/api/habits/${habitId}/complete`, {
        // Let API resolve "today" server-side to avoid UTC/local date skew.
        data: { completed: true },
      })
    )
    expect(completeTimed.value.status()).toBe(200)
    expect(completeTimed.ms).toBeLessThan(2500)
  })
})
