import { test, expect } from "./fixtures";
import { loginAsFreshTestUser, registerFreshUser, submitLoginForm, uniqueEmail } from "./helpers";

/**
 * Kiểm tra xác thực qua trình duyệt: khách, đăng ký, đăng nhập, phiên và đăng xuất.
 *
 * Kiểm tra chi tiết từng trường, token, cookie và cách ly tài khoản thuộc hợp đồng API;
 * các nội dung này được kiểm tra ở cấp API trong Postman.
 *
 * Mỗi kiểm thử cần tài khoản đều tự đăng ký tài khoản dùng một lần qua API.
 * Không sử dụng demo@example.com vì đây là dữ liệu dùng chung có thể bị thay đổi.
 *
 * Lưu ý: các trường xác thực có thuộc tính `required`, nên trình duyệt chặn giá trị
 * trống trước khi React Hook Form hoặc Zod chạy. Muốn kiểm tra thông báo Zod, cần
 * nhập dữ liệu không rỗng nhưng không hợp lệ, chẳng hạn tên chỉ có một ký tự.
 */

const PROTECTED_ROUTES = [
  "/dashboard",
  "/applications",
  "/applications/new",
  "/interviews",
  "/interviews/new",
  "/notes",
  "/notes/new",
  "/settings",
  "/statistics",
];

test.describe("Authentication — route guard", () => {
  // Mọi route bảo vệ đều redirect khách chưa đăng nhập về /login kèm
  // ?from=<đường dẫn gốc> để quay lại sau khi đăng nhập.
  for (const route of PROTECTED_ROUTES) {
    test(`a guest opening ${route} is sent to /login and the origin is remembered in ?from=`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(`/login\\?from=${encodeURIComponent(route)}$`));
    });
  }

  // Người đã đăng nhập mở /login hoặc /register thì được đưa thẳng về /dashboard.
  for (const route of ["/login", "/register"]) {
    test(`a signed-in user opening ${route} is sent straight to /dashboard`, async ({ page }) => {
      await loginAsFreshTestUser(page);
      await page.goto(route);
      await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
    });
  }

  // Route gốc "/": khách → /login; người đã đăng nhập → /dashboard (cả hai
  // chiều đều đúng).
  test("root route sends a guest to /login, and a logged-in user straight to /dashboard", async ({ page, request }) => {
    const user = await registerFreshUser(request);

    await page.goto("/");
    await expect(page).toHaveURL(/\/login(?:\?|$)/);

    await submitLoginForm(page, user);
    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
    await expect(page.getByText(user.email)).toBeVisible();

    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
  });

  // Deep link ?from=X: sau khi đăng nhập, người dùng quay lại đúng X.
  test("a guest sent to /login?from=X lands back on X after signing in", async ({ page, request }) => {
    const user = await registerFreshUser(request);

    await page.goto("/applications");
    await expect(page).toHaveURL(/\/login\?from=%2Fapplications$/);
    await submitLoginForm(page, user);

    await expect(page).toHaveURL(/\/applications(?:\?|$)/);
    await expect(page.getByRole("heading", { name: "Đơn ứng tuyển" })).toBeVisible();
  });

  // HTML lang="vi" — ngôn ngữ tài liệu là tiếng Việt.
  test("the document language is Vietnamese, not English", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  });

  // URL không tồn tại: hiện trang 404 thân thiện với nút quay về Tổng quan.
  test("an unknown URL shows the friendly 'not found' page with a way back", async ({ page }) => {
    await loginAsFreshTestUser(page);
    await page.goto("/this-page-does-not-exist");
    await expect(page.getByRole("heading", { name: "Không tìm thấy trang" })).toBeVisible();
    await page.getByRole("button", { name: "Về trang Tổng quan" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe("Authentication — login", () => {
  // Truy cập /login?expired=1 hiện thông báo session đã hết hạn.
  test("landing on /login?expired=1 shows a session-expired notice", async ({ page }) => {
    await page.goto("/login?expired=1");
    await expect(page.getByRole("status")).toContainText(/Phiên đăng nhập/);
  });

  // Double-click submit chỉ gửi MỘT request đăng nhập: nút bị disable trong
  // lúc request đang bay.
  test("double-clicking the submit button fires only one login request", async ({ page, request }) => {
    const user = await registerFreshUser(request);
    let requests = 0;
    await page.route("**/api/auth/login", async (route) => {
      requests += 1;
      await new Promise((resolve) => setTimeout(resolve, 400));
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Email hoặc mật khẩu không đúng" }),
      });
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(user.password);
    const submit = page.getByRole("button", { name: "Đăng nhập" });

    await submit.click();
    await expect(submit).toBeDisabled();
    await submit.click({ force: true });
    await expect(page.getByRole("alert").filter({ hasText: "Email hoặc mật khẩu không đúng" })).toBeVisible();
    await expect(submit).toBeEnabled();
    expect(requests).toBe(1);
  });

  // Server trả 5xx: form giữ nguyên dữ liệu đã nhập, hiện thông báo có thể retry,
  // nút submit enable lại, vẫn ở /login.
  test("a server error keeps the login form data and shows a retryable message", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("retry@example.com");
    await page.getByLabel("Mật khẩu", { exact: true }).fill("password123");
    await page.route("**/api/auth/login", (route) =>
      route.fulfill({ status: 502, contentType: "text/plain", body: "Bad Gateway" }),
    );

    await page.getByRole("button", { name: "Đăng nhập" }).click();

    await expect(page.getByRole("alert").filter({ hasText: "Đăng nhập thất bại. Vui lòng thử lại." })).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveValue("retry@example.com");
    await expect(page.getByLabel("Mật khẩu", { exact: true })).toHaveValue("password123");
    await expect(page.getByRole("button", { name: "Đăng nhập" })).toBeEnabled();
    await expect(page).toHaveURL(/\/login/);
  });

  // Lỗi mạng: thông báo khác (kiểm tra mạng), dữ liệu vẫn được giữ, nút enable.
  test("a network failure shows a retryable login message and preserves the entered credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("retry@example.com");
    await page.getByLabel("Mật khẩu", { exact: true }).fill("password123");
    await page.route("**/api/auth/login", (route) => route.abort("failed"));

    await page.getByRole("button", { name: "Đăng nhập" }).click();

    await expect(page.getByRole("alert").filter({ hasText: "Không thể kết nối. Vui lòng kiểm tra mạng và thử lại." })).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveValue("retry@example.com");
    await expect(page.getByLabel("Mật khẩu", { exact: true })).toHaveValue("password123");
    await expect(page.getByRole("button", { name: "Đăng nhập" })).toBeEnabled();
  });

  // Happy path: đăng nhập thành công, chuyển tới /dashboard, hiện email.
  test("logs in successfully with valid credentials and shows the account e-mail", async ({ page, request }) => {
    const user = await registerFreshUser(request);

    await page.goto("/login");
    await submitLoginForm(page, user);
    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
    await expect(page.getByText(user.email)).toBeVisible();
  });

  // Email không phân biệt hoa/thường khi đăng nhập.
  test("the e-mail is case-insensitive at login", async ({ page, request }) => {
    const user = await registerFreshUser(request);

    await page.goto("/login");
    await submitLoginForm(page, { email: user.email.toUpperCase(), password: user.password });
    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
  });

  // Email không tồn tại: hiện lỗi chung chung, vẫn ở /login.
  test("an unknown e-mail shows a generic error and stays on /login", async ({ page }) => {
    await page.goto("/login");
    await submitLoginForm(page, { email: uniqueEmail("nobody"), password: "wrongpassword1" });
    await expect(page.getByRole("alert").filter({ hasText: "Email hoặc mật khẩu không đúng" })).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  // Không phân biệt "email không tồn tại" và "sai mật khẩu": cùng thông báo
  // (chống enumeration tài khoản).
  test("a wrong password gives the SAME message as an unknown e-mail (no account enumeration)", async ({ page, request }) => {
    const user = await registerFreshUser(request);
    await page.goto("/login");
    await submitLoginForm(page, { email: user.email, password: "definitely-wrong-1" });
    const alert = page.getByRole("alert").filter({ hasText: "Email hoặc mật khẩu không đúng" });
    await expect(alert).toBeVisible();
    await expect(alert).not.toContainText(/không tồn tại|chưa đăng ký/i);
  });

  // Alert lỗi có thể đóng bằng nút "Đóng thông báo".
  test("the error alert can be dismissed", async ({ page }) => {
    await page.goto("/login");
    await submitLoginForm(page, { email: uniqueEmail("nobody"), password: "wrongpassword1" });
    const alert = page.getByRole("alert").filter({ hasText: "Thông tin chưa chính xác" });
    await expect(alert).toBeVisible();
    await alert.getByRole("button", { name: "Đóng thông báo" }).click();
    await expect(alert).toHaveCount(0);
  });

  // Submit form trống: trình duyệt chặn (required), không gọi API.
  test("an empty form is stopped by the browser and never calls the API", async ({ page }) => {
    let loginCalls = 0;
    page.on("request", (req) => {
      if (req.url().includes("/api/auth/login")) loginCalls += 1;
    });
    await page.goto("/login");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page).toHaveURL(/\/login/);
    expect(loginCalls).toBe(0);
  });

  // Mật khẩu mặc định là type="password"; nút eye toggle hiện/ẩn.
  test("the password is hidden by default and the eye button toggles it", async ({ page }) => {
    await page.goto("/login");
    const password = page.getByLabel("Mật khẩu");
    await password.fill("secret-value-1");
    await expect(password).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Hiện ký tự" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Ẩn ký tự" }).click();
    await expect(password).toHaveAttribute("type", "password");
  });

  // Cookie session: mặc định là session-cookie (expires = -1), HttpOnly,
  // SameSite=Lax; khi check "Ghi nhớ đăng nhập" thì expires ~30 ngày.
  test("without 'Ghi nhớ đăng nhập' the session cookie dies with the browser; with it, it lasts 30 days", async ({ page, context, request }) => {
    const user = await registerFreshUser(request);

    await page.goto("/login");
    await submitLoginForm(page, user);
    await expect(page).toHaveURL(/\/dashboard/);
    const sessionCookie = (await context.cookies()).find((c) => c.name === "jat_session");
    expect(sessionCookie, "a session cookie must be set").toBeTruthy();
    expect(sessionCookie!.expires, "browser-session cookie has no expiry").toBe(-1);
    expect(sessionCookie!.httpOnly).toBe(true);
    expect(sessionCookie!.sameSite).toBe("Lax");

    await context.clearCookies();
    await page.goto("/login");
    await page.getByLabel("Ghi nhớ đăng nhập").check();
    await submitLoginForm(page, user);
    await expect(page).toHaveURL(/\/dashboard/);
    const remembered = (await context.cookies()).find((c) => c.name === "jat_session");
    const thirtyDays = 30 * 24 * 60 * 60;
    const secondsLeft = remembered!.expires - Date.now() / 1000;
    expect(secondsLeft).toBeGreaterThan(thirtyDays - 300);
    expect(secondsLeft).toBeLessThanOrEqual(thirtyDays + 5);
  });

  // Link qua lại giữa /login và /register.
  test("the login page links to registration", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Đăng ký" }).click();
    await expect(page).toHaveURL(/\/register/);
    await page.getByRole("link", { name: "Đăng nhập" }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Authentication — logout", () => {
  // Sau khi đăng xuất: cookie session mất, các route bảo vệ lại yêu cầu đăng nhập.
  test("after logout the protected pages need a login again", async ({ page, request }) => {
    const user = await registerFreshUser(request);
    await page.goto("/login");
    await submitLoginForm(page, user);
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole("button", { name: "Đăng xuất" }).click();
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    expect((await page.context().cookies()).find((c) => c.name === "jat_session")).toBeUndefined();

    await page.goto("/applications");
    await expect(page).toHaveURL(/\/login\?from=%2Fapplications/);
  });

  // Nút Back của trình duyệt sau logout KHÔNG khôi phục dashboard (kể cả
  // trong cache tạm thời) — tránh rò rỉ dữ liệu cho người dùng kế tiếp.
  test("after logout, the browser back button does not restore the dashboard", async ({ page, request }) => {
    const user = await registerFreshUser(request);

    await page.goto("/login");
    await submitLoginForm(page, user);
    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);

    await page.getByRole("button", { name: "Đăng xuất" }).click();
    await expect(page).toHaveURL(/\/login(?:\?|$)/);

    await page.goBack();
    // A stale client-side cache showing the dashboard here, even briefly before a redirect,
    // would leak data to whoever uses the browser next.
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
  });
});

test.describe("Authentication — registration", () => {
  // Happy path đăng ký: thấy toast thành công, redirect về /login, và tài
  // khoản mới thực sự đăng nhập được.
  test("registers a new account, shows the success message and redirects to login", async ({ page }) => {
    const email = uniqueEmail("register");
    await page.goto("/register");
    await page.getByLabel("Họ và tên").fill("Test User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill("password123");
    await page.getByLabel("Xác nhận mật khẩu").fill("password123");
    await page.getByRole("button", { name: "Đăng ký" }).click();

    await expect(page.getByText("Tạo tài khoản thành công")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);

    // ...và tài khoản mới thực sự đăng nhập được.
    await submitLoginForm(page, { email, password: "password123" });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  // Đăng ký với email đã tồn tại: hiện lỗi, vẫn ở /register.
  test("shows an error for registering with an e-mail that already exists", async ({ page, request }) => {
    const existing = await registerFreshUser(request);

    await page.goto("/register");
    await page.getByLabel("Họ và tên").fill("Duplicate User");
    await page.getByLabel("Email").fill(existing.email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill("password123");
    await page.getByLabel("Xác nhận mật khẩu").fill("password123");
    await page.getByRole("button", { name: "Đăng ký" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Email này đã được sử dụng" })).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  });

  // Server lỗi: form giữ giá trị, hiện thông báo retry, nút enable lại.
  test("a server error keeps registration values and leaves the form ready to retry", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Họ và tên").fill("Retry Candidate");
    await page.getByLabel("Email").fill("retry-register@example.com");
    await page.getByLabel("Mật khẩu", { exact: true }).fill("Valid1234");
    await page.getByLabel("Xác nhận mật khẩu").fill("Valid1234");
    await page.route("**/api/auth/register", (route) =>
      route.fulfill({ status: 503, contentType: "text/plain", body: "Service Unavailable" }),
    );

    await page.getByRole("button", { name: "Đăng ký" }).click();

    await expect(page.getByRole("alert").filter({ hasText: "Đăng ký thất bại. Vui lòng thử lại." })).toBeVisible();
    await expect(page.getByLabel("Họ và tên")).toHaveValue("Retry Candidate");
    await expect(page.getByLabel("Email")).toHaveValue("retry-register@example.com");
    await expect(page.getByLabel("Mật khẩu", { exact: true })).toHaveValue("Valid1234");
    await expect(page.getByRole("button", { name: "Đăng ký" })).toBeEnabled();
    await expect(page).toHaveURL(/\/register/);
  });

  // Lỗi mạng: thông báo "Không thể kết nối", giá trị vẫn giữ, có thể retry.
  test("a network failure keeps registration values and allows retry", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Họ và tên").fill("Retry Candidate");
    await page.getByLabel("Email").fill("retry-register@example.com");
    await page.getByLabel("Mật khẩu", { exact: true }).fill("Valid1234");
    await page.getByLabel("Xác nhận mật khẩu").fill("Valid1234");
    await page.route("**/api/auth/register", (route) => route.abort("failed"));

    await page.getByRole("button", { name: "Đăng ký" }).click();

    await expect(page.getByRole("alert").filter({ hasText: "Không thể kết nối. Vui lòng kiểm tra mạng và thử lại." })).toBeVisible();
    await expect(page.getByLabel("Họ và tên")).toHaveValue("Retry Candidate");
    await expect(page.getByLabel("Email")).toHaveValue("retry-register@example.com");
    await expect(page.getByLabel("Mật khẩu", { exact: true })).toHaveValue("Valid1234");
    await expect(page.getByRole("button", { name: "Đăng ký" })).toBeEnabled();
  });

  // Double-click submit đăng ký chỉ gửi MỘT request (nút disable trong
  // lúc pending; accessible name đổi thành "Đang tạo tài khoản…").
  test("double-clicking registration sends only one request", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Họ và tên").fill("Pending Candidate");
    await page.getByLabel("Email").fill(uniqueEmail("pending-register"));
    await page.getByLabel("Mật khẩu", { exact: true }).fill("Valid1234");
    await page.getByLabel("Xác nhận mật khẩu").fill("Valid1234");
    let requests = 0;
    await page.route("**/api/auth/register", async (route) => {
      requests += 1;
      // Giữ request pending đủ lâu để trạng thái in-flight được kiểm tra chắc chắn.
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Temporary failure" }) });
    });
    // Accessible name đổi thành "Đang tạo tài khoản…" khi đang submit.
    const submit = page.locator('form button[type="submit"]');

    await submit.click();
    await expect(submit).toBeDisabled();
    await submit.click({ force: true });
    await expect(page.getByRole("alert").filter({ hasText: "Temporary failure" })).toBeVisible();
    await expect(submit).toBeEnabled();
    expect(requests).toBe(1);
  });

  // [nhãn, dữ liệu trường, thông báo kỳ vọng]. Mọi trường khác đều hợp lệ
  // để chỉ có DUY NHẤT một rule được kích hoạt.
  const VALIDATION_CASES: [string, { name?: string; email?: string; password?: string; confirm?: string }, string][] = [
    ["a one-character name", { name: "A" }, "Họ tên phải có ít nhất 2 ký tự"],
    ["an e-mail without a domain suffix", { email: "someone@localhost" }, "Email không hợp lệ"],
    ["a password shorter than 8 characters", { password: "abc123", confirm: "abc123" }, "Mật khẩu phải có ít nhất 8 ký tự"],
    ["a password without a digit", { password: "abcdefgh", confirm: "abcdefgh" }, "Mật khẩu phải chứa ít nhất một chữ số"],
    ["a password without a letter", { password: "12345678", confirm: "12345678" }, "Mật khẩu phải chứa ít nhất một chữ cái"],
    ["a confirmation that differs from the password", { confirm: "password124" }, "Mật khẩu xác nhận không khớp"],
  ];
  for (const [label, values, message] of VALIDATION_CASES) {
    // Từng case validation của form đăng ký: hiện thông báo inline và KHÔNG
    // gọi API.
    test(`rejects ${label} with an inline message and does not call the API`, async ({ page }) => {
      let calls = 0;
      page.on("request", (req) => {
        if (req.url().includes("/api/auth/register")) calls += 1;
      });
      await page.goto("/register");
      await page.getByLabel("Họ và tên").fill(values.name ?? "Valid Name");
      await page.getByLabel("Email").fill(values.email ?? uniqueEmail("validation"));
      await page.getByLabel("Mật khẩu", { exact: true }).fill(values.password ?? "password123");
      await page.getByLabel("Xác nhận mật khẩu").fill(values.confirm ?? values.password ?? "password123");
      await page.getByRole("button", { name: "Đăng ký" }).click();
      await expect(page.getByText(message)).toBeVisible();
      await expect(page).toHaveURL(/\/register/);
      expect(calls).toBe(0);
    });
  }
});