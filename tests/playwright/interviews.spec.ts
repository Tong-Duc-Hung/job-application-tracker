import { test, expect } from "./fixtures";
import { createApplication, createInterview, isoLocal, loginAsFreshTestUser } from "./helpers";

/**
 * The /interviews list page is a master-detail layout, NOT a flat list:
 * the left sidebar groups interviews by application (one row per
 * application, sorted by that application's earliest interview under the
 * current sort), and the right pane only shows InterviewCards for
 * whichever application is currently selected (defaults to the first one
 * in the sidebar). So finding "an interview" by its title alone only
 * works if the right application happens to already be selected — these
 * tests select the application explicitly first wherever that matters.
 *
 * "Loại phỏng vấn" / "Kết quả" are the same custom Select as in
 * applications.spec.ts: open via the labeled trigger button, then click
 * the option, instead of .selectOption().
 */
test.describe("Interviews", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsFreshTestUser(page);
  });

  test("switches between List and Calendar tabs", async ({ page }) => {
    await page.goto("/interviews");
    // These tabs render with an explicit role="tab" (see TabButton in
    // interviews/page.tsx), not the default button role.
    await expect(page.getByRole("tab", { name: "Danh sách" })).toBeVisible();
    await page.getByRole("tab", { name: "Lịch" }).click();
    await expect(page.getByText(/\d{1,2}\/\d{4}/)).toBeVisible();
  });

  test("creates, edits, and deletes an interview from an application's detail page", async ({ page }) => {
    const application = await createApplication(page);
    await page.goto("/applications");
    await page.getByPlaceholder("Tìm theo tên công ty hoặc vị trí…").fill(application.company);
    await page.getByText(application.company).first().click();
    await expect(page).toHaveURL(/\/applications\/[^/]+$/);
    await expect(page.getByText("Chưa có vòng phỏng vấn nào")).toBeVisible();

    await page.getByRole("button", { name: "Thêm vòng" }).click();
    await expect(page).toHaveURL(/\/interviews\/new/);

    // Wait for the form to settle before typing. It first renders with an empty
    // application picker ("Đang tải danh sách…") and re-mounts once the linked
    // application has loaded — which wipes anything typed in the meantime, while
    // the native `required` on the empty picker blocks a submit. Typing straight
    // away (as this test used to) therefore lost the input and sent no request.
    await expect(page.locator("form").getByText(application.company).first()).toBeVisible();

    await page.getByLabel("Tiêu đề").fill("HR Screening");
    await page.getByLabel("Nhận xét sau buổi phỏng vấn").fill("Ghi lại trải nghiệm sau buổi trao đổi.");
    await page.getByLabel("Ngày & giờ").fill(isoLocal(7, "09:00"));
    // "Loại phỏng vấn" and "Kết quả" already default to valid values, so
    // they are left alone here — the Select control itself is covered by
    // the "filters interviews by result" test below.

    // Capture the create request so a failed save says WHY: a non-201 status
    // (with the response body) means the server rejected it, while a timeout
    // here means the click never sent a request at all (client-side validation).
    const createResponse = page.waitForResponse(
      (res) => res.url().includes("/api/interviews") && res.request().method() === "POST",
      { timeout: 10_000 },
    );
    await page.getByRole("button", { name: "Lưu lịch phỏng vấn" }).click();
    const created = await createResponse;
    expect(created.status(), `POST /api/interviews responded: ${await created.text()}`).toBe(201);

    // Product flow: after a successful create, the user lands back on the
    // master list so they can immediately continue working on the schedule.
    await expect(page).toHaveURL(/\/interviews(?:\?|$)/);

    await page.getByRole("button", { name: new RegExp(application.company) }).click();
    await expect(page.getByText("HR Screening")).toBeVisible();
    const card = page.locator("article").filter({ hasText: "HR Screening" });
    await expect(card).toContainText("Nhận xét: Ghi lại trải nghiệm sau buổi trao đổi.");
    await card.getByLabel("Sửa").click();
    // Same load race as the create form: wait for the existing value to appear
    // before overwriting it, otherwise the late-arriving data can replace our input.
    await expect(page.getByLabel("Tiêu đề")).toHaveValue("HR Screening");
    await expect(page.getByLabel("Nhận xét sau buổi phỏng vấn")).toHaveValue("Ghi lại trải nghiệm sau buổi trao đổi.");
    await page.getByLabel("Tiêu đề").fill("HR Screening (đã sửa)");
    await page.getByRole("button", { name: "Lưu lịch phỏng vấn" }).click();
    await expect(page).toHaveURL(/\/interviews(?:\?|$)/);
    await page.getByRole("button", { name: new RegExp(application.company) }).click();
    await expect(page.getByText("HR Screening (đã sửa)")).toBeVisible();

    // Delete.
    await page.goto("/interviews");
    await page.getByRole("button", { name: new RegExp(application.company) }).click();
    const updatedCard = page.locator("article").filter({ hasText: "HR Screening (đã sửa)" });
    await updatedCard.getByLabel("Xóa").click();
    // Card icon button and dialog confirm button share the name "Xóa" — take the dialog's.
    await page.getByRole("button", { name: "Xóa", exact: true }).last().click();
    // Count cards rather than getByText(): the confirm dialog may repeat the title
    // while it closes, which would match two elements and trip strict mode.
    await expect(page.locator("article").filter({ hasText: "HR Screening (đã sửa)" })).toHaveCount(0);
  });

  test("opens an interview's detail page and navigates back to its application", async ({ page }) => {
    const application = await createApplication(page);
    const interview = await createInterview(page, application.id, {
      title: "E2E Detail Interview",
      review: "Nhật ký nhận xét phỏng vấn.",
    });
    await page.goto("/applications");
    await page.getByPlaceholder("Tìm theo tên công ty hoặc vị trí…").fill(application.company);
    await page.getByText(application.company, { exact: false }).first().click();
    // Wait for the detail route before capturing — page.url() straight after
    // a click can still return the list URL.
    await expect(page).toHaveURL(/\/applications\/[^/]+$/);
    const applicationUrl = page.url();

    await page.getByText(interview.title, { exact: true }).click();
    await expect(page).toHaveURL(/\/interviews\/[^/]+$/);
    await expect(page.getByRole("button", { name: "Chỉnh sửa" })).toBeVisible();
    await expect(page.getByText("Nhận xét sau buổi phỏng vấn")).toBeVisible();
    await expect(page.getByText("Nhật ký nhận xét phỏng vấn.")).toBeVisible();

    // The company · position line under the interview title links back.
    await page.getByText(application.company, { exact: false }).first().click();
    await expect(page).toHaveURL(applicationUrl);
  });

  test("filters interviews by result", async ({ page }) => {
    const cancelledApplication = await createApplication(page);
    await createInterview(page, cancelledApplication.id, { result: "CANCELLED" });
    await page.goto("/interviews");
    await page.getByRole("button", { name: "Bộ lọc" }).click();
    // exact: true — otherwise this also matches the application buttons in
    // the left sidebar, whose accessible names contain the same words.
    await page.getByRole("button", { name: "Kết quả", exact: true }).click();
    await page.getByRole("option", { name: "Đã hủy" }).click();
    await expect(page.getByRole("button", { name: new RegExp(cancelledApplication.company) })).toBeVisible();
  });
});
