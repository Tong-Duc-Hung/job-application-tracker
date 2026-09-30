import { test, expect } from "./fixtures";
import { createApplication, createNote, loginAsFreshTestUser, toast, uniqueValue } from "./helpers";

/**
 * Luồng ghi chú — phần bổ sung cho notes.spec.ts (đã phủ CRUD cơ bản và master-detail).
 *
 * File này tập trung vào:
 *   - Form tạo ghi chú: validation, chọn target (đơn ứng tuyển hoặc buổi phỏng vấn), hủy.
 *   - Deep link tới trang edit của một ghi chú không tồn tại.
 *   - Các trường hợp biên về layout: tiêu đề dài không có khoảng trắng, tên đơn ứng tuyển dài tối đa.
 */

test.describe("Create form", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsFreshTestUser(page);
  });

  // Xác nhận cả tiêu đề và nội dung đều bắt buộc; khi thiếu, form hiển thị thông báo
  // lỗi tương ứng và tuyệt đối không gửi request POST nào tới /api/notes.
  test("title and content are required, with messages, and nothing is sent", async ({ page }) => {
    const application = await createApplication(page);
    let posts = 0;
    page.on("request", (req) => {
      if (req.method() === "POST" && req.url().includes("/api/notes")) posts += 1;
    });
    await page.goto(`/notes/new?applicationId=${application.id}`);
    // Form render trước khi context load xong; đợi tên công ty hiện ra trước.
    await expect(page.locator("form").getByText(application.company).first()).toBeVisible();
    await page.getByRole("button", { name: "Lưu ghi chú" }).click();
    await expect(page.getByText("Vui lòng nhập tiêu đề")).toBeVisible();
    await expect(page.getByText("Vui lòng nhập nội dung")).toBeVisible();
    expect(posts).toBe(0);
  });

  // Ghi chú trim tiêu đề (khác với đơn ứng tuyển): tiêu đề chỉ gồm khoảng trắng
  // bị coi là rỗng và bị từ chối.
  test("a title of only spaces is refused (notes trim, unlike applications)", async ({ page }) => {
    const application = await createApplication(page);
    await page.goto(`/notes/new?applicationId=${application.id}`);
    await expect(page.locator("form").getByText(application.company).first()).toBeVisible();
    await page.getByLabel("Tiêu đề").fill("     ");
    await page.getByLabel("Nội dung").fill("Some content");
    await page.getByRole("button", { name: "Lưu ghi chú" }).click();
    await expect(page.getByText("Vui lòng nhập tiêu đề")).toBeVisible();
  });

  // Khi không có target nào được khóa sẵn (deep link /notes/new), form yêu cầu
  // người dùng chọn đúng một target: hoặc một đơn ứng tuyển, hoặc một buổi phỏng vấn.
  // Sau khi chọn xong mới cho phép lưu thành công.
  test("without a locked target the form asks for one: choose application or interview, and it must pick exactly one", async ({ page }) => {
    const application = await createApplication(page, { company: uniqueValue("Pick Co"), position: "Tester" });
    await page.goto("/notes/new");
    await page.getByLabel("Tiêu đề").fill("Unlinked note");
    await page.getByLabel("Nội dung").fill("Body");
    await page.getByRole("button", { name: "Lưu ghi chú" }).click();
    await expect(page.getByText("Vui lòng chọn đúng một mục: đơn ứng tuyển hoặc buổi phỏng vấn")).toBeVisible();

    // Chọn một đơn ứng tuyển trong picker rồi lưu lại — lần này thành công.
    await page.getByRole("button", { name: "Chọn một đơn ứng tuyển" }).click();
    await page.getByRole("option", { name: `${application.company} — Tester` }).click();
    await page.getByRole("button", { name: "Lưu ghi chú" }).click();
    await expect(toast(page, /ghi chú/)).toBeVisible();
    const stored = await (await page.request.get(`/api/notes?applicationId=${application.id}`)).json();
    expect(stored.items).toHaveLength(1);
  });

  // Chuyển đổi target type trong form: chọn "Buổi phỏng vấn" sẽ thay picker
  // đơn ứng tuyển bằng picker buổi phỏng vấn.
  test("switching to 'Buổi phỏng vấn' swaps the picker", async ({ page }) => {
    await page.goto("/notes/new");
    await expect(page.getByRole("button", { name: "Chọn một đơn ứng tuyển" })).toBeVisible();
    await page.getByRole("button", { name: "Buổi phỏng vấn", exact: true }).click();
    await expect(page.getByRole("button", { name: "Chọn một buổi phỏng vấn" })).toBeVisible();
  });

  // Nút "Hủy" rời khỏi form mà không lưu: URL đổi khỏi /notes/new và API
  // xác nhận không có ghi chú nào được tạo.
  test("Cancel ('Hủy') leaves without saving", async ({ page }) => {
    const application = await createApplication(page);
    await page.goto(`/notes/new?applicationId=${application.id}`);
    await expect(page.locator("form").getByText(application.company).first()).toBeVisible();
    await page.getByLabel("Tiêu đề").fill("Discarded");
    await page.getByRole("button", { name: "Hủy" }).click();
    await expect(page).not.toHaveURL(/\/notes\/new/);
    const stored = await (await page.request.get(`/api/notes?applicationId=${application.id}`)).json();
    expect(stored.items).toEqual([]);
  });
});

test.describe("Edit and edge cases", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsFreshTestUser(page);
  });

  // Deep link tới một note id không tồn tại (hoặc thuộc tài khoản khác) phải
  // hiển thị thông báo "Không tìm thấy ghi chú" thay vì treo loading vô hạn.
  test("an unknown or foreign note id shows a not-found message instead of loading forever", async ({ page }) => {
    await page.goto("/notes/cabcdefghijklmnopqrstuvwx/edit");
    // Trang có thể render trước khi fetch trả về; timeout rộng hơn để tránh
    // flaky trên CI chậm.
    await expect(page.getByText(/Không tìm thấy ghi chú/)).toBeVisible({ timeout: 4000 });
  });

  // Kiểm tra layout với tiêu đề dài không có khoảng trắng (chuỗi ký tự liên tục)
  // kèm nội dung tiếng Việt có dấu: trang không được tràn ngang.
  test("a note with a very long unbroken title and Vietnamese text renders without breaking the layout", async ({ page }) => {
    const application = await createApplication(page);
    await createNote(page, application.id, { title: "Ôn_tập_" + "x".repeat(120), content: "Nội dung tiếng Việt có dấu — đầy đủ." });
    await page.goto("/notes");
    await page.getByText(application.company).first().click();
    await expect(page.getByText("Nội dung tiếng Việt có dấu — đầy đủ.")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  // Kiểm tra layout khi tên công ty và vị trí đều dài tối đa (150 ký tự):
  // heading hiển thị đầy đủ, không tràn ngang trong chính phần tử heading.
  test("a maximum-length application name and position fit the notes layout", async ({ page }) => {
    const company = "C".repeat(150);
    const application = await createApplication(page, { company, position: "P".repeat(150) });
    await page.goto("/notes");
    await page.getByText(application.company, { exact: true }).first().click();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const heading = page.locator("main h2").filter({ hasText: company });
    await expect(heading).toBeVisible();
    expect(await heading.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  });
});