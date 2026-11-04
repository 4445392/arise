import { expect, test, type Page } from '@playwright/test'

async function dismissNotices(page: Page) {
  await page.waitForTimeout(1200) // notices queue in after the first load
  for (let i = 0; i < 6; i++) {
    const btn = page.locator('[role=alertdialog] button').first()
    if (!(await btn.isVisible().catch(() => false))) break
    await btn.click()
    await page.waitForTimeout(250)
  }
}

async function noHorizontalScroll(page: Page) {
  const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
  expect(w[0]).toBeLessThanOrEqual(w[1])
}

async function onboard(page: Page) {
  await page.goto('./')
  await expect(page.getByText('[PRE-AWAKENING]')).toBeVisible()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByLabel('Exam 1 subject').fill('Statistics')
  await page.getByLabel('Exam 1 date').fill('2099-01-01')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'ARISE' }).click()
  await dismissNotices(page)
}

test('onboarding, quest ticking, persistence, 375px layout, offline', async ({ page, context }) => {
  await page.goto('./')
  await noHorizontalScroll(page)
  await onboard(page)
  await expect(page.getByText('[STATUS]')).toBeVisible()
  await noHorizontalScroll(page)

  await page.getByRole('navigation').getByRole('button', { name: /QUEST/i }).click()
  for (const label of ['Up at wake time, no snooze', 'Bed made', '500 ml water', 'No phone for 30 min']) await page.getByRole('checkbox', { name: label }).click()
  await dismissNotices(page)
  await page.getByRole('button', { name: 'Skip' }).click() // the post-objective feedback sheet
  await noHorizontalScroll(page)

  for (const tab of ['MIRROR', 'SKILLS', 'MORE', 'STATUS']) {
    await page.getByRole('navigation').getByRole('button', { name: new RegExp(tab, 'i') }).click()
    await noHorizontalScroll(page)
  }

  await page.reload()
  await dismissNotices(page)
  await page.getByRole('navigation').getByRole('button', { name: /QUEST/i }).click()
  await expect(page.getByRole('checkbox', { name: 'Bed made' })).toHaveAttribute('aria-checked', 'true')

  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.waitForTimeout(1500)
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('navigation').getByRole('button', { name: /QUEST/i })).toBeVisible()
  await context.setOffline(false)
})

test('Fear Log: write a fear and see it listed', async ({ page }) => {
  await onboard(page)
  await page.getByRole('navigation').getByRole('button', { name: /MORE/i }).click()
  await page.getByRole('button', { name: /Fear Log/ }).first().click()
  await page.getByRole('button', { name: 'New fear' }).click()
  await page.locator('input[type=text]').first().fill('Presentation')
  await page.locator('textarea').fill('I will blank')
  await page.getByLabel('If', { exact: true }).fill('I blank')
  await page.getByLabel('Then', { exact: true }).fill('breathe and continue')
  await page.getByRole('button', { name: 'Log fear' }).click()
  await expect(page.getByText('I will blank')).toBeVisible()
})
