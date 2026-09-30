import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import * as XLSX from "xlsx";
import { test, expect } from "./fixtures";
import { createApplication, createInterview, createNote, loginAsFreshTestUser, TINY_PNG, toast, uniqueValue } from "./helpers";

/** Mở hộp thoại chọn file ảnh đại diện và nạp file cho trước. */
async function chooseAvatarFile(page: Page, file: { name: string; mimeType: string; buffer: Buffer }) {
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Đổi ảnh đại diện" }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(file);
}

/**
 * Trang Settings: tổng quan, hồ sơ (tên + avatar), giao diện, mật khẩu,
 * xuất dữ liệu và vùng nguy hiểm.
 *
 * Xóa tài khoản với mật khẩu đúng/sai nằm ở account.spec.ts; KẾT QUẢ đổi mật khẩu
 * (mật khẩu cũ vs mới) nằm ở workflow.spec.ts. Hợp đồng API của các endpoint này
 * (validation, cookie, thu hồi session) được kiểm thử một lần ở tầng API trong
 * Postman collection — không lặp lại ở đây.
 */

test.describe("Overview", () => {
  // Thẻ tổng quan hiển thị email tài khoản, số đơn ứng tuyển/phỏng vấn,
  // giao diện hiện tại và ngày tham gia.
  test("shows the account e-mail, the counts of applications and interviews, the theme and the join date", async ({ page }) => {
    const user = await loginAsFreshTestUser(page);
    const application = await createApplication(page);
    await createApplication(page);
    await createInterview(page, application.id);
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Cài đặt" })).toBeVisible();
    await expect(page.getByText("Quản lý tài khoản và tùy chọn ứng dụng")).toBeVisible();
    await expect(page.getByText(user.email).first()).toBeVisible();
    const summary = page.locator("main").getByText("Thành viên từ").locator("xpath=ancestor::*[self::div or self::section][1]");
    await expect(summary).toBeVisible();
    await expect(page.getByText(String(new Date().getFullYear())).first()).toBeVisible();
  });

  // Trường email là chỉ đọc (có title giải thích lý do).
  test("the e-mail field cannot be edited", async ({ page }) => {
    await loginAsFreshTestUser(page);
    await page.goto("/settings");
    await expect(page.getByTitle("Email không thể thay đổi")).toBeVisible();
  });
});

