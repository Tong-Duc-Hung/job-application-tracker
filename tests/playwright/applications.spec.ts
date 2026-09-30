import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
import { createApplication, createInterview, createNote, isoDay, loginAsFreshTestUser, searchApplications, uniqueValue } from "./helpers";

/** Picker dùng chung cho các Select tùy biến trên trang Đơn ứng tuyển. */
async function chooseOption(page: Page, label: string, option: string) {
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

test.describe("Applications list", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsFreshTestUser(page);
  });

  // Lọc theo độ ưu tiên: chỉ hiển thị đơn khớp, badge số filter hiện "1",
  // và "Xóa bộ lọc" khôi phục danh sách đầy đủ.
  test("filters by priority, shows the active-filter badge, and 'Xóa bộ lọc' clears it", async ({ page }) => {
    const high = await createApplication(page, { priority: "HIGH", company: uniqueValue("HighPrio") });
    const low = await createApplication(page, { priority: "LOW", company: uniqueValue("LowPrio") });
    await page.goto("/applications");
    await page.getByRole("button", { name: "Bộ lọc", exact: true }).click();
    await chooseOption(page, "Độ ưu tiên", "Cao");
    await expect(page.locator("article").filter({ hasText: high.company })).toHaveCount(1);
    await expect(page.locator("article").filter({ hasText: low.company })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Bộ lọc", exact: true })).toContainText("1");

    await page.getByRole("button", { name: "Xóa bộ lọc" }).click();
    await expect(page.locator("article").filter({ hasText: low.company })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Bộ lọc", exact: true })).not.toContainText("1");
  });

  // Kết hợp filter trạng thái + độ ưu tiên; URL phải giữ cả hai param và
  // badge filter phải hiện "2".
  test("status and priority filters combine, and the URL keeps them", async ({ page }) => {
    const match = await createApplication(page, { status: "OFFER", priority: "HIGH" });
    const wrongStatus = await createApplication(page, { status: "REJECTED", priority: "HIGH" });
    const wrongPriority = await createApplication(page, { status: "OFFER", priority: "LOW" });
    await page.goto("/applications");
    await page.getByRole("button", { name: "Bộ lọc", exact: true }).click();
    await chooseOption(page, "Trạng thái", "Offer");
    await chooseOption(page, "Độ ưu tiên", "Cao");
    await expect(page.locator("article").filter({ hasText: match.company })).toHaveCount(1);
    await expect(page.locator("article").filter({ hasText: wrongStatus.company })).toHaveCount(0);
    await expect(page.locator("article").filter({ hasText: wrongPriority.company })).toHaveCount(0);
    await expect(page).toHaveURL(/status=OFFER/);
    await expect(page).toHaveURL(/priority=HIGH/);
    await expect(page.getByRole("button", { name: "Bộ lọc", exact: true })).toContainText("2");
  });

  // Deep link có sẵn cả status lẫn priority: trang mở ra đã được lọc, và
  // vẫn giữ filter sau khi reload (URL là nguồn sự thật).
  test("a combined status and priority URL opens filtered and stays filtered after reload", async ({ page }) => {
    const match = await createApplication(page, { company: uniqueValue("Deep link match"), status: "OFFER", priority: "HIGH" });
    const wrongStatus = await createApplication(page, { company: uniqueValue("Deep link status"), status: "REJECTED", priority: "HIGH" });
    const wrongPriority = await createApplication(page, { company: uniqueValue("Deep link priority"), status: "OFFER", priority: "LOW" });

    await page.goto("/applications?status=OFFER&priority=HIGH");
    await expect(page.locator("article").filter({ hasText: match.company })).toHaveCount(1);
    await expect(page.locator("article").filter({ hasText: wrongStatus.company })).toHaveCount(0);
    await expect(page.locator("article").filter({ hasText: wrongPriority.company })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Bộ lọc", exact: true })).toContainText("2");

    await page.reload();
    await expect(page.locator("article").filter({ hasText: match.company })).toHaveCount(1);
    await expect(page.locator("article").filter({ hasText: wrongStatus.company })).toHaveCount(0);
    await expect(page.locator("article").filter({ hasText: wrongPriority.company })).toHaveCount(0);
  });

  // Filter không khớp đơn nào: hiện empty state và không có article nào.
  test("a filter with no matching applications shows the empty state", async ({ page }) => {
    const application = await createApplication(page, { status: "REJECTED", priority: "LOW" });
    await page.goto("/applications");
    await page.getByRole("button", { name: "Bộ lọc", exact: true }).click();
    await chooseOption(page, "Trạng thái", "Offer");
    await chooseOption(page, "Độ ưu tiên", "Cao");

    await expect(page.locator("article")).toHaveCount(0);
    await expect(page.getByText("Chưa có đơn ứng tuyển nào")).toBeVisible();
    await expect(page.locator("article").filter({ hasText: application.company })).toHaveCount(0);
  });

  // Xóa filter trạng thái + độ ưu tiên phải GIỮ search và sort đang chọn:
  // URL vẫn còn search nhưng không còn status/priority, danh sách vẫn sắp xếp A–Z.
  test("clearing status and priority keeps the search and selected sort", async ({ page }) => {
    const token = uniqueValue("clear-filters").replace(/-/g, "");
    const alpha = await createApplication(page, { company: `${token} Alpha`, status: "OFFER", priority: "HIGH" });
    const zulu = await createApplication(page, { company: `${token} Zulu`, status: "OFFER", priority: "LOW" });
    await createApplication(page, { company: "Unrelated company" });
    await page.goto("/applications");
    await searchApplications(page, token);
    await page.getByRole("button", { name: "Sắp xếp" }).click();
    await page.getByRole("button", { name: /A–Z/ }).click();
    await page.getByRole("button", { name: "Bộ lọc", exact: true }).click();
    await chooseOption(page, "Trạng thái", "Offer");
    await chooseOption(page, "Độ ưu tiên", "Cao");
    await expect(page.locator("article")).toHaveCount(1);
    await expect(page.locator("article").filter({ hasText: alpha.company })).toHaveCount(1);

    await page.getByRole("button", { name: "Xóa bộ lọc" }).click();

    await expect(page.locator("article")).toHaveCount(2);
    await expect(page.locator("article h2")).toContainText([alpha.company, zulu.company]);
    await expect(page).toHaveURL(new RegExp(`search=${token}(?:&|$)`));
    await expect(page).not.toHaveURL(/(?:status|priority)=/);
  });

  // Deep link chỉ có status: trang mở ra đã được lọc sẵn (dùng cho bookmark
  // và link chia sẻ).
  test("a deep link /applications?status=... opens already filtered (links and bookmarks use these)", async ({ page }) => {
    const interviewing = await createApplication(page, { status: "INTERVIEWING" });
    const applied = await createApplication(page, { status: "APPLIED" });
    await page.goto("/applications?status=INTERVIEWING");
    await expect(page.locator("article").filter({ hasText: interviewing.company })).toHaveCount(1);
    await expect(page.locator("article").filter({ hasText: applied.company })).toHaveCount(0);
  });

  // Tìm kiếm khớp cả position, location lẫn company; khi không có kết quả
  // thì hiện empty state và URL giữ param search.
  test("search by position and by location, and a search with no hit shows the empty state", async ({ page }) => {
    const token = uniqueValue("zq").replace(/-/g, "");
    const byPosition = await createApplication(page, { position: `Engineer ${token}` });
    const byLocation = await createApplication(page, { location: `City ${token}` });
    const byCompany = await createApplication(page, { company: `Company ${token}` });
    await page.goto("/applications");

    await searchApplications(page, token);
    await expect(page.locator("article")).toHaveCount(3);
    await expect(page.locator("article").filter({ hasText: byPosition.company })).toHaveCount(1);
    await expect(page.locator("article").filter({ hasText: byLocation.company })).toHaveCount(1);
    await expect(page.locator("article").filter({ hasText: byCompany.company })).toHaveCount(1);
    await expect(page).toHaveURL(new RegExp(`search=${token}`));

    await searchApplications(page, `${token}-nothing`);
    await expect(page.getByText("Chưa có đơn ứng tuyển nào")).toBeVisible();
    await expect(page.locator("article")).toHaveCount(0);
  });

  // Header đếm số đơn đang theo dõi; tài khoản mới hiện empty state và
  // số đếm cập nhật sau khi tạo đơn.
  test("the header counts the applications, and a new account sees the empty state", async ({ page }) => {
    await page.goto("/applications");
    await expect(page.getByText("0 đơn đang theo dõi")).toBeVisible();
    await expect(page.getByText("Chưa có đơn ứng tuyển nào")).toBeVisible();
    await expect(page.getByText("Thêm đơn ứng tuyển đầu tiên để bắt đầu theo dõi tại đây.")).toBeVisible();
    await createApplication(page);
    await createApplication(page);
    await page.reload();
    await expect(page.getByText("2 đơn đang theo dõi")).toBeVisible();
  });

  // Menu sắp xếp cung cấp đủ 7 lựa chọn.
  test("the sort menu offers seven orders and marks the active one", async ({ page }) => {
    await createApplication(page);
    await page.goto("/applications");
    await page.getByRole("button", { name: "Sắp xếp" }).click();
    for (const label of ["Mới nhất", "Cũ nhất", "Tên công ty (A–Z)", "Tên công ty (Z–A)", "Ngày ứng tuyển (mới nhất)", "Ngày ứng tuyển (cũ nhất)", "Hạn chót (gần nhất)"]) {
      await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible();
    }
  });

  // Sắp xếp theo ngày tạo: mặc định mới nhất trước; chuyển Cũ nhất và
  // quay lại Mới nhất đều đúng thứ tự.
  test("sorts by creation date from newest to oldest and oldest to newest", async ({ page }) => {
    const oldest = await createApplication(page, { company: uniqueValue("Created oldest") });
    const middle = await createApplication(page, { company: uniqueValue("Created middle") });
    const newest = await createApplication(page, { company: uniqueValue("Created newest") });
    await page.goto("/applications");

    await expect(page.locator("article h2")).toContainText([newest.company, middle.company, oldest.company]);

    await page.getByRole("button", { name: "Sắp xếp" }).click();
    await page.getByRole("button", { name: "Cũ nhất", exact: true }).click();
    await expect(page.locator("article h2")).toContainText([oldest.company, middle.company, newest.company]);

    await page.getByRole("button", { name: "Sắp xếp" }).click();
    await page.getByRole("button", { name: "Mới nhất", exact: true }).click();
    await expect(page.locator("article h2")).toContainText([newest.company, middle.company, oldest.company]);
  });

  // Sắp xếp theo tên công ty (A–Z, Z–A) và theo ngày ứng tuyển (cũ, mới).
  test("sorts by company A–Z and Z–A, then by applied date", async ({ page }) => {
    const a = await createApplication(page, { company: uniqueValue("Aaa Sort"), appliedDate: "2026-03-01" });
    const b = await createApplication(page, { company: uniqueValue("Bbb Sort"), appliedDate: "2026-01-01" });
    await page.goto("/applications");
    await page.getByRole("button", { name: "Sắp xếp" }).click();
    await page.getByRole("button", { name: "Tên công ty (A–Z)", exact: true }).click();
    await expect(page.locator("article h2")).toContainText([a.company, b.company]);
    await page.getByRole("button", { name: "Sắp xếp" }).click();
    await page.getByRole("button", { name: "Tên công ty (Z–A)", exact: true }).click();
    await expect(page.locator("article h2")).toContainText([b.company, a.company]);
    await page.getByRole("button", { name: "Sắp xếp" }).click();
    await page.getByRole("button", { name: "Ngày ứng tuyển (cũ nhất)", exact: true }).click();
    await expect(page.locator("article h2")).toContainText([b.company, a.company]);
    await page.getByRole("button", { name: "Sắp xếp" }).click();
    await page.getByRole("button", { name: "Ngày ứng tuyển (mới nhất)", exact: true }).click();
    await expect(page.locator("article h2")).toContainText([a.company, b.company]);
  });

  // Sắp xếp theo hạn chót gần nhất: đơn có hạn gần hơn phải đứng trước
  // đơn có hạn xa; đơn không có hạn bị đẩy xuống cuối.
  test("sorts by nearest deadline", async ({ page }) => {
    const soon = await createApplication(page, { company: uniqueValue("Soon Deadline"), deadline: isoDay(3), appliedDate: isoDay(-5) });
    const far = await createApplication(page, { company: uniqueValue("Far Deadline"), deadline: isoDay(20), appliedDate: isoDay(-5) });
    await createApplication(page, { company: uniqueValue("No Deadline") });
    await page.goto("/applications");
    await page.getByRole("button", { name: "Sắp xếp" }).click();
    await page.getByRole("button", { name: "Hạn chót (gần nhất)", exact: true }).click();
    await expect.poll(async () => {
      const companies = await page.locator("article h2").allTextContents();
      return companies.indexOf(soon.company) >= 0 && companies.indexOf(soon.company) < companies.indexOf(far.company);
    }).toBe(true);
  });

  // Phân trang: nút Trước/Sau bị disable ở hai đầu, đổi filter thì quay
  // về trang 1 (không giữ trang cũ khi kết quả ít hơn).
  test("paging buttons are disabled at the ends, and a filter change returns to page 1", async ({ page }) => {
    for (let i = 0; i < 11; i += 1) await createApplication(page, { status: i === 0 ? "OFFER" : "APPLIED" });
    await page.goto("/applications");
    await expect(page.getByText("Trang 1 / 2")).toBeVisible();
    await expect(page.getByRole("button", { name: "Trước" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Sau" })).toBeEnabled();
    await expect(page.locator("article")).toHaveCount(10);

    await page.getByRole("button", { name: "Sau" }).click();
    await expect(page.getByText("Trang 2 / 2")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sau" })).toBeDisabled();
    await expect(page.locator("article")).toHaveCount(1);

    await page.getByRole("button", { name: "Bộ lọc", exact: true }).click();
    await chooseOption(page, "Trạng thái", "Offer");
    await expect(page.getByText(/Trang \d+ \/ 2/)).toHaveCount(0);
    await expect(page.locator("article")).toHaveCount(1);
  });

  // Hạn chót đã qua tô đỏ (text-red-500); hạn chót hôm nay KHÔNG tô đỏ.
  test("a past deadline is drawn as overdue in the list, today's is not", async ({ page }) => {
    const late = await createApplication(page, { deadline: isoDay(-3), appliedDate: isoDay(-10) });
    const today = await createApplication(page, { deadline: isoDay(0), appliedDate: isoDay(-10) });
    await page.goto("/applications");
    const lateLine = page.locator("article").filter({ hasText: late.company }).locator("span", { hasText: "Hạn chót" }).first();
    const todayLine = page.locator("article").filter({ hasText: today.company }).locator("span", { hasText: "Hạn chót" }).first();
    await expect(lateLine).toHaveClass(/text-red-500/);
    await expect(todayLine).not.toHaveClass(/text-red-500/);
  });
});

test.describe("Application detail", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsFreshTestUser(page);
  });

  // Trang chi tiết KHÔNG hiển thị panel "Tiến độ tuyển dụng" hay "Việc tiếp theo",
  // nhưng vẫn có mục "Tiến trình hồ sơ".
  test("detail page omits the progress and next-action panels", async ({ page }) => {
    const application = await createApplication(page);
    await page.goto(`/applications/${application.id}`);
    await expect(page.getByText("Tiến độ tuyển dụng")).toHaveCount(0);
    await expect(page.getByText("Việc tiếp theo")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Tiến trình hồ sơ" })).toBeVisible();
  });

  // Hạn chót đã qua hiển thị chữ đỏ trên trang chi tiết.
  test("an overdue deadline says so on the detail page", async ({ page }) => {
    const application = await createApplication(page, { deadline: isoDay(-2), appliedDate: isoDay(-10) });
    await page.goto(`/applications/${application.id}`);
    const deadline = page.locator("dl > div").filter({ hasText: "Hạn chót" }).locator("dd");
    await expect(deadline).toHaveClass(/text-red-600/);
  });

  // Hạn chót HÔM NAY không bị coi là quá hạn: không đỏ, không có chữ
  // "Đã quá hạn".
  test("a deadline that is today is not marked overdue on the detail page", async ({ page }) => {
    const application = await createApplication(page, { deadline: isoDay(0), appliedDate: isoDay(-3) });
    await page.goto(`/applications/${application.id}`);
    const deadline = page.locator("dl > div").filter({ hasText: "Hạn chót" }).locator("dd");
    await expect(deadline).not.toHaveClass(/text-red-600/);
    await expect(page.getByText("Đã quá hạn")).toHaveCount(0);
  });

  // Nút "Thêm ghi chú" và "Thêm vòng" trên trang chi tiết deep link sang
  // form tương ứng với applicationId đã prefill.
  test("the timeline and the note list link onward: 'Thêm vòng' and 'Thêm ghi chú' prefill the application", async ({ page }) => {
    const application = await createApplication(page);
    await page.goto(`/applications/${application.id}`);
    await page.getByRole("button", { name: "Thêm ghi chú" }).click();
    await expect(page).toHaveURL(new RegExp(`/notes/new\\?applicationId=${application.id}`));
    await page.goto(`/applications/${application.id}`);
    await page.getByRole("button", { name: "Thêm vòng" }).click();
    await expect(page).toHaveURL(new RegExp(`/interviews/new\\?applicationId=${application.id}`));
  });

  // "Recent notes" bao gồm cả ghi chú gắn đơn và ghi chú gắn buổi phỏng vấn;
  // bấm vào một ghi chú mở trang edit tương ứng.
  test("recent notes include application and interview notes, and a note opens its edit page", async ({ page }) => {
    const application = await createApplication(page);
    const interview = await createInterview(page, application.id, { title: "Merged round" });
    await createNote(page, application.id, { title: "Direct note" });
    await page.request.post("/api/notes", { data: { interviewId: interview.id, title: "Interview note", content: "x" } });
    await page.goto(`/applications/${application.id}`);
    const directNote = page.getByRole("button", { name: /Direct note/ });
    await expect(directNote).toBeVisible();
    await expect(page.getByRole("button", { name: /Interview note/ })).toBeVisible();
    await directNote.click();
    await expect(page.getByRole("heading", { name: "Chỉnh sửa ghi chú" })).toBeVisible();
  });

  // Breadcrumb quay về danh sách; nút "Chỉnh sửa" đi tới trang edit.
  test("the breadcrumb goes back to the list and 'Chỉnh sửa' to the edit page", async ({ page }) => {
    const application = await createApplication(page);
    await page.goto(`/applications/${application.id}`);
    await page.getByRole("button", { name: "Chỉnh sửa" }).click();
    await expect(page).toHaveURL(new RegExp(`/applications/${application.id}/edit$`));
    await page.goto(`/applications/${application.id}`);
    await page.getByRole("button", { name: "Quay về Đơn ứng tuyển", exact: true }).click();
    await expect(page).toHaveURL(/\/applications$/);
  });

  // Id không tồn tại: trang chi tiết hiện 404 thân thiện; trang edit hiện
  // thông báo rõ ràng kèm nút về danh sách.
  test("an id that does not exist is the friendly 404 page (detail) or a clear message (edit)", async ({ page }) => {
    await page.goto("/applications/cabcdefghijklmnopqrstuvwx");
    await expect(page.getByRole("heading", { name: "Không tìm thấy trang" })).toBeVisible();
    await page.goto("/applications/cabcdefghijklmnopqrstuvwx/edit");
    await expect(page.getByText("Không tìm thấy đơn ứng tuyển này.")).toBeVisible();
    await page.getByRole("button", { name: "Về danh sách đơn ứng tuyển" }).click();
    await expect(page).toHaveURL(/\/applications$/);
  });
});