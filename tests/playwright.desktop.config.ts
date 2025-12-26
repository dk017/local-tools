import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright Configuration for Desktop App Testing (Electron/Tauri)
 * 
 * This configuration tests the desktop application.
 * Requires the desktop app to be built and available.
 */
export default defineConfig({
  testDir: './integration/desktop',
  fullyParallel: false, // Desktop tests run sequentially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Desktop app can only run one instance
  reporter: [
    ['html', { outputFolder: 'test-results/html-desktop' }],
    ['json', { outputFile: 'test-results/results-desktop.json' }],
    ['list']
  ],
  
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 60000, // 60 seconds for desktop operations
  },

  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        // For Tauri/Electron, we'll use a custom launcher
        // This is a placeholder - actual implementation depends on your desktop framework
        launchOptions: {
          executablePath: process.env.DESKTOP_APP_PATH || path.join(__dirname, '../src-tauri/target/release/offline-tools.exe'),
        },
      },
    },
  ],

  // Note: Desktop app must be built before running tests
  // Run: npm run tauri build (or equivalent for your desktop framework)
});

