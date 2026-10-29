import { defineConfig } from "@playwright/test";
import { MOCK_SUPABASE_URL } from "./tests/ui/model-profile.mock";

const port = Number(process.env.MOCK_UI_PORT ?? 4317);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/ui",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: "list",
  outputDir: "./test-results",
  use: {
    baseURL,
    browserName: "chromium",
    serviceWorkers: "block",
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    command: `node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: MOCK_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "mock-publishable-key-not-a-secret",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