test.describe("Profile", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsFreshTestUser(page);
    await page.goto("/settings");
  });

  // Đổi tên inline: lưu thành công, hiển thị trên thanh top bar, lưu vào
  // server và giữ nguyên sau khi reload.
  test("renames the account inline: saved, shown in the top bar, and stored", async ({ page }) => {
    await page.getByLabel("Chỉnh sửa tên").click();
    const input = page.locator('input[name="name"]');
    await expect(input).toHaveValue("E2E User");
    await input.fill("Lê Thị Hoa");
    await page.getByLabel("Lưu", { exact: true }).click();
    await expect(toast(page, "Đã cập nhật hồ sơ")).toBeVisible();
    await expect(page.getByText("Lê Thị Hoa").first()).toBeVisible();
    expect((await (await page.request.get("/api/auth/me")).json()).user.name).toBe("Lê Thị Hoa");
    await page.reload();
    await expect(page.getByText("Lê Thị Hoa").first()).toBeVisible();
  });

  // Hủy đổi tên: input biến mất, giá trị cũ được giữ nguyên trên server.
  test("cancelling the rename keeps the old name", async ({ page }) => {
    await page.getByLabel("Chỉnh sửa tên").click();
    await page.locator('input[name="name"]').fill("Should Not Stick");
    await page.getByLabel("Hủy", { exact: true }).click();
    await expect(page.locator('input[name="name"]')).toHaveCount(0);
    await expect(page.getByText("Should Not Stick")).toHaveCount(0);
    expect((await (await page.request.get("/api/auth/me")).json()).user.name).toBe("E2E User");
  });

  // Tên chỉ 1 ký tự bị từ chối kèm thông báo; không có gì được lưu.
  test("a one-character name is refused and nothing is saved", async ({ page }) => {
    await page.getByLabel("Chỉnh sửa tên").click();
    await page.locator('input[name="name"]').fill("A");
    await page.getByLabel("Lưu", { exact: true }).click();
    await expect(page.getByText("Tên phải có ít nhất 2 ký tự")).toBeVisible();
    expect((await (await page.request.get("/api/auth/me")).json()).user.name).toBe("E2E User");
  });

  // Upload ảnh: ảnh được resize/re-encode trong browser thành data URL
  // (JPEG, dung lượng ≤ 400 KB), lưu vào avatarUrl và hiển thị trên UI.
  test("uploading a picture stores it as the avatar and shows it", async ({ page }) => {
    const confirmation = toast(page, "Đã cập nhật hồ sơ").waitFor({ state: "visible" });
    const profileUpdate = page.waitForResponse((response) =>
      response.url().includes("/api/settings/profile") && response.request().method() === "PUT"
    );
    await chooseAvatarFile(page, { name: "avatar.png", mimeType: "image/png", buffer: TINY_PNG });
    expect((await profileUpdate).ok()).toBe(true);
    await confirmation;
    const avatar = (await (await page.request.get("/api/auth/me")).json()).user.avatarUrl as string;
    expect(avatar.startsWith("data:image/jpeg")).toBe(true); // resized and re-encoded in the browser
    expect(avatar.length).toBeLessThanOrEqual(400_000);
    await expect(page.locator(`img[src^="data:image/"]`).first()).toBeVisible();
  });

  // Ảnh > 8 MB bị từ chối kèm thông báo; avatarUrl vẫn giữ nguyên.
  test("a picture over 8 MB is refused with a message", async ({ page }) => {
    await chooseAvatarFile(page, { name: "huge.png", mimeType: "image/png", buffer: Buffer.alloc(8 * 1024 * 1024 + 1) });
    await expect(toast(page, "Ảnh quá lớn (tối đa 8MB)")).toBeVisible();
    expect((await (await page.request.get("/api/auth/me")).json()).user.avatarUrl).toBeNull();
  });

  // File có đuôi .png nhưng nội dung không phải ảnh thật bị từ chối
  // (kiểm tra bằng cách decode, không tin MIME type).
  test("a file that is not a real image is refused with a message", async ({ page }) => {
    const rejection = toast(page, "File không phải là ảnh hợp lệ").waitFor({ state: "visible" });
    await chooseAvatarFile(page, { name: "fake.png", mimeType: "image/png", buffer: Buffer.from("this is not an image") });
    await rejection;
    expect((await (await page.request.get("/api/auth/me")).json()).user.avatarUrl).toBeNull();
  });

  // File có MIME type không phải ảnh (text/plain) bị từ chối ngay từ đầu.
  test("a file whose type is not an image is refused with a message", async ({ page }) => {
    const rejection = toast(page, "Vui lòng chọn một file ảnh (JPG, PNG, WebP…)").waitFor({ state: "visible" });
    await chooseAvatarFile(page, { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
    await rejection;
    expect((await (await page.request.get("/api/auth/me")).json()).user.avatarUrl).toBeNull();
  });

  // Input chọn file chỉ chấp nhận ảnh (accept="image/*").
  test("the avatar picker only offers images", async ({ page }) => {
    await expect(page.locator('input[type="file"]')).toHaveAttribute("accept", "image/*");
  });
});

