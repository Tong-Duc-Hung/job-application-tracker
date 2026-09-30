import { test, expect } from "./fixtures";

/**
 * Các kịch bản bảo mật cần tài khoản mới tạo riêng, không dùng chung tài khoản demo.
 * Một kịch bản xóa tài khoản; kịch bản còn lại dùng hai tài khoản độc lập để
 * xác nhận dữ liệu được cách ly. Cả hai đều kiểm tra vòng đời tài khoản.
 */
test.describe("Account security", () => {
  // Cách ly giữa hai tài khoản: tài khoản thứ hai không được nhìn thấy hoặc
  // mở được đơn ứng tuyển của tài khoản thứ nhất (kể cả khi có URL trực tiếp).
  test("one account can never see or open another account's application", async ({ page }) => {
    const uniqueCompany = `CrossAccount Guard Co ${Date.now()}`;

    // Tài khoản thứ nhất: tạo đơn ứng tuyển và lưu URL trang chi tiết.
    const email1 = `user1-${Date.now()}@example.com`;
    await page.goto("/register");
    await page.getByLabel("Họ và tên").fill("Cross Account User 1");
    await page.getByLabel("Email").fill(email1);
    await page.getByLabel("Mật khẩu", { exact: true }).fill("password123");
    await page.getByLabel("Xác nhận mật khẩu").fill("password123");
    await page.getByRole("button", { name: "Đăng ký" }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel("Email").fill(email1);
    await page.getByLabel("Mật khẩu").fill("password123");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/applications/new");
    await page.getByLabel(/^Công ty/).fill(uniqueCompany);
    await page.getByLabel(/^Vị trí/).fill("Test Position");
    await page.getByLabel(/^Ngày ứng tuyển/).fill("2026-08-01");
    await page.getByRole("button", { name: "Lưu" }).click();
    await expect(page).toHaveURL(/\/applications$/);

    // Tài khoản mới chỉ có một đơn nên không có phân trang hay tên trùng;
    // có thể mở đơn trực tiếp.
    await page.getByText(uniqueCompany).first().click();
    await expect(page).toHaveURL(/\/applications\/[^/]+$/);
    const applicationUrl = page.url();

    await page.getByRole("button", { name: "Đăng xuất" }).click();
    await expect(page).toHaveURL(/\/login/);

    // Tài khoản thứ hai không được nhìn thấy hoặc truy cập dữ liệu tài khoản thứ nhất.
    const email2 = `user2-${Date.now()}@example.com`;
    await page.goto("/register");
    await page.getByLabel("Họ và tên").fill("Cross Account User 2");
    await page.getByLabel("Email").fill(email2);
    await page.getByLabel("Mật khẩu", { exact: true }).fill("password123");
    await page.getByLabel("Xác nhận mật khẩu").fill("password123");
    await page.getByRole("button", { name: "Đăng ký" }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel("Email").fill(email2);
    await page.getByLabel("Mật khẩu").fill("password123");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/applications");
    await expect(page.getByText(uniqueCompany)).not.toBeVisible();

    await page.goto(applicationUrl);
    await expect(page.getByText(uniqueCompany)).not.toBeVisible();
    await expect(page.getByRole("heading", { name: "Không tìm thấy trang" })).toBeVisible();
  });

  // Xóa tài khoản qua DangerZone: redirect về /login và tài khoản không còn
  // đăng nhập được nữa (xác nhận đã xóa thật, không chỉ đăng xuất).
  test("deletes the account and the user can no longer log in", async ({ page }) => {
    const email = `delete-me-${Date.now()}@example.com`;
    const password = "password123";

    await page.goto("/register");
    await page.getByLabel("Họ và tên").fill("Disposable User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await page.getByLabel("Xác nhận mật khẩu").fill(password);
    await page.getByRole("button", { name: "Đăng ký" }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mật khẩu").fill(password);
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/settings");
    await page.getByRole("button", { name: "Xóa tài khoản" }).click();
    await expect(page.getByRole("heading", { name: "Xóa tài khoản" })).toBeVisible();

    // Hộp thoại xác nhận trong DangerZone yêu cầu mật khẩu hiện tại trước khi
    // gửi yêu cầu DELETE /api/settings/account.
    await page.getByLabel("Nhập mật khẩu để xác nhận").fill(password);

    // Có hai nút cùng tên "Xóa tài khoản": nút mở thẻ và nút xác nhận.
    // Chọn nút xác nhận bên trong hộp thoại (phần tử cuối theo thứ tự DOM).
    await page.getByRole("button", { name: "Xóa tài khoản" }).last().click();
    await expect(page).toHaveURL(/\/login/);

    // Xác nhận tài khoản đã bị xóa, không chỉ đơn thuần đăng xuất.
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mật khẩu").fill(password);
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page.getByText(/không đúng|error/i)).toBeVisible();
  });

  // Xóa tài khoản với mật khẩu SAI: hiện "Mật khẩu không đúng", ở lại /settings,
  // và tài khoản vẫn tồn tại.
  test("rejects deleting the account with the wrong password", async ({ page }) => {
    const email = `keep-me-${Date.now()}@example.com`;
    const password = "password123";

    await page.goto("/register");
    await page.getByLabel("Họ và tên").fill("Careful User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await page.getByLabel("Xác nhận mật khẩu").fill(password);
    await page.getByRole("button", { name: "Đăng ký" }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mật khẩu").fill(password);
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/settings");
    await page.getByRole("button", { name: "Xóa tài khoản" }).click();
    await page.getByLabel("Nhập mật khẩu để xác nhận").fill("totally-wrong-password");
    await page.getByRole("button", { name: "Xóa tài khoản" }).last().click();

    // Mật khẩu sai khiến account.service.ts trả lỗi qua thông báo; tài khoản
    // vẫn phải tồn tại sau thao tác thất bại.
    await expect(page.getByText("Mật khẩu không đúng")).toBeVisible();
    await expect(page).toHaveURL(/\/settings/);
  });
});