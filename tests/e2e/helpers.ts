import { expect, Page } from '@playwright/test'

export function uniqueName(prefix: string): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
  const rand = Math.random().toString(36).slice(2, 7)
  return `${prefix}-${stamp}-${rand}`
}

export async function ensureOnboardingComplete(page: Page): Promise<void> {
  const current = new URL(page.url())
  if (!current.pathname.startsWith('/dashboard/onboarding')) return

  const identityInput = page.getByPlaceholder(/move every day/i)
  await expect(identityInput).toBeVisible({ timeout: 10000 })
  await identityInput.fill(`e2e onboarding ${Date.now()}`)
  await page.getByRole('button', { name: /^next$/i }).click()

  await page.getByPlaceholder(/Habit name/i).fill('E2E onboarding habit')
  await page.getByPlaceholder(/2-minute version/i).fill('Do one rep')
  await page.getByRole('button', { name: /^next$/i }).click()

  await page.getByRole('button', { name: /^next$/i }).click()

  await page.getByRole('button', { name: /^done$/i }).click()
  await page.getByRole('button', { name: /^next$/i }).click()
  await page.getByRole('link', { name: /go to dashboard/i }).click()
  await expect(page).toHaveURL(/\/dashboard(\/.*)?$/)
}

export async function dismissGuidedTourIfPresent(page: Page): Promise<void> {
  const skipTour = page.getByRole('button', { name: /skip tour/i })
  if (await skipTour.isVisible().catch(() => false)) {
    await skipTour.click()
    await expect(skipTour).toHaveCount(0, { timeout: 10000 })
  }
}

async function settleDashboardRoute(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await dismissGuidedTourIfPresent(page)
  await ensureOnboardingComplete(page)

  const loadingText = page.getByText('Loading…').first()
  if (await loadingText.isVisible().catch(() => false)) {
    await loadingText.waitFor({ state: 'hidden', timeout: 10000 }).catch(async () => {
      await page.reload({ waitUntil: 'domcontentloaded' })
    })
  }
}

export async function gotoDashboard(page: Page, path: string): Promise<void> {
  // First-login flows can race between tour dismissal, onboarding redirect,
  // and page-level data fetches. Retry route stabilization a few times.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await settleDashboardRoute(page, path)
    const loadingText = page.getByText('Loading…').first()
    if (!(await loadingText.isVisible().catch(() => false))) {
      return
    }
    await page.waitForTimeout(500)
  }

  // Final best-effort open; let downstream assertions surface any true failures.
  await settleDashboardRoute(page, path)
}

export async function createIdentity(page: Page, completion: string): Promise<string> {
  await gotoDashboard(page, '/dashboard/identities')
  await dismissGuidedTourIfPresent(page)
  const createIdentityButton = page.getByRole('button', { name: /create identity/i }).first()
  if (!(await createIdentityButton.isVisible().catch(() => false))) {
    await page.reload({ waitUntil: 'domcontentloaded' })
  }
  await expect(createIdentityButton).toBeVisible({ timeout: 10000 })
  await createIdentityButton.click()
  const input = page.getByPlaceholder(/move every day/i)
  await expect(input).toBeVisible()
  await input.fill(completion)
  await page.getByRole('button', { name: /^create identity$/i }).last().click()

  const fullStatement = `I am a person who ${completion}.`
  await expect(page.getByRole('heading', { name: fullStatement })).toBeVisible({ timeout: 15000 })
  return fullStatement
}

export async function createHabit(page: Page, habitName: string): Promise<void> {
  await gotoDashboard(page, '/dashboard/habits?add=1')
  await dismissGuidedTourIfPresent(page)
  const nameInput = page.locator('input[placeholder="e.g. Read 10 pages"]').first()
  if (!(await nameInput.isVisible().catch(() => false))) {
    const addHabitButton = page.getByRole('button', { name: /add habit/i }).first()
    if (await addHabitButton.isVisible().catch(() => false)) {
      await addHabitButton.click()
    } else {
      // If the account has no identities yet, create one first and reopen habits.
      await createIdentity(page, uniqueName('habit-identity'))
      await gotoDashboard(page, '/dashboard/habits?add=1')
      await dismissGuidedTourIfPresent(page)
      const addAfterIdentity = page.getByRole('button', { name: /add habit/i }).first()
      if (await addAfterIdentity.isVisible().catch(() => false)) {
        await addAfterIdentity.click()
      }
    }
  }
  await expect(nameInput).toBeVisible({ timeout: 10000 })
  await nameInput.fill(habitName)
  await page.getByRole('button', { name: /create habit/i }).click()
  await expect(page.getByText(habitName, { exact: true })).toBeVisible({ timeout: 15000 })
}

export async function deleteHabitByName(page: Page, habitName: string): Promise<void> {
  await gotoDashboard(page, '/dashboard/habits')
  const listCard = page.getByRole('listitem').filter({ has: page.getByText(habitName, { exact: true }) }).first()
  const fallbackCard = page.locator('li,div').filter({ has: page.getByText(habitName, { exact: true }) }).first()
  const card = (await listCard.count()) > 0 ? listCard : fallbackCard

  if ((await card.count()) > 0) {
    const deleteBtn = card.getByRole('button', { name: /delete/i }).first()
    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click()
      await page.waitForTimeout(400)
    }
  }
}
