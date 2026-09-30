import { defineConfig, devices } from "@playwright/test";

// Nạp cấu hình .env để các kiểm thử cần cơ sở dữ liệu hoặc JWT có thể dùng
// JWT_SECRET và DATABASE_URL. Bỏ qua nếu không có tệp .env (Node >= 20.12).
try {
  process.loadEnvFile(".env");
} catch {
  /* Không có .env; các kiểm thử liên quan sẽ tự bỏ qua. */
}

const baseURL = process.env.BASE_URL ?? "http://localhost:3000";
// Có thể chỉ định Chromium đã cài sẵn, chẳng hạn trong CI hoặc môi trường cô lập.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "./tests/playwright",
  testMatch: /.*\.spec\.ts$/,
  // Mặc định chạy tuần tự để kết quả ổn định khi dùng chung ứng dụng và cơ sở dữ liệu cục bộ.
  // Có thể bật chạy song song bằng biến PW_WORKERS khi cần.
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.PW_WORKERS ? Number(process.env.PW_WORKERS) : 1,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: executablePath ? { executablePath, args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] } : {},
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PW_WEBSERVER
    ? { command: process.env.PW_WEBSERVER, url: baseURL, reuseExistingServer: true, timeout: 180_000 }
    : undefined,
});
