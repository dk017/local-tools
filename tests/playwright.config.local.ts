import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

/**
 * Local development config - assumes servers are already running
 * Use this when you've manually started backend and frontend
 */
export default defineConfig({
  ...baseConfig,
  // Don't start servers - assume they're already running
  webServer: undefined,
});


