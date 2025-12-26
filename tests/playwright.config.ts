import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright Configuration for Web App Testing
 * 
 * This configuration tests the web application running in a browser.
 * The backend should be running on http://localhost:8000
 * The frontend should be running on http://localhost:3000
 */
export default defineConfig({
  testDir: './integration/web',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 180000, // 3 minutes default timeout for all tests (some operations are slow)
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list']
  ],
  
  use: {
    baseURL: process.env.WEB_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 120000, // 2 minutes for slow operations (file uploads, processing)
    navigationTimeout: 60000, // 60 seconds for page loads
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // Run your local dev server before starting the tests
  // In CI, servers are started manually in GitHub Actions workflow
  // Locally, Playwright will reuse existing servers if they're running
  ...(process.env.CI ? {} : {
    webServer: [
      {
        command: process.platform === 'win32' 
          ? 'powershell -ExecutionPolicy Bypass -File ./start-backend.ps1'
          : 'cd ../python-backend && python -m uvicorn api:app --host 0.0.0.0 --port 8000 || true',
        url: 'http://localhost:8000/',
        reuseExistingServer: true, // Reuse if already running - this is key!
        timeout: 120000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
      {
        command: process.platform === 'win32'
          ? 'powershell -ExecutionPolicy Bypass -File ./start-frontend.ps1'
          : 'cd ../website && npm run dev || true',
        url: 'http://localhost:3000',
        reuseExistingServer: true, // Reuse if already running - this is key!
        timeout: 120000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
    ],
  }),
});

