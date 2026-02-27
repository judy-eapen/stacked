import { test, expect } from '@playwright/test'
import { createHabit, deleteHabitByName, dismissGuidedTourIfPresent, gotoDashboard, uniqueName } from './helpers'

test.describe('Today workflows (authenticated)', () => {
  test('habit appears on Today and can be toggled complete/incomplete', async ({ page }) => {
    const habitName = uniqueName('today-habit')
    await createHabit(page, habitName)

    await gotoDashboard(page, '/dashboard/today')
    await dismissGuidedTourIfPresent(page)
    await expect(page.getByRole('heading', { name: /^today$/i })).toBeVisible()

    const habitCard = page
      .locator('div')
      .filter({ has: page.getByText(habitName, { exact: true }) })
      .first()

    await expect(habitCard).toBeVisible()

    const completeButton = habitCard.getByRole('button', { name: /mark complete/i }).first()
    await expect(completeButton).toBeVisible()
    await completeButton.click()

    await expect(habitCard.getByRole('button', { name: /mark incomplete/i }).first()).toBeVisible({ timeout: 10000 })
    await expect(
      habitCard.locator('span').filter({ hasText: /\d+d streak/i }).first()
    ).toBeVisible()

    await habitCard.getByRole('button', { name: /mark incomplete/i }).first().click()
    await expect(habitCard.getByRole('button', { name: /mark complete/i }).first()).toBeVisible({ timeout: 10000 })

    await deleteHabitByName(page, habitName)
  })

  test('empty-state guidance or habit list is visible', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/today')
    await dismissGuidedTourIfPresent(page)
    const emptyState = page.getByText(/add habits from identities or habits to see them here|no habits|add habits/i)
    const anyCompleteToggle = page.getByRole('button', { name: /mark complete|mark incomplete/i }).first()

    if (await emptyState.isVisible().catch(() => false)) {
      await expect(emptyState).toBeVisible()
    } else {
      await expect(anyCompleteToggle).toBeVisible()
    }
  })
})
