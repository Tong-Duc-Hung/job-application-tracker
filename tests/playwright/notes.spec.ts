import { test, expect } from "./fixtures";
import { createApplication, createInterview, createNote, loginAsFreshTestUser, toast, uniqueValue } from "./helpers";

/**
 * Trang /notes là master-detail, KHÔNG phải list phẳng: sidebar bên trái liệt kê
 * các đơn ứng tuyển và buổi phỏng vấn, pane bên phải chỉ hiển thị ghi chú của
 * mục đang được chọn. Nút "Thêm ghi chú" chỉ bật sau khi đã chọn một mục. Vì
 * vậy tìm một ghi chú theo tiêu đề chỉ hoạt động khi context chứa nó đang mở.
 *
 * File này phủ vòng đời CRUD cơ bản, tìm kiếm, sắp xếp và cách ly giữa các
 * context. Form, validation, deep link, not-found và các trường hợp biên nằm
 * ở notes-flows.spec.ts.
 */

test.describe("Interview notes", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsFreshTestUser(page);
  });

  // Tạo ghi chú cho một buổi phỏng vấn từ context "Phỏng vấn": chuyển sidebar,
  // chọn buổi, thêm ghi chú qua deep link ?interviewId=, lưu và xác nhận
  // bằng API.
  test("creates a note for an interview from the Interview context, then finds it there", async ({ page }) => {
    const application = await createApplication(page, { company: uniqueValue("Iv Note Co") });
    const interview = await createInterview(page, application.id, { title: uniqueValue("Notable round") });
    await page.goto("/notes");

    // Chuyển sidebar sang chế độ "Phỏng vấn" rồi chọn buổi vừa tạo. Dùng first()
    // vì sau khi chọn, tiêu đề có thể xuất hiện ở cả sidebar lẫn pane chi tiết.
    await page.getByRole("button", { name: "Phỏng vấn", exact: true }).first().click();
    await page.getByText(interview.title).first().click();
    await expect(page.getByText("Chưa có ghi chú")).toBeVisible();

    await page.getByRole("button", { name: "Thêm ghi chú" }).click();
    await expect(page).toHaveURL(new RegExp(`/notes/new\\?interviewId=${interview.id}`));

    // Form render trước khi context load xong; đợi tiêu đề buổi phỏng vấn hiện
    // ra rồi mới gõ, nếu không input có thể bị remount và mất chữ đã điền.
    await expect(page.locator("form").getByText(interview.title).first()).toBeVisible();
    const title = uniqueValue("Câu hỏi phỏng vấn");
    await page.getByLabel("Tiêu đề").fill(title);
    await page.getByLabel("Nội dung").fill("Hỏi về quy trình CI/CD và văn hóa review code.");
    await page.getByRole("button", { name: "Lưu ghi chú" }).click();
    await expect(toast(page, /Đã (tạo|lưu) ghi chú/)).toBeVisible();

    const stored = await (await page.request.get(`/api/notes?interviewId=${interview.id}`)).json();
    expect(stored.items.map((n: { title: string }) => n.title)).toEqual([title]);
  });

  // Ghi chú gắn với buổi phỏng vấn cũng xuất hiện trên trang chi tiết của
  // chính buổi phỏng vấn đó (không chỉ ở /notes).
  test("an interview's note also shows on that interview's detail page", async ({ page }) => {
    const application = await createApplication(page);
    const interview = await createInterview(page, application.id);
    await page.request.post("/api/notes", { data: { interviewId: interview.id, title: "Visible on detail", content: "body" } });
    await page.goto(`/interviews/${interview.id}`);
    await expect(page.getByText("Visible on detail").first()).toBeVisible();
  });
});

test.describe("Notes master-detail picker", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsFreshTestUser(page);
  });

  // Chuyển đổi giữa hai context (đơn ứng tuyển / buổi phỏng vấn); nút
  // "Thêm ghi chú" chỉ được enable sau khi đã chọn một mục.
  test("switches between application and interview contexts and enables adding only after selection", async ({ page }) => {
    const application = await createApplication(page, { company: uniqueValue("Picker Co") });
    const interview = await createInterview(page, application.id, { title: uniqueValue("Picker round") });
    await page.goto("/notes");

    // Chưa chọn context → nút thêm bị vô hiệu.
    await expect(page.getByRole("button", { name: "Thêm ghi chú" })).toBeDisabled();

    await page.getByRole("button", { name: "Phỏng vấn", exact: true }).first().click();
    await page.getByText(interview.title).first().click();
    await expect(page.getByRole("button", { name: "Thêm ghi chú" })).toBeEnabled();

    await page.getByRole("button", { name: "Đơn ứng tuyển", exact: true }).first().click();
    await page.getByText(application.company, { exact: true }).first().click();
    await expect(page.getByRole("button", { name: "Thêm ghi chú" })).toBeEnabled();
  });
});

