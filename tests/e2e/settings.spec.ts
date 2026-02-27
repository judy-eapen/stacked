import { test, expect } from '@playwright/test'
import { dismissGuidedTourIfPresent, gotoDashboard, uniqueName } from './helpers'

test.describe('Settings workflows (authenticated)', () => {
  test('display name can be edited and save action succeeds', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/settings')
    await dismissGuidedTourIfPresent(page)

    const displayNameInput = page.getByLabel(/display name/i)
    await expect(displayNameInput).toBeVisible()

    const original = await displayNameInput.inputValue()
    const updated = `E2E ${uniqueName('name')}`.slice(0, 50)

    await displayNameInput.fill(updated)
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByText(/^saved$/i)).toBeVisible({ timeout: 10000 })

    // Restore original display name so this test is idempotent.
    await page.getByLabel(/display name/i).fill(original)
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByText(/^saved$/i)).toBeVisible({ timeout: 10000 })
  })

  test('export and logout controls are present', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/settings')
    await dismissGuidedTourIfPresent(page)
    await expect(page.getByRole('button', { name: /export my data/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /log out|sign out/i }).first()).toBeVisible()
  })
})
