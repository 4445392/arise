import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:4173/arise/',
    viewport: { width: 375, height: 812 },
    timezoneId: 'Africa/Johannesburg',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/arise/',
    reuseExistingServer: true,
    timeout: 180_000,
  },
})
