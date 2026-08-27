import { defineConfig, devices } from "@playwright/test";

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * パッケージ済みのElectronは起動時のライセンス検証に通らないと
 * ウィンドウを作らないため、CIでは起動できない。
 * そのためレンダラーをビルドしてブラウザで動かし、
 * preloadが公開するAPIだけを差し替えて画面を検証する。
 */
export default defineConfig({
  testDir: "./src/tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html"]] : "html",

  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },

  webServer: {
    command: "npm run build:renderer && npm run preview:renderer",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },

  projects: [
    {
      name: "chromium",
      // 既定のウィンドウサイズに合わせる（左右分割が成立する幅）
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 820 },
      },
    },
  ],
});