test.describe("Appearance", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsFreshTestUser(page);
    await page.goto("/settings");
  });

  // Nút "Tối"/"Sáng" đổi class .dark trên <html>, hiện toast và lưu vào
  // theme của user trên server.
  test("Tối / Sáng switch the whole page and are stored on the account", async ({ page }) => {
    await page.getByRole("button", { name: "Tối" }).click();
    await expect(toast(page, "Đã cập nhật giao diện")).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/dark/);
    expect((await (await page.request.get("/api/auth/me")).json()).user.theme).toBe("DARK");

    await page.getByRole("button", { name: "Sáng" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await expect(toast(page, "Đã cập nhật giao diện")).toBeVisible();
    await expect.poll(async () => {
      const response = await page.request.get("/api/auth/me");
      return (await response.json()).user.theme;
    }).toBe("LIGHT");
  });

  // Lựa chọn giao diện được giữ qua reload và khi điều hướng sang trang khác.
  test("the choice survives a reload", async ({ page }) => {
    await page.getByRole("button", { name: "Tối" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.goto("/applications");
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  // "Hệ thống" theo dõi prefers-color-scheme của OS: khi OS dark thì
  // trang dark và ngược lại; giá trị lưu trên server là SYSTEM.
  test("'Hệ thống' follows the operating system's colour scheme", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.getByRole("button", { name: "Hệ thống" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    expect((await (await page.request.get("/api/auth/me")).json()).user.theme).toBe("SYSTEM");
  });
});

test.describe("Change password dialog", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsFreshTestUser(page);
    await page.goto("/settings");
    await page.getByRole("button", { name: "Đổi mật khẩu" }).click();
  });

  // Dialog mở ra có 3 trường (hiện tại, mới, xác nhận) và đóng được bằng Escape.
  test("opens a dialog with three fields and can be cancelled", async ({ page }) => {
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Đổi mật khẩu" })).toBeVisible();
    await expect(dialog.getByLabel(/^Mật khẩu hiện tại/)).toBeVisible();
    await expect(dialog.getByLabel(/^Mật khẩu mới/)).toBeVisible();
    await expect(dialog.getByLabel(/^Xác nhận mật khẩu mới/)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });

  // Thanh đo độ mạnh mật khẩu phản ứng theo nội dung gõ vào: yếu → mạnh.
  test("the strength meter reacts to what is typed", async ({ page }) => {
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/^Mật khẩu mới/).fill("abc12");
    await expect(dialog.getByText("Yếu", { exact: true })).toBeVisible();
    await dialog.getByLabel(/^Mật khẩu mới/).fill("Str0ng-Passw0rd!2026");
    await expect(dialog.getByText("Mạnh", { exact: true })).toBeVisible();
  });

  // Từ chối 3 trường hợp: xác nhận không khớp, mật khẩu mới quá ngắn,
  // và mật khẩu mới trùng mật khẩu hiện tại.
  test("refuses a mismatch, a weak password and a new password equal to the current one", async ({ page }) => {
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/^Mật khẩu hiện tại/).fill("password123");
    await dialog.getByLabel(/^Mật khẩu mới/).fill("password456");
    await dialog.getByLabel(/^Xác nhận mật khẩu mới/).fill("password457");
    await dialog.getByRole("button", { name: "Cập nhật mật khẩu" }).click();
    await expect(dialog.getByText("Mật khẩu xác nhận không khớp")).toBeVisible();

    await dialog.getByLabel(/^Mật khẩu mới/).fill("short1");
    await dialog.getByLabel(/^Xác nhận mật khẩu mới/).fill("short1");
    await dialog.getByRole("button", { name: "Cập nhật mật khẩu" }).click();
    await expect(dialog.getByText("Mật khẩu mới phải có ít nhất 8 ký tự")).toBeVisible();

    await dialog.getByLabel(/^Mật khẩu mới/).fill("password123");
    await dialog.getByLabel(/^Xác nhận mật khẩu mới/).fill("password123");
    await dialog.getByRole("button", { name: "Cập nhật mật khẩu" }).click();
    await expect(dialog.getByText("Mật khẩu mới phải khác mật khẩu hiện tại")).toBeVisible();
    await expect(dialog).toBeVisible();
  });
});

