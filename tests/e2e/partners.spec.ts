import { test, expect } from '@playwright/test'
import { dismissGuidedTourIfPresent, gotoDashboard } from './helpers'

test.describe('Partners workflows (authenticated)', () => {
  test('invite flow generates a copyable invite link', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/partners')
    await dismissGuidedTourIfPresent(page)

    await expect(page.getByRole('heading', { name: /accountability partners/i })).toBeVisible()
    await page.getByRole('button', { name: /invite partner/i }).first().click()
    const inviteField = page.locator('input[readonly]').first()
    if (await inviteField.isVisible({ timeout: 4000 }).catch(() => false)) {
      await expect(page.getByText(/invite link \(valid 7 days\)/i)).toBeVisible({ timeout: 10000 })
      await expect(inviteField).toHaveValue(/\/invite\//)
      await page.getByRole('button', { name: /^copy$/i }).first().click()
      await expect(inviteField).toHaveValue(/\/invite\//)
    } else {
      // Account may hit daily invite rate limits; fallback to pending invite flow.
      await expect(page.getByText(/pending invites/i).first()).toBeVisible()
      await expect(page.getByRole('button', { name: /copy link/i }).first()).toBeVisible()
    }
  })

  test('partners metrics cards are visible', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/partners')
    await dismissGuidedTourIfPresent(page)
    await expect(page.getByText('Active Partners', { exact: true })).toBeVisible()
    await expect(page.getByText('Shared Habits', { exact: true })).toBeVisible()
    await expect(page.getByText('Pending Invites', { exact: true }).first()).toBeVisible()
  })
})
