import { test, expect } from '@playwright/test'
import { dismissGuidedTourIfPresent, gotoDashboard, uniqueName } from './helpers'

test.describe('Review workflows (authenticated)', () => {
  test('weekly review can be saved and reloads persisted values', async ({ page }) => {
    const wins = `wins-${uniqueName('review')}`
    const struggles = `struggles-${uniqueName('review')}`
    const lesson = `lesson-${uniqueName('review')}`
    const focus = `focus-${uniqueName('review')}`

    await gotoDashboard(page, '/dashboard/review')
    await dismissGuidedTourIfPresent(page)
    await expect(page.getByRole('heading', { name: /^review$/i })).toBeVisible()

    await page.locator('#wins').fill(wins)
    await page.locator('#struggles').fill(struggles)
    await page.locator('#identity_reflection').fill(lesson)
    await page.locator('#adjustments').fill(focus)
    await page.getByRole('button', { name: /save review/i }).click()

    await expect(page.getByText(/^saved$/i)).toBeVisible({ timeout: 10000 })

    await page.reload()
    await expect(page.locator('#wins')).toHaveValue(wins)
    await expect(page.locator('#struggles')).toHaveValue(struggles)
    await expect(page.locator('#identity_reflection')).toHaveValue(lesson)
    await expect(page.locator('#adjustments')).toHaveValue(focus)
  })

  test('review tools routes are accessible', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/review')
    await dismissGuidedTourIfPresent(page)

    await page.getByRole('link', { name: /review a different week/i }).first().click()
    await expect(page).toHaveURL(/\/dashboard\/review\/write/)

    await page.goto('/dashboard/review')
    await page.getByRole('link', { name: /past reviews/i }).first().click()
    await expect(page).toHaveURL(/\/dashboard\/review\/history/)

    await page.goto('/dashboard/review')
    await page.getByRole('link', { name: /i\u2019m stuck \u2014 reset|reset/i }).first().click()
    await expect(page).toHaveURL(/\/dashboard\/review\/reset/)

    await page.goto('/dashboard/review')
    await page.getByRole('link', { name: /monthly reflection/i }).first().click()
    await expect(page).toHaveURL(/\/dashboard\/review\/monthly/)
  })
})