test.describe("Export", () => {
  // Seed dữ liệu mẫu: 1 đơn ứng tuyển có kinh nghiệm, 1 buổi phỏng vấn,
  // 1 ghi chú gắn đơn và 1 ghi chú gắn buổi phỏng vấn.
  const seed = async (page: import("@playwright/test").Page) => {
    const application = await createApplication(page, {
      company: uniqueValue("Export Co"),
      position: "Kỹ sư kiểm thử",
      location: "Hà Nội",
      experience: "Bài học từ vòng tuyển dụng",
    });
    const interview = await createInterview(page, application.id, { title: "Vòng export" });
    await createNote(page, application.id, { title: "Ghi chú export", content: "Nội dung, có dấu phẩy" });
    await page.request.post("/api/notes", { data: { interviewId: interview.id, title: "Ghi chú vòng", content: "x" } });
    return application;
  };

  // Menu Xuất cung cấp đủ 4 định dạng: CSV, Excel (.xlsx), PDF, JSON.
  test("offers four formats", async ({ page }) => {
    await loginAsFreshTestUser(page);
    await page.goto("/settings");
    await page.getByRole("button", { name: "Xuất", exact: true }).click();
    for (const label of ["CSV", "Excel (.xlsx)", "PDF", "JSON"]) await expect(page.getByText(label, { exact: true })).toBeVisible();
  });

  // JSON: chứa user + mọi application kèm interviews và notes lồng nhau;
  // tên file đúng format; KHÔNG chứa passwordHash (không rò rỉ hash).
  test("JSON: the file holds the user, every application with nested interviews and notes, and no password hash", async ({ page }) => {
    await loginAsFreshTestUser(page);
    const application = await seed(page);
    await page.goto("/settings");
    await page.getByRole("button", { name: "Xuất", exact: true }).click();
    const download = page.waitForEvent("download");
    await page.getByText("JSON", { exact: true }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^Job Application Tracker \d{2}-\d{2}-\d{4}\.json$/);
    await expect(toast(page, "Đã xuất dữ liệu")).toBeVisible();
    const text = readFileSync((await file.path())!, "utf8");
    const data = JSON.parse(text);
    expect(data.applications).toHaveLength(1);
    expect(data.applications[0].company).toBe(application.company);
    expect(data.applications[0].interviews[0].notes[0].title).toBe("Ghi chú vòng");
    expect(data.applications[0].notes[0].title).toBe("Ghi chú export");
    expect(text).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  // CSV: 5 dòng (2 đơn, 1 lịch, 2 ghi chú) với tiếng Việt và dấu phẩy
  // trong nội dung được escape đúng (đọc lại bằng thư viện XLSX).
  test("CSV: exports application, interview, and note rows with Vietnamese text and commas intact", async ({ page }) => {
    await loginAsFreshTestUser(page);
    const application = await seed(page);
    await createApplication(page, { company: uniqueValue("Second Export Co") });
    await page.goto("/settings");
    await page.getByRole("button", { name: "Xuất", exact: true }).click();
    const download = page.waitForEvent("download");
    await page.getByText("CSV", { exact: true }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^Job Application Tracker \d{2}-\d{2}-\d{4}\.csv$/);
    const text = readFileSync((await file.path())!, "utf8").replace(/^\uFEFF/, "");
    const workbook = XLSX.read(text, { type: "string" });
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets[workbook.SheetNames[0]]!);
    expect(rows).toHaveLength(5);
    expect(rows.filter((row) => row["Loại dữ liệu"] === "Đơn ứng tuyển")).toHaveLength(2);
    expect(rows.filter((row) => row["Loại dữ liệu"] === "Lịch phỏng vấn")).toHaveLength(1);
    expect(rows.filter((row) => row["Loại dữ liệu"] === "Ghi chú")).toHaveLength(2);
    expect(rows.map((row) => row["Nội dung ghi chú"])).toContain("Nội dung, có dấu phẩy");
    expect(text).toContain(application.company);
    expect(text).toContain("Kỹ sư kiểm thử");
    expect(text).toContain("Bài học từ vòng tuyển dụng");
    expect(text).toContain("Nội dung, có dấu phẩy");
  });

  // Excel: workbook có đúng 3 sheet với tên và số dòng mong đợi.
  test("Excel: a workbook with the three sheets", async ({ page }) => {
    await loginAsFreshTestUser(page);
    const application = await seed(page);
    await page.goto("/settings");
    await page.getByRole("button", { name: "Xuất", exact: true }).click();
    const download = page.waitForEvent("download");
    await page.getByText("Excel (.xlsx)", { exact: true }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^Job Application Tracker \d{2}-\d{2}-\d{4}\.xlsx$/);
    const workbook = XLSX.readFile((await file.path())!);
    expect(workbook.SheetNames).toEqual(["Đơn ứng tuyển", "Phỏng vấn", "Ghi chú"]);
    const applications = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets["Đơn ứng tuyển"]);
    expect(applications).toHaveLength(1);
    expect(JSON.stringify(applications[0])).toContain(application.company);
    expect(applications[0]["Kinh nghiệm"]).toBe("Bài học từ vòng tuyển dụng");
    expect(XLSX.utils.sheet_to_json(workbook.Sheets["Phỏng vấn"])).toHaveLength(1);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets["Ghi chú"])).toHaveLength(2);
  });

  // PDF: file tải về là PDF thật (magic bytes "%PDF-", dung lượng > 1 KB).
  test("PDF: a real PDF document is downloaded", async ({ page }) => {
    await loginAsFreshTestUser(page);
    await seed(page);
    await page.goto("/settings");
    await page.getByRole("button", { name: "Xuất", exact: true }).click();
    const download = page.waitForEvent("download");
    await page.getByText("PDF", { exact: true }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^Job Application Tracker \d{2}-\d{2}-\d{4}\.pdf$/);
    const bytes = readFileSync((await file.path())!);
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(1000);
  });

  // Tài khoản chưa có dữ liệu vẫn export được (mảng applications rỗng,
  // không lỗi).
  test("an account with no data still exports (empty files, no error)", async ({ page }) => {
    await loginAsFreshTestUser(page);
    await page.goto("/settings");
    await page.getByRole("button", { name: "Xuất", exact: true }).click();
    const download = page.waitForEvent("download");
    await page.getByText("JSON", { exact: true }).click();
    const data = JSON.parse(readFileSync(((await (await download).path()))!, "utf8"));
    expect(data.applications).toEqual([]);
  });
});

