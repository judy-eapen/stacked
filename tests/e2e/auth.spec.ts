import { test, expect } from '@playwright/test'

test.describe('Auth (unauthenticated)', () => {
  test('login page loads and has core fields', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /^stacked$/i })).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('invalid credentials show an auth error', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('nobody@example.com')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(
      page.locator('p[role="alert"], div[role="alert"]').filter({ hasText: /invalid|incorrect|error/i }).first()
    ).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('protected routes redirect to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)

    await page.goto('/dashboard/today')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page links to sign-up and forgot-password', async ({ page }) => {
    await page.goto('/login')

    await page.getByRole('link', { name: /sign up|create account/i }).click()
    await expect(page).toHaveURL(/\/signup/)
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()

    await page.goto('/login')
    await page.getByRole('link', { name: /forgot/i }).click()
    await expect(page).toHaveURL(/\/forgot-password/)
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible()
  })
})
