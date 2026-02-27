import { test, expect } from '@playwright/test'

async function timed<T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const start = Date.now()
  const value = await fn()
  return { value, ms: Date.now() - start }
}

test.describe('API protection (unauthenticated)', () => {
  test('protected user APIs return 401 quickly when not logged in', async ({ request }) => {
    const today = await timed(() => request.get('/api/habits/today'))
    expect(today.value.status()).toBe(401)
    expect(today.ms).toBeLessThan(1500)

    const partners = await timed(() => request.get('/api/partners'))
    expect(partners.value.status()).toBe(401)
    expect(partners.ms).toBeLessThan(1500)

    const exportRes = await timed(() => request.get('/api/export'))
    expect(exportRes.value.status()).toBe(401)
    expect(exportRes.ms).toBeLessThan(1500)
  })

  test('cron endpoints reject missing bearer secret', async ({ request }) => {
    const endpoints = [
      '/api/cron/daily-reminders',
      '/api/cron/habit-reminders',
      '/api/cron/push-reminders',
      '/api/cron/weekly-summary',
    ]

    for (const endpoint of endpoints) {
      const res = await timed(() => request.get(endpoint))
      expect(res.value.status(), `${endpoint} should return 401 without CRON_SECRET`).toBe(401)
      expect(res.ms).toBeLessThan(1500)
    }
  })
})