test.describe("Danger zone", () => {
  // Hủy dialog xác nhận xóa tài khoản: dialog đóng, tài khoản vẫn còn
  // (kiểm tra bằng cách đăng nhập lại).
  test("the confirmation dialog can be cancelled and the account stays", async ({ page }) => {
    const user = await loginAsFreshTestUser(page);
    await page.goto("/settings");
    await page.getByRole("button", { name: "Xóa tài khoản" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Xóa tài khoản" })).toBeVisible();
    await expect(dialog).toContainText("Không thể hoàn tác");
    await dialog.getByRole("button", { name: /Hủy|Huỷ/ }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(/\/settings/);
    expect((await page.request.post("/api/auth/login", { data: { email: user.email, password: user.password } })).status()).toBe(200);
  });

  // Xác nhận xóa với mật khẩu rỗng không xóa được tài khoản.
  test("confirming with an empty password does not delete anything", async ({ page }) => {
    await loginAsFreshTestUser(page);
    await page.goto("/settings");
    await page.getByRole("button", { name: "Xóa tài khoản" }).click();
    await page.getByRole("button", { name: "Xóa tài khoản" }).last().click();
    await expect(page).toHaveURL(/\/settings/);
    expect((await page.request.get("/api/auth/me")).status()).toBe(200);
  });

  // Xóa tài khoản thành công: redirect về /login; email có thể đăng ký lại
  // và workspace mới hoàn toàn rỗng (dữ liệu cũ đã bị xóa).
  test("deleting the account removes its data: the e-mail can register again with an empty workspace", async ({ page, request }) => {
    const user = await loginAsFreshTestUser(page);
    await createApplication(page);
    await page.goto("/settings");
    await page.getByRole("button", { name: "Xóa tài khoản" }).click();
    await page.getByLabel("Nhập mật khẩu để xác nhận").fill(user.password);
    await page.getByRole("button", { name: "Xóa tài khoản" }).last().click();
    await expect(page).toHaveURL(/\/login/);

    const again = await request.post("/api/auth/register", { data: { name: "Back", email: user.email, password: "password123", confirmPassword: "password123" } });
    expect(again.status()).toBe(201);
    await request.post("/api/auth/login", { data: { email: user.email, password: "password123" } });
    expect((await (await request.get("/api/applications")).json()).total).toBe(0);
  });
});

// Nút "Đăng xuất" trên trang Settings kết thúc session và đưa về /login.
test("'Đăng xuất' on the settings page signs out", async ({ page }) => {
  await loginAsFreshTestUser(page);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Đăng xuất" }).first().click();
  await expect(page).toHaveURL(/\/login/);
});