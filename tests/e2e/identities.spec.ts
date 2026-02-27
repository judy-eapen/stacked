import { test, expect } from '@playwright/test'
import { createIdentity, gotoDashboard, uniqueName } from './helpers'

test.describe('Identities workflows (authenticated)', () => {
  test('create, edit, and delete identity', async ({ page }) => {
    const completion = uniqueName('move-daily')
    const originalStatement = await createIdentity(page, completion)

    const card = page
      .getByRole('listitem')
      .filter({ hasText: originalStatement })
      .first()

    await card.getByRole('button', { name: /edit identity/i }).click()
    const editedStatement = `I am a person who ${uniqueName('train')}.`
    await page.locator(`input[id^="edit-identity-"]`).first().fill(editedStatement)
    await page.getByRole('button', { name: /^save$/i }).first().click()

    await expect(page.getByRole('heading', { name: editedStatement })).toBeVisible({ timeout: 10000 })

    const editedCard = page
      .getByRole('listitem')
      .filter({ hasText: editedStatement })
      .first()

    await editedCard.getByRole('button', { name: /delete identity/i }).click()
    await expect(page.getByRole('heading', { name: editedStatement })).toHaveCount(0)
  })

  test('new identity prompt can route to habits creation flow', async ({ page }) => {
    const completion = uniqueName('read-nightly')
    const statement = await createIdentity(page, completion)

    await expect(page.getByRole('dialog', { name: /want to add a habit for this identity/i })).toBeVisible()
    await page.getByRole('link', { name: /create habit now/i }).click()
    await expect(page).toHaveURL(/\/dashboard\/habits\?.*identity=/)

    await gotoDashboard(page, '/dashboard/identities')
    const card = page.getByRole('listitem').filter({ hasText: statement }).first()
    if (await card.count()) {
      await card.getByRole('button', { name: /delete identity/i }).click()
      await expect(page.getByRole('heading', { name: statement })).toHaveCount(0)
    }
  })
})
