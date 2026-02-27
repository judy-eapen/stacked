import { test, expect } from '@playwright/test'
import { dismissGuidedTourIfPresent, gotoDashboard } from './helpers'

test.describe('Dashboard navigation (authenticated)', () => {
  test('main nav is visible and reaches each primary area', async ({ page }) => {
    await gotoDashboard(page, '/dashboard')
    await dismissGuidedTourIfPresent(page)

    await expect(page.getByRole('link', { name: /^stacked$/i })).toBeVisible()

    await page.getByRole('link', { name: 'Today' }).click()
    await expect(page).toHaveURL(/\/dashboard\/today/)

    await page.getByRole('link', { name: 'Identities' }).click()
    await expect(page).toHaveURL(/\/dashboard\/identities/)
    await expect(page.getByRole('heading', { name: /identity statements/i })).toBeVisible()

    await page.getByRole('link', { name: 'Habits' }).click()
    await expect(page).toHaveURL(/\/dashboard\/habits/)
    await expect(page.getByRole('heading', { name: /^habits$/i })).toBeVisible()

    await page.getByRole('link', { name: 'Review' }).click()
    await expect(page).toHaveURL(/\/dashboard\/review/)
    await expect(page.getByRole('heading', { name: /^review$/i })).toBeVisible()

    await page.getByRole('link', { name: 'Partners' }).click()
    await expect(page).toHaveURL(/\/dashboard\/partners/)
    await expect(page.getByRole('heading', { name: /accountability partners/i })).toBeVisible()
  })
})
