import { test, expect } from "./fixtures";
import { loginAsFreshTestUser, registerFreshUser, submitLoginForm } from "./helpers";

/**
 * Hành vi bảo mật ở tầng trình duyệt — chỉ bộc lộ khi render trang thật:
 * cookie bị chỉnh sửa, UX khi session bị thu hồi, và những gì form đăng nhập để lộ.
 *
 * Hợp đồng API tương ứng (401, hình dạng token/cookie, thu hồi session khi đổi
 * mật khẩu, injection, mass assignment, cách ly giữa các tài khoản) đã được kiểm
 * thử một lần ở tầng API trong Postman collection — không lặp lại ở đây.
 *
 * Các case có tiền tố "BUG:" là regression test bình thường: pass khi hành vi
 * đúng, fail khi bị thoái hóa.
 */

// Cookie session rác (giá trị không hợp lệ) phải được coi là khách ẩn danh:
// redirect về /login kèm ?from= thay vì render trang trắng hoặc lỗi.
test("a browser holding a garbage session cookie is treated as a guest, not shown a blank page", async ({ page, context }) => {
  await page.goto("/login");
  await context.addCookies([{ name: "jat_session", value: "garbage", url: page.url() }]);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?from=%2Fdashboard/);
});

// Sau khi đổi mật khẩu, dialog gọi router.push("/login"): người dùng phải
// thấy trang đăng nhập và có thể đăng nhập lại bằng mật khẩu mới.
test("BUG: after the password is changed the user must land on the login page and be able to sign in again", async ({ page }) => {
  const user = await loginAsFreshTestUser(page);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Đổi mật khẩu" }).click();
  await page.getByLabel(/^Mật khẩu hiện tại/).fill(user.password);
  await page.getByLabel(/^Mật khẩu mới/).fill("password456");
  await page.getByLabel(/^Xác nhận mật khẩu mới/).fill("password456");
  await page.getByRole("button", { name: "Cập nhật mật khẩu" }).click();

  // The dialog's own code does router.push("/login"): that is what the user is meant to see.
  await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  await submitLoginForm(page, { email: user.email, password: "password456" });
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: /Chào/ })).toBeVisible();
});

// Đổi mật khẩu thu hồi mọi session khác: session đã copy sang browser thứ hai
// phải bị vô hiệu hóa (redirect kèm ?expired=1).
test("changing the password revokes a session copied to another browser", async ({ page, browser }) => {
  const user = await loginAsFreshTestUser(page);
  const otherContext = await browser.newContext();

  try {
    await otherContext.addCookies(await page.context().cookies());
    const otherPage = await otherContext.newPage();
    await otherPage.goto("/applications");
    await expect(otherPage).toHaveURL(/\/applications/);

    await page.goto("/settings");
    await page.getByRole("button", { name: "Đổi mật khẩu" }).click();
    await page.getByLabel(/^Mật khẩu hiện tại/).fill(user.password);
    await page.getByLabel(/^Mật khẩu mới/).fill("password456");
    await page.getByLabel(/^Xác nhận mật khẩu mới/).fill("password456");
    await page.getByRole("button", { name: "Cập nhật mật khẩu" }).click();
    await expect(page).toHaveURL(/\/login\?expired=1/);

    await otherPage.goto("/applications");
    await expect(otherPage).toHaveURL(/\/login\?expired=1/);
  } finally {
    await otherContext.close();
  }
});

test.describe("Login form hygiene", () => {
  // Tham số ?from= độc hại (//evil.example) phải bị bỏ qua và fallback về
  // /dashboard cùng origin, không redirect ra ngoài site.
  test("a malicious ?from= value falls back to /dashboard instead of redirecting off-site", async ({ page, request }) => {
    const user = await registerFreshUser(request);

    await page.goto(`/login?from=${encodeURIComponent("//evil.example")}`);
    const appOrigin = new URL(page.url()).origin;
    await submitLoginForm(page, user);

    await expect(page).toHaveURL((url) => url.origin === appOrigin && url.pathname === "/dashboard");
  });

  // Mật khẩu không bao giờ được xuất hiện trong URL hay nội dung trang sau
  // khi đăng nhập thất bại (tránh lộ qua log, history, hoặc DOM).
  test("the password never appears in the URL or in the page after a failed login", async ({ page }) => {
    await page.goto("/login");
    await submitLoginForm(page, { email: "someone@example.com", password: "Sup3r-Secret-Pass" });
    await expect(page.getByRole("alert").filter({ hasText: "Email hoặc mật khẩu không đúng" })).toBeVisible();
    expect(page.url()).not.toContain("Sup3r-Secret-Pass");
    expect(await page.content()).not.toContain("Sup3r-Secret-Pass");
  });

  // Form đăng nhập phải POST bằng fetch (JSON body), không bao giờ dùng GET
  // kèm credentials trong query string.
  test("the login form posts with fetch (JSON), never as a GET with credentials in the query string", async ({ page }) => {
    const requests: { method: string; url: string }[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/auth/login")) requests.push({ method: req.method(), url: req.url() });
    });
    await page.goto("/login");
    await submitLoginForm(page, { email: "someone@example.com", password: "Sup3r-Secret-Pass" });
    await expect(page.getByRole("alert").filter({ hasText: "Email hoặc mật khẩu không đúng" })).toBeVisible();
    expect(requests).toEqual([{ method: "POST", url: expect.not.stringContaining("password") }]);
  });

  // Cookie session phải là httpOnly: script trong trang không đọc được
  // (document.cookie không chứa jat_session).
  test("the session cookie cannot be read by page scripts", async ({ page }) => {
    await loginAsFreshTestUser(page);
    expect(await page.evaluate(() => document.cookie)).not.toContain("jat_session");
  });
});