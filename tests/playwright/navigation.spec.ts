import { test, expect } from "./fixtures";
import { loginAsFreshTestUser } from "./helpers";

/** Phần khung (shell): sidebar / bottom navigation, tiêu đề section và nút đăng xuất. */

const SECTIONS: [string, string, string][] = [
  ["Tổng quan", "/dashboard", "Tổng quan"],
  ["Đơn ứng tuyển", "/applications", "Đơn ứng tuyển"],
  ["Phỏng vấn", "/interviews", "Phỏng vấn"],
  ["Ghi chú", "/notes", "Ghi chú"],
  ["Thống kê", "/statistics", "Thống kê"],
  ["Cài đặt", "/settings", "Cài đặt"],
];

test.describe("Desktop sidebar", () => {
  // Mỗi link trong sidebar điều hướng đúng path.
  for (const [label, path] of SECTIONS) {
    test(`'${label}' navigates to ${path}`, async ({ page }) => {
      await loginAsFreshTestUser(page);
      await page.goto(label === "Tổng quan" ? "/settings" : "/dashboard");
      await page.locator("aside").first().getByRole("link", { name: label }).click();
      await expect(page).toHaveURL(new RegExp(`${path}(?:\\?|$)`));
    });
  }

  // Section hiện tại được đánh dấu aria-current="page" để screen reader
  // công bố đúng.
  test("the current sidebar section is announced to assistive technology", async ({ page }) => {
    await loginAsFreshTestUser(page);
    await page.goto("/applications");
    await expect(page.locator("aside").first().getByRole("link", { name: "Đơn ứng tuyển" })).toHaveAttribute("aria-current", "page", { timeout: 2000 });
  });

  // Thẻ tài khoản hiển thị tên và email; nút đăng xuất một click.
  test("the account card shows the name and e-mail; sign-out is one click away", async ({ page }) => {
    const user = await loginAsFreshTestUser(page);
    await expect(page.getByText(user.email)).toBeVisible();
    await expect(page.getByText("E2E User").first()).toBeVisible();
    await page.getByRole("button", { name: "Đăng xuất" }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  // Trang chi tiết đơn ứng tuyển vẫn giữ section "Đơn ứng tuyển" active
  // trên title top bar (breadcrumb section).
  test("an application's detail page keeps the 'Đơn ứng tuyển' section active in the top bar title", async ({ page }) => {
    await loginAsFreshTestUser(page);
    const created = await page.request.post("/api/applications", { data: { company: "Nested Co", position: "P", appliedDate: "2026-08-01" } });
    const { application } = await created.json();
    await page.goto(`/applications/${application.id}`);
    await expect(page.locator("header").first()).toContainText("Đơn ứng tuyển");
  });
});

test.describe("Phone layout (375 px wide)", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  // Trên màn hình 375px: sidebar ẩn, thay bằng bottom navigation với mọi
  // section; aria-current="page" đánh dấu mục hiện tại.
  test("the sidebar is replaced by a bottom navigation that reaches every section", async ({ page }) => {
    await loginAsFreshTestUser(page);
    await expect(page.locator("aside").first()).toBeHidden();
    const nav = page.locator("nav").last();
    await page.goto("/applications");
    await expect(nav.getByRole("link", { name: "Đơn ứng tuyển" })).toHaveAttribute("aria-current", "page");
    for (const [label, path] of SECTIONS) {
      const link = nav.getByRole("link", { name: label });
      // Dev indicator của Next.js có thể chồng lên mục đầu của bottom nav
      // trên màn hình nhỏ. Kích hoạt bằng bàn phím vẫn thực thi đúng link
      // mà không bị overlay chặn click.
      await link.focus();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(new RegExp(`${path}(?:\\?|$)`));
    }
  });

  // Trên 375px, không trang nào được tràn ngang, kể cả khi có dữ liệu dài.
  test("no page scrolls sideways on a phone", async ({ page }) => {
    await loginAsFreshTestUser(page);
    await page.request.post("/api/applications", { data: { company: "Phone Co ".repeat(10), position: "Position ".repeat(8), appliedDate: "2026-08-01" } });
    for (const [, path] of SECTIONS) {
      await page.goto(path);
      await expect(page.locator("main").first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} must fit a 375px screen`).toBeLessThanOrEqual(0);
    }
  });

  // Trên điện thoại, list vẫn dùng được: card hiển thị, search box hoạt
  // động, nút "Thêm đơn ứng tuyển" điều hướng sang /new.
  test("the application list is usable on a phone: cards, search and the add button", async ({ page }) => {
    await loginAsFreshTestUser(page);
    await page.request.post("/api/applications", { data: { company: "Mobile Card Co", position: "QA", appliedDate: "2026-08-01" } });
    await page.goto("/applications");
    await expect(page.locator("article").filter({ hasText: "Mobile Card Co" })).toBeVisible();
    await expect(page.getByPlaceholder("Tìm theo tên công ty hoặc vị trí…")).toBeVisible();
    await page.getByRole("button", { name: "Thêm đơn ứng tuyển" }).click();
    await expect(page).toHaveURL(/\/applications\/new/);
  });
});

test.describe("Routing details", () => {
  // Mỗi section hiển thị đúng title tương ứng trong top bar.
  test("each section shows its own title in the top bar", async ({ page }) => {
    await loginAsFreshTestUser(page);
    for (const [, path, title] of SECTIONS) {
      await page.goto(path);
      await expect(page.locator("header").first()).toContainText(title);
    }
  });

  // Tiêu đề tab trình duyệt chứa tên app.
  test("the page title (browser tab) names the app", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/Job Application Tracker/);
  });

  // URL lồng sâu không tồn tại dưới mỗi section vẫn hiển thị trang 404
  // thân thiện (không phải lỗi layout).
  test("unknown nested URLs under a section are the friendly 404", async ({ page }) => {
    await loginAsFreshTestUser(page);
    for (const path of ["/applications/a/b/c", "/interviews/x/y/z", "/settings/unknown"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "Không tìm thấy trang" })).toBeVisible();
    }
  });
});