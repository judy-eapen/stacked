import { test, expect } from '@playwright/test'
import {
  createIdentity,
  deleteHabitByName,
  dismissGuidedTourIfPresent,
  gotoDashboard,
  uniqueName,
} from './helpers'

test.describe('Habit design workflow (authenticated)', () => {
  test('design fields save and are reflected in Today habit context', async ({ page }) => {
    const habitName = uniqueName('design-habit')
    const twoMinute = `2-min ${uniqueName('tiny')}`
    const implementation = `After coffee ${uniqueName('cue')}`
    const bundling = `Bundle ${uniqueName('reward')}`

    await gotoDashboard(page, '/dashboard/habits?add=1')
    await dismissGuidedTourIfPresent(page)

    const nameInput = page.locator('input[placeholder="e.g. Read 10 pages"]').first()
    if (!(await nameInput.isVisible().catch(() => false))) {
      const addHabit = page.getByRole('button', { name: /add habit/i }).first()
      if (await addHabit.isVisible().catch(() => false)) {
        await addHabit.click()
      } else {
        await createIdentity(page, uniqueName('design-identity'))
        await gotoDashboard(page, '/dashboard/habits?add=1')
        await dismissGuidedTourIfPresent(page)
      }
    }

    await expect(nameInput).toBeVisible()
    await nameInput.fill(habitName)

    const newHabitForm = page.locator('div').filter({ has: nameInput }).first()
    await newHabitForm.getByRole('button', { name: /design this habit/i }).first().click()

    await newHabitForm
      .getByPlaceholder('Implementation intention (e.g. After I pour coffee, I journal.)')
      .fill(implementation)
    await newHabitForm.getByPlaceholder('2-minute rule').fill(twoMinute)
    await newHabitForm.getByPlaceholder('Temptation bundling').fill(bundling)

    await newHabitForm.getByRole('button', { name: /^create habit$/i }).click()
    await expect(page.getByText(habitName, { exact: true })).toBeVisible({ timeout: 15000 })

    await gotoDashboard(page, '/dashboard/today')
    await dismissGuidedTourIfPresent(page)

    const habitCard = page.locator('div').filter({ has: page.getByText(habitName, { exact: true }) }).first()
    await expect(habitCard).toBeVisible()
    await expect(habitCard.getByText(twoMinute, { exact: true })).toBeVisible()
    await expect(habitCard.getByText(implementation, { exact: true })).toBeVisible()
    await expect(habitCard.getByText(bundling, { exact: true })).toBeVisible()

    await deleteHabitByName(page, habitName)
  })
})