test.describe("Managing notes", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsFreshTestUser(page);
  });

  // Xóa ghi chú: hộp xác nhận có thể hủy (note còn nguyên), rồi xác nhận xóa
  // — note biến mất khỏi UI và trả 404 ở API (không chỉ ẩn khỏi DOM).
  test("deleting asks for confirmation ('Xóa ghi chú'), can be cancelled, and then removes the note", async ({ page }) => {
    const application = await createApplication(page);
    const note = await createNote(page, application.id, { title: uniqueValue("Delete this note") });
    await page.goto("/notes");
    await page.getByText(application.company).first().click();
    const card = page.locator("article").filter({ hasText: note.title });

    // Hủy hộp thoại → note còn nguyên.
    await card.getByLabel("Xóa").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Xóa ghi chú" })).toBeVisible();
    await dialog.getByRole("button", { name: "Hủy" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(card).toHaveCount(1);

    // Xác nhận xóa → note mất khỏi UI và 404 ở API (không chỉ ẩn khỏi DOM).
    await card.getByLabel("Xóa").click();
    await page.getByRole("dialog").getByRole("button", { name: "Xóa", exact: true }).click();
    await expect(page.locator("article").filter({ hasText: note.title })).toHaveCount(0);
    expect((await page.request.get(`/api/notes/${note.id}`)).status()).toBe(404);
  });

  // Trang edit được prefill đúng giá trị cũ; lưu cập nhật thành công thì
  // quay về /notes và nội dung mới được lưu ở server.
  test("the edit page is prefilled and saving updates the note", async ({ page }) => {
    const application = await createApplication(page);
    const note = await createNote(page, application.id, { title: "Original title", content: "Original content" });
    await page.goto(`/notes/${note.id}/edit`);
    await expect(page.getByRole("heading", { name: "Chỉnh sửa ghi chú" })).toBeVisible();
    await expect(page.getByLabel("Tiêu đề")).toHaveValue("Original title");
    await expect(page.getByLabel("Nội dung")).toHaveValue("Original content");
    await page.getByLabel("Nội dung").fill("Edited content");
    await page.getByRole("button", { name: "Lưu ghi chú" }).click();
    await expect(page).toHaveURL(/\/notes(?:\?|$)/);
    expect((await (await page.request.get(`/api/notes/${note.id}`)).json()).note.content).toBe("Edited content");
  });

  // Tìm kiếm khớp cả TIÊU ĐỀ lẫn NỘI DUNG; xóa từ khóa thì hiện lại toàn bộ.
  test("search finds text in the CONTENT as well as the title, and clearing it shows everything again", async ({ page }) => {
    const application = await createApplication(page);
    const inContent = await createNote(page, application.id, { title: uniqueValue("Plain title"), content: "Mentions the zyxwv keyword" });
    const other = await createNote(page, application.id, { title: uniqueValue("Other title"), content: "Nothing here" });
    await page.goto("/notes");
    await page.getByText(application.company).first().click();
    await expect(page.locator("article")).toHaveCount(2);

    // Từ khóa chỉ có trong CONTENT, không có trong tiêu đề.
    await page.getByPlaceholder("Tìm trong ghi chú đang chọn…").fill("zyxwv");
    await expect(page.locator("article").filter({ hasText: inContent.title })).toHaveCount(1);
    await expect(page.locator("article").filter({ hasText: other.title })).toHaveCount(0);

    // Xóa ô tìm kiếm → toàn bộ ghi chú trở lại.
    await page.getByPlaceholder("Tìm trong ghi chú đang chọn…").fill("");
    await expect(page.locator("article")).toHaveCount(2);
  });

  // Toggle sắp xếp "Mới nhất" ⇄ "Cũ nhất" đổi thứ tự ghi chú của context đang chọn.
  test("the sort toggle ('Mới nhất' ⇄ 'Cũ nhất') reorders the selected context's notes", async ({ page }) => {
    const application = await createApplication(page);
    const older = await createNote(page, application.id, { title: uniqueValue("Older note") });
    // Chờ một nhịp để createdAt khác nhau rõ ràng; nếu hai note tạo cùng
    // mili-giây, thứ tự có thể không xác định và test sẽ flaky.
    await new Promise((resolve) => setTimeout(resolve, 15));
    const newer = await createNote(page, application.id, { title: uniqueValue("Newer note") });
    await page.goto("/notes");
    await page.getByText(application.company).first().click();

    // Mặc định: mới nhất trước.
    const toggle = page.getByRole("button", { name: /Mới nhất|Cũ nhất/ });
    await expect(toggle).toHaveText(/Mới nhất/);
    await expect(page.locator("article")).toContainText([newer.title, older.title]);

    await toggle.click();
    await expect(toggle).toHaveText(/Cũ nhất/);
    await expect(page.locator("article")).toContainText([older.title, newer.title]);
  });

  // Cách ly dữ liệu: ghi chú của đơn ứng tuyển này không hiện dưới đơn khác.
  test("the notes of one application are not shown under another", async ({ page }) => {
    const first = await createApplication(page, { company: uniqueValue("Alpha Notes") });
    const second = await createApplication(page, { company: uniqueValue("Beta Notes") });
    const firstNote = await createNote(page, first.id, { title: uniqueValue("Only in first") });
    await createNote(page, second.id, { title: uniqueValue("Only in second") });
    await page.goto("/notes");
    await page.getByText(first.company).first().click();
    await expect(page.locator("article")).toHaveCount(1);
    await expect(page.locator("article").first()).toContainText(firstNote.title);
  });
});