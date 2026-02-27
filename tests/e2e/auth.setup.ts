import { test as setup, expect } from '@playwright/test'
import path from 'path'
import { ensureOnboardingComplete } from './helpers'

const authFile = path.join(__dirname, '.auth', 'user.json')

setup('authenticate', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD

  if (!email || !password) {
    throw new Error(
      'E2E authenticated tests require TEST_USER_EMAIL and TEST_USER_PASSWORD. ' +
        'Add them to .env.test or export in the shell. See tests/README.md.'
    )
  }

  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()

  const onAuthenticatedPath = async (timeout: number): Promise<boolean> => {
    return page
      .waitForURL(
        (url) => {
          const pathname = url.pathname
          return (
            pathname === '/dashboard' ||
            pathname.startsWith('/dashboard/') ||
            pathname === '/display-name'
          )
        },
        { timeout }
      )
      .then(() => true)
      .catch(() => false)
  }

  let loggedIn = await onAuthenticatedPath(12000)

  const loginError = page
    .locator('p[role="alert"]')
    .filter({ hasText: /invalid login credentials|invalid|incorrect/i })
    .first()
  if (!loggedIn && (await loginError.isVisible({ timeout: 3000 }).catch(() => false))) {
    await page.goto('/signup')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: /create account/i }).click()
    loggedIn = await onAuthenticatedPath(12000)
  }

  if (!loggedIn) {
    const authErrorText =
      (await page.locator('p[role="alert"]').first().textContent().catch(() => null)) ??
      'No auth error text available'
    throw new Error(
      `Auth setup could not reach an authenticated route for ${email}. Last alert: ${authErrorText}`
    )
  }

  if (page.url().includes('/display-name')) {
    await page.getByLabel('Display name').fill('E2E Test User')
    await page.getByRole('button', { name: /continue|save|saving/i }).click()
    await page.waitForURL((url) => url.pathname.startsWith('/dashboard'), {
      timeout: 15000,
    })
  }

  await ensureOnboardingComplete(page)

  await expect(page).toHaveURL(/\/dashboard(\/.*)?$/)
  await page.context().storageState({ path: authFile })
})
