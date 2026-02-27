import { test, expect } from '@playwright/test'
import { createHabit, deleteHabitByName, gotoDashboard, uniqueName } from './helpers'

test.describe('Habits workflows (authenticated)', () => {
  test('create habit, open detail, save contract, and delete habit', async ({ page }) => {
    const habitName = uniqueName('e2e-habit')
    await createHabit(page, habitName)

    await page.getByRole('link', { name: habitName }).first().click()
    await expect(page).toHaveURL(/\/dashboard\/habits\/[^/]+$/)
    await expect(page.getByRole('heading', { name: habitName })).toBeVisible()

    await page.getByRole('link', { name: /contract/i }).click()
    await expect(page).toHaveURL(/\/dashboard\/habits\/[^/]+\/contract/)

    const commitment = `I commit to ${habitName}`
    await page.locator('textarea').first().fill(commitment)
    await page
      .locator('input[placeholder*="I buy my partner coffee"], input[placeholder*="consequence"]')
      .first()
      .fill('If I miss, I owe 10 pushups')
    await page.getByRole('button', { name: /save contract/i }).click()

    await expect(page).toHaveURL(/\/dashboard\/habits/)
    await expect(page.getByText(habitName, { exact: true })).toBeVisible()

    await deleteHabitByName(page, habitName)
  })

  test('habit add form and key actions are visible', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/habits')
    await expect(page.getByRole('heading', { name: /^habits$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /add habit/i })).toBeVisible()
  })
})
