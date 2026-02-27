import { test, expect } from '@playwright/test'
import {
  createHabit,
  deleteHabitByName,
  dismissGuidedTourIfPresent,
  gotoDashboard,
  uniqueName,
} from './helpers'
import { deletePartnerUser, provisionPartnerUser } from './partner-provision'

test.describe('Partners lifecycle (authenticated, multi-user)', () => {
  test('invite, accept, share habit, and partner can view shared habit', async ({ page, browser }) => {
    test.setTimeout(120000)

    const habitName = uniqueName('shared-habit')
    let partnerContext: Awaited<ReturnType<typeof browser.newContext>> | null = null
    let partnerUserId: string | null = null

    try {
      await createHabit(page, habitName)

      await gotoDashboard(page, '/dashboard/partners')
      await dismissGuidedTourIfPresent(page)

      let inviteUrl: string | null = null
    const existing = await page.request.get('/api/partners?dashboard=1')
      if (existing.ok()) {
        const body = await existing.json()
        inviteUrl = body?.pending_invites?.[0]?.invite_url ?? null
      }

      if (!inviteUrl) {
        await page.getByRole('button', { name: /invite partner/i }).first().click()
        const inviteField = page.locator('input[readonly]').first()
        await expect(inviteField).toHaveValue(/\/invite\//)
        inviteUrl = await inviteField.inputValue()
      }
      if (!inviteUrl) throw new Error('Could not obtain partner invite URL')

      const partner = await provisionPartnerUser()
      partnerUserId = partner.userId

      partnerContext = await browser.newContext({
        baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
        storageState: { cookies: [], origins: [] },
      })
      const partnerPage = await partnerContext.newPage()

      const origin = new URL(inviteUrl).origin
      await partnerPage.goto(`${origin}/login`)
      await expect(partnerPage.getByLabel('Email')).toBeVisible({ timeout: 20000 })
      await partnerPage.getByLabel('Email').fill(partner.email)
      await partnerPage.getByLabel('Password').fill(partner.password)
      await partnerPage.getByRole('button', { name: /sign in/i }).click()

      await partnerPage.waitForURL(/\/dashboard(\/.*)?/, { timeout: 20000 })
      if (partnerPage.url().includes('/display-name')) {
        await partnerPage.getByLabel(/display name/i).fill('Partner E2E')
        await partnerPage.getByRole('button', { name: /continue|save|saving/i }).click()
        await partnerPage.waitForURL(/\/dashboard(\/.*)?/, { timeout: 20000 })
      }

      await partnerPage.goto(inviteUrl)
      await partnerPage.waitForURL(/\/dashboard\/partners/, { timeout: 30000 })
      await dismissGuidedTourIfPresent(partnerPage)

      // Owner shares a specific habit with the newly accepted partner.
      await gotoDashboard(page, '/dashboard/partners')
      await dismissGuidedTourIfPresent(page)

      const partnerCard = page.locator('li').filter({ hasText: partner.email }).first()
      await expect(partnerCard).toBeVisible({ timeout: 15000 })

      await partnerCard.getByRole('button', { name: /select habits to share/i }).click()
      await partnerCard.getByLabel(habitName).check()
      await partnerCard.getByRole('button', { name: /^save$/i }).click()

      await expect(partnerCard.getByText(/1 shared habit/i)).toBeVisible({ timeout: 10000 })

      // Partner can open owner shared view and see the shared habit.
      await gotoDashboard(partnerPage, '/dashboard/partners')
      await dismissGuidedTourIfPresent(partnerPage)
      await partnerPage.getByRole('link', { name: /view their shared habits/i }).first().click()
      await expect(partnerPage).toHaveURL(/\/dashboard\/partners\/[^/]+$/)
      await expect(partnerPage.getByText(habitName, { exact: true })).toBeVisible({ timeout: 15000 })
    } finally {
      if (partnerContext) {
        await partnerContext.close().catch(() => {})
      }

      if (partnerUserId) {
        await deletePartnerUser(partnerUserId)
      }

      // Cleanup owner-side habit
      await deleteHabitByName(page, habitName)
    }
  })
})
