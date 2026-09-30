import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
import { createApplication, createInterview, createNote, isoDay, isoLocal, loginAsFreshTestUser, repeated, searchApplications, toast, uniqueValue } from "./helpers";

/**
 * Các luồng tạo/sửa/xóa đơn, xác thực biểu mẫu và sửa nhanh kinh nghiệm.
 * Kiểm thử danh sách, bộ lọc, phân trang và trang chi tiết nằm trong applications.spec.ts.
 *
 * "Trạng thái" và "Độ ưu tiên" là Select tùy biến: nhấn nút có nhãn rồi chọn giá trị.
 */

async function chooseOption(page: Page, label: string, option: string) {
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

test.describe("Create form", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsFreshTestUser(page);
  });

  // Happy path: điền MỌI trường của form tạo đơn, xác nhận toast + card
  // trong list + trang chi tiết đều hiển thị đúng dữ liệu đã lưu.
  test("saves every field and the detail page shows them back", async ({ page }) => {
    const company = uniqueValue("Full Form Co");
    await page.goto("/applications/new");
    await expect(page.getByRole("heading", { name: "Thêm đơn ứng tuyển" })).toBeVisible();

    await page.getByLabel(/^Công ty/).fill(company);
    await page.getByLabel(/^Vị trí/).fill("Senior Tester");
    await page.getByLabel("Địa điểm").fill("Đà Nẵng");
    await page.getByLabel("Mức lương").fill("30-40 triệu");
    await page.getByLabel("Link tin tuyển dụng").fill("https://jobs.example.com/senior-tester");
    await chooseOption(page, "Trạng thái", "Phỏng vấn");
    await chooseOption(page, "Độ ưu tiên", "Cao");
    await page.getByLabel(/^Ngày ứng tuyển/).fill("2026-08-01");
    await page.getByLabel("Hạn chót").fill("2026-12-31");
    await page.getByLabel("Nội dung kinh nghiệm").fill("Ôn lại SQL trước vòng hai.");
    await page.getByRole("button", { name: "Lưu" }).click();

    await expect(toast(page, "Đã tạo đơn ứng tuyển")).toBeVisible();
    await expect(page).toHaveURL(/\/applications$/);
    const card = page.locator("article").filter({ hasText: company });
    await expect(card).toContainText("Senior Tester");
    await expect(card).toContainText("Phỏng vấn");
    await expect(card).toContainText("Cao");
    await expect(card).toContainText("Đà Nẵng");
    await expect(card).toContainText("0 vòng");

    await card.click();
    await expect(page.getByRole("heading", { name: "Senior Tester" })).toBeVisible();
    const main = page.locator("main").first(); // Bố cục có main ngoài; trang chi tiết lồng thêm một main.
    await expect(main).toContainText(company);
    await expect(main).toContainText("Đà Nẵng");
    await expect(main).toContainText("30-40 triệu");
    await expect(main).toContainText("Kinh nghiệm rút ra");
    await expect(main).toContainText("Ôn lại SQL trước vòng hai.");
    await expect(main.getByRole("link", { name: /Mở tin tuyển dụng/ }).first()).toHaveAttribute("href", "https://jobs.example.com/senior-tester");
  });

  // Form mở ra với giá trị mặc định hợp lý: status "Đã ứng tuyển",
  // priority "Trung bình", ngày ứng tuyển = hôm nay, hạn chót để trống.
  test("the form starts with sensible defaults: status 'Đã ứng tuyển', priority 'Trung bình', applied today", async ({ page }) => {
    await page.goto("/applications/new");
    await expect(page.getByRole("button", { name: "Trạng thái", exact: true })).toContainText("Đã ứng tuyển");
    await expect(page.getByRole("button", { name: "Độ ưu tiên", exact: true })).toContainText("Trung bình");
    await expect(page.getByLabel(/^Ngày ứng tuyển/)).toHaveValue(isoDay(0));
    await expect(page.getByLabel("Hạn chót")).toHaveValue("");
  });

  // Select trạng thái liệt kê đủ 9 mục theo đúng thứ tự; select độ ưu tiên
  // liệt kê 3 mức.
  test("the select lists all nine statuses and all three priorities", async ({ page }) => {
    await page.goto("/applications/new");
    await page.getByRole("button", { name: "Trạng thái", exact: true }).click();
    await expect(page.getByRole("option")).toHaveText(["Đã ứng tuyển", "Đang xét duyệt", "Phỏng vấn", "Chờ kết quả", "Offer", "Đã nhận việc", "Bị từ chối", "Đã rút đơn", "Quá hạn"]);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Độ ưu tiên", exact: true }).click();
    await expect(page.getByRole("option")).toHaveText(["Thấp", "Trung bình", "Cao"]);
  });

  // Người dùng có thể chọn thủ công trạng thái "Quá hạn" dù không có hạn chót.
  test("a user can manually select the expired status without a deadline", async ({ page }) => {
    const company = uniqueValue("Manual Expired");
    await page.goto("/applications/new");
    await page.getByLabel(/^Công ty/).fill(company);
    await page.getByLabel(/^Vị trí/).fill("QA Engineer");
    await chooseOption(page, "Trạng thái", "Quá hạn");
    await page.getByRole("button", { name: "Lưu" }).click();
    await expect(toast(page, "Đã tạo đơn ứng tuyển")).toBeVisible();
    await expect(page.locator("article").filter({ hasText: company }).getByText("Quá hạn", { exact: true })).toBeVisible();
  });

  // Hạn chót đã qua tự động chuyển trạng thái sang "Quá hạn" — TRỪ các trạng
  // thái kết thúc (Offer, Đã nhận việc, Bị từ chối, Đã rút đơn) giữ nguyên.
  test("past deadlines expire automatically except for offers and final outcomes", async ({ page }) => {
    const overdueCompany = uniqueValue("Auto Expired");
    const noDeadlineCompany = uniqueValue("No Deadline");
    await createApplication(page, { company: overdueCompany, deadline: isoDay(-1), appliedDate: isoDay(-5) });
    await createApplication(page, { company: noDeadlineCompany });
    const excludedStatuses = [
      ["OFFER", "Offer"],
      ["ACCEPTED", "Đã nhận việc"],
      ["REJECTED", "Bị từ chối"],
      ["WITHDRAWN", "Đã rút đơn"],
    ] as const;
    const excludedCompanies = await Promise.all(excludedStatuses.map(async ([status]) => {
      const company = uniqueValue(`Deadline ${status}`);
      await createApplication(page, { company, status, deadline: isoDay(-1), appliedDate: isoDay(-5) });
      return company;
    }));
    await page.goto("/applications");
    await expect(page.locator("article").filter({ hasText: overdueCompany }).getByText("Quá hạn", { exact: true })).toBeVisible();
    await expect(page.locator("article").filter({ hasText: noDeadlineCompany }).getByText("Đã ứng tuyển", { exact: true })).toBeVisible();
    for (const [index, [, label]] of excludedStatuses.entries()) {
      await expect(page.locator("article").filter({ hasText: excludedCompanies[index] }).getByText(label, { exact: true })).toBeVisible();
    }
  });

  // Hạn chót TRƯỚC ngày ứng tuyển: hiện lỗi inline, giữ nguyên URL /new, và
  // KHÔNG gửi request POST nào.
  test("a deadline before the applied date is refused with an inline message and nothing is saved", async ({ page }) => {
    let posts = 0;
    page.on("request", (req) => {
      if (req.method() === "POST" && req.url().includes("/api/applications")) posts += 1;
    });
    await page.goto("/applications/new");
    await page.getByLabel(/^Công ty/).fill(uniqueValue("Bad Dates"));
    await page.getByLabel(/^Vị trí/).fill("Tester");
    await page.getByLabel(/^Ngày ứng tuyển/).fill("2026-08-10");
    await page.getByLabel("Hạn chót").fill("2026-08-01");
    await page.getByRole("button", { name: "Lưu" }).click();
    await expect(page.getByText("Hạn chót không được trước ngày ứng tuyển")).toBeVisible();
    await expect(page).toHaveURL(/\/applications\/new/);
    expect(posts).toBe(0);
  });

  // Link tin tuyển dụng không phải http(s) (ví dụ ftp://) bị từ chối kèm
  // thông báo inline.
  test("a job link that is not http(s) is refused with an inline message", async ({ page }) => {
    await page.goto("/applications/new");
    await page.getByLabel(/^Công ty/).fill(uniqueValue("Bad Link"));
    await page.getByLabel(/^Vị trí/).fill("Tester");
    await page.getByLabel("Link tin tuyển dụng").fill("ftp://example.com/job");
    await page.getByRole("button", { name: "Lưu" }).click();
    await expect(page.getByText("Link tin tuyển dụng phải bắt đầu bằng http:// hoặc https://")).toBeVisible();
    await expect(page).toHaveURL(/\/applications\/new/);
  });

  // Submit form trống: hiện thông báo lỗi bắt buộc cho từng trường và
  // không gửi request nào.
  test("submitting an empty form shows the required-field messages and sends nothing", async ({ page }) => {
    let posts = 0;
    page.on("request", (req) => {
      if (req.method() === "POST" && req.url().includes("/api/applications")) posts += 1;
    });
    await page.goto("/applications/new");
    await page.getByLabel(/^Ngày ứng tuyển/).fill(""); // Ngày mặc định là hôm nay nên cần xóa để kiểm tra trường hợp trống.
    await page.getByRole("button", { name: "Lưu" }).click();
    await expect(page.getByText("Vui lòng nhập tên công ty")).toBeVisible();
    await expect(page.getByText("Vui lòng nhập vị trí")).toBeVisible();
    // Ngày trống không đạt quy tắc định dạng trước, nên thông báo .min(1) không xuất hiện.
    await expect(page.getByText("Ngày phải có định dạng YYYY-MM-DD")).toBeVisible();
    await expect(page).toHaveURL(/\/applications\/new/);
    expect(posts).toBe(0);
  });

  // Breadcrumb "Đơn ứng tuyển" quay về list mà không lưu gì.
  test("the breadcrumb returns to the list without saving", async ({ page }) => {
    await page.goto("/applications/new");
    await page.getByLabel(/^Công ty/).fill(uniqueValue("Never Saved"));
    await page.getByRole("button", { name: "Đơn ứng tuyển", exact: true }).click();
    await expect(page).toHaveURL(/\/applications$/);
    await expect(page.getByText("Chưa có đơn ứng tuyển nào")).toBeVisible();
  });

  // Nút "Hủy" cũng quay về list và không lưu gì.
  test("the Cancel button ('Hủy') returns to the list without saving", async ({ page }) => {
    await page.goto("/applications/new");
    await page.getByLabel(/^Công ty/).fill(uniqueValue("Never Saved"));
    await page.getByRole("button", { name: "Hủy" }).click();
    await expect(page).toHaveURL(/\/applications$/);
    await expect(page.getByText("Chưa có đơn ứng tuyển nào")).toBeVisible();
  });

  // Ô kinh nghiệm hiển thị hint giới hạn 2.000 ký tự.
  test("the experience box explains its 2000-character limit", async ({ page }) => {
    await page.goto("/applications/new");
    await expect(page.getByText("Tối đa 2.000 ký tự")).toBeVisible();
  });
});

test.describe("Edit and delete", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsFreshTestUser(page);
  });

  // Sửa status + priority: cập nhật được phản chiếu trên trang chi tiết và
  // trên card ở list.
  test("editing the status and priority is reflected on the detail page and in the list", async ({ page }) => {
    const application = await createApplication(page, { status: "APPLIED", priority: "LOW" });
    await page.goto(`/applications/${application.id}/edit`);
    await expect(page.getByRole("heading", { name: "Thông tin đơn ứng tuyển" })).toBeVisible();
    await expect(page.getByLabel(/^Công ty/)).toHaveValue(application.company);
    await chooseOption(page, "Trạng thái", "Offer");
    await chooseOption(page, "Độ ưu tiên", "Cao");
    await page.getByRole("button", { name: "Lưu" }).click();

    await expect(toast(page, "Đã cập nhật đơn ứng tuyển")).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/applications/${application.id}$`));
    await expect(page.locator("main").first()).toContainText("Offer");
    await expect(page.locator("main").first()).toContainText("Cao");

    await page.goto("/applications");
    const card = page.locator("article").filter({ hasText: application.company });
    await expect(card).toContainText("Offer");
    await expect(card).toContainText("Cao");
  });

  // Trang edit prefill đầy đủ mọi trường đã lưu.
  test("the edit form is pre-filled with every stored value", async ({ page }) => {
    const application = await createApplication(page, { location: "Huế", salary: "20M", jobUrl: "https://x.example/1", deadline: "2026-12-31", experience: "Đã học được nhiều" });
    await page.goto(`/applications/${application.id}/edit`);
    await expect(page.getByLabel("Địa điểm")).toHaveValue("Huế");
    await expect(page.getByLabel("Mức lương")).toHaveValue("20M");
    await expect(page.getByLabel("Link tin tuyển dụng")).toHaveValue("https://x.example/1");
    await expect(page.getByLabel(/^Ngày ứng tuyển/)).toHaveValue("2026-08-01");
    await expect(page.getByLabel("Hạn chót")).toHaveValue("2026-12-31");
    await expect(page.getByLabel("Nội dung kinh nghiệm")).toHaveValue("Đã học được nhiều");
  });

  // Xóa một trường optional (địa điểm) thực sự clear giá trị: trang chi tiết
  // không còn chứa text cũ.
  test("clearing an optional field really clears it", async ({ page }) => {
    const application = await createApplication(page, { location: "Huế" });
    await page.goto(`/applications/${application.id}/edit`);
    await page.getByLabel("Địa điểm").fill("");
    await page.getByRole("button", { name: "Lưu" }).click();
    await expect(page).toHaveURL(new RegExp(`/applications/${application.id}$`));
    await expect(page.locator("main").first()).not.toContainText("Huế");
  });

  // Hủy edit: không lưu giá trị đã thay đổi; trang chi tiết vẫn hiển thị cũ.
  test("cancelling an edit keeps the old values", async ({ page }) => {
    const application = await createApplication(page, { position: "Original Position" });
    await page.goto(`/applications/${application.id}/edit`);
    await page.getByLabel(/^Vị trí/).fill("Changed But Not Saved");
    await page.getByRole("button", { name: "Hủy" }).click();
    await expect(page).toHaveURL(new RegExp(`/applications/${application.id}$`));
    await expect(page.getByRole("heading", { name: "Original Position" })).toBeVisible();
  });

  // Trang edit có breadcrumb, side summary (aside) và shortcut "Xem hồ sơ
  // chi tiết" đi tới trang chi tiết.
  test("the edit page has breadcrumbs, a side summary and a shortcut to the detail page", async ({ page }) => {
    const application = await createApplication(page, { position: "Summary Position" });
    await page.goto(`/applications/${application.id}/edit`);
    await expect(page.getByText("Chỉnh sửa", { exact: true })).toBeVisible();
    await expect(page.locator("main aside")).toContainText("Summary Position");
    await page.getByRole("button", { name: "Xem hồ sơ chi tiết" }).click();
    await expect(page).toHaveURL(new RegExp(`/applications/${application.id}$`));
  });

  // Xóa từ trang chi tiết: dialog xác nhận có thể hủy (đơn còn), sau đó
  // xác nhận xóa — toast, redirect về list, card biến mất, API trả 404.
  test("deleting from the detail page asks first, then removes the application", async ({ page }) => {
    const application = await createApplication(page);
    await page.goto(`/applications/${application.id}`);
    await page.getByRole("button", { name: "Xóa", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Xóa đơn ứng tuyển" })).toBeVisible();
    await expect(dialog).toContainText("xóa vĩnh viễn");

    await dialog.getByRole("button", { name: "Hủy" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`/applications/${application.id}$`));

    await page.getByRole("button", { name: "Xóa", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Xóa", exact: true }).click();
    await expect(toast(page, "Đã xóa đơn ứng tuyển")).toBeVisible();
    await expect(page).toHaveURL(/\/applications$/);
    await expect(page.locator("article").filter({ hasText: application.company })).toHaveCount(0);
    expect((await page.request.get(`/api/applications/${application.id}`)).status()).toBe(404);
  });

  // Xóa đơn ứng tuyển kéo theo các interview và note liên quan bị xóa
  // (cascade): URL interview cũ trả 404.
  test("deleting an application also removes its interviews and notes from the rest of the app", async ({ page }) => {
    const application = await createApplication(page);
    const interview = await createInterview(page, application.id, { title: "Vanishing round" });
    await createNote(page, application.id, { title: "Vanishing note" });
    await page.goto("/applications");
    await searchApplications(page, application.company);
    const card = page.locator("article").filter({ hasText: application.company });
    await expect(card).toContainText("1 vòng");
    await expect(card).toContainText("1 ghi chú");
    await card.getByLabel("Xóa").click();
    await page.getByRole("dialog").getByRole("button", { name: "Xóa", exact: true }).click();
    await expect(page.locator("article").filter({ hasText: application.company })).toHaveCount(0);

    await page.goto(`/interviews/${interview.id}`);
    await expect(page.getByRole("heading", { name: "Không tìm thấy trang" })).toBeVisible();
  });

  // Dialog xác nhận xóa từ list có nêu tên vị trí + công ty, và cảnh báo
  // cascade các lịch phỏng vấn/ghi chú liên quan.
  test("the list's delete confirmation names the position and company", async ({ page }) => {
    const application = await createApplication(page, { position: "Named Position" });
    await page.goto("/applications");
    const card = page.locator("article").filter({ hasText: application.company });
    await card.getByLabel("Xóa").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Named Position");
    await expect(dialog).toContainText(application.company);
    await expect(dialog).toContainText("các lịch phỏng vấn và ghi chú liên quan");
    await dialog.getByRole("button", { name: "Hủy" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(card).toHaveCount(1);
  });
});

test.describe("Experience quick-edit", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsFreshTestUser(page);
  });

  // Nút "Sửa kinh nghiệm" xuất hiện cho đơn REJECTED/WITHDRAWN (hoặc đã có
  // kinh nghiệm); lưu thành công và nội dung hiện trên trang chi tiết.
  test("is offered for rejected and withdrawn applications, saves, and shows on the detail page", async ({ page }) => {
    const application = await createApplication(page, { status: "REJECTED" });
    await page.goto("/applications");
    await searchApplications(page, application.company);
    const card = page.locator("article").filter({ hasText: application.company });
    await card.getByLabel("Sửa kinh nghiệm").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Sửa kinh nghiệm" })).toBeVisible();
    await dialog.getByLabel("Kinh nghiệm").fill("Thiếu kinh nghiệm về hệ thống phân tán.");
    await dialog.getByRole("button", { name: "Lưu" }).click();
    await expect(toast(page, "Đã lưu kinh nghiệm")).toBeVisible();
    await expect(dialog).toHaveCount(0);

    await card.click();
    await expect(page.locator("main").first()).toContainText("Kinh nghiệm rút ra");
    await expect(page.locator("main").first()).toContainText("Thiếu kinh nghiệm về hệ thống phân tán.");
  });

  // Lưu quick-edit CHỈ đổi experience; các trường khác (status, priority,
  // location, deadline) giữ nguyên.
  test("saving the note changes only the experience — status, dates and the rest stay", async ({ page }) => {
    const application = await createApplication(page, { status: "WITHDRAWN", priority: "HIGH", location: "Huế", deadline: "2026-12-31" });
    await page.goto("/applications");
    await searchApplications(page, application.company);
    await page.locator("article").filter({ hasText: application.company }).getByLabel("Sửa kinh nghiệm").click();
    await page.getByRole("dialog").getByLabel("Kinh nghiệm").fill("Rút vì đổi hướng.");
    await page.getByRole("dialog").getByRole("button", { name: "Lưu" }).click();
    await expect(toast(page, "Đã lưu kinh nghiệm")).toBeVisible();

    const stored = (await (await page.request.get(`/api/applications/${application.id}`)).json()).application;
    expect(stored).toMatchObject({ status: "WITHDRAWN", priority: "HIGH", location: "Huế", experience: "Rút vì đổi hướng." });
    expect(stored.deadline).toBe("2026-12-31T00:00:00.000Z");
  });

  // Hủy dialog quick-edit: giá trị cũ vẫn được giữ trên server.
  test("the dialog can be cancelled ('Hủy') without saving", async ({ page }) => {
    const application = await createApplication(page, { status: "REJECTED", experience: "Old text" });
    await page.goto("/applications");
    await searchApplications(page, application.company);
    await page.locator("article").filter({ hasText: application.company }).getByLabel("Sửa kinh nghiệm").click();
    await page.getByRole("dialog").getByLabel("Kinh nghiệm").fill("Draft that is discarded");
    await page.getByRole("dialog").getByRole("button", { name: "Hủy" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect((await (await page.request.get(`/api/applications/${application.id}`)).json()).application.experience).toBe("Old text");
  });

  // Đơn đang active KHÔNG có experience → không có nút; nhưng khi đã có
  // experience thì nút xuất hiện (cho phép chỉnh sửa tiếp).
  test("is not offered for an active application without experience, but is once it has some", async ({ page }) => {
    const plain = await createApplication(page, { status: "INTERVIEWING" });
    const withText = await createApplication(page, { status: "INTERVIEWING", experience: "Some reflection" });
    await page.goto("/applications");
    await expect(page.locator("article").filter({ hasText: plain.company }).getByLabel("Sửa kinh nghiệm")).toHaveCount(0);
    await expect(page.locator("article").filter({ hasText: withText.company }).getByLabel("Sửa kinh nghiệm")).toHaveCount(1);
  });

  // Textarea kinh nghiệm dừng ở 2.000 ký tự kể cả khi paste 2.100.
  test("the textarea stops at 2000 characters", async ({ page }) => {
    const application = await createApplication(page, { status: "REJECTED" });
    await page.goto("/applications");
    await searchApplications(page, application.company);
    await page.locator("article").filter({ hasText: application.company }).getByLabel("Sửa kinh nghiệm").click();
    const box = page.getByRole("dialog").getByLabel("Kinh nghiệm");
    await box.fill(repeated("x", 2100));
    expect((await box.inputValue()).length).toBe(2000);
  });
});

test.describe("Regression coverage", () => {
  // Lỗi inline khi tên công ty quá dài phải hiển thị bằng tiếng Việt.
  test("the inline error for a too-long company name is in Vietnamese", async ({ page }) => {
    await loginAsFreshTestUser(page);
    await page.goto("/applications/new");
    await page.getByLabel(/^Công ty/).fill(repeated("C", 151));
    await page.getByLabel(/^Vị trí/).fill("Tester");
    await page.getByRole("button", { name: "Lưu" }).click();
    const error = page.locator("form p.text-red-600, form p.text-xs").filter({ hasText: /\S/ }).first();
    await expect(error).toBeVisible();
    await expect(error).toHaveText("Tên công ty tối đa 150 ký tự");
  });
});

test.describe("Hostile and awkward text", () => {
  // XSS: script và HTML trong company/position/experience được render dưới
  // dạng text thuần, không thực thi, không render thẻ.
  test("script and HTML in company, position and experience are shown as plain text and never run", async ({ page }) => {
    await loginAsFreshTestUser(page);
    const dialogs: string[] = [];
    page.on("dialog", async (dialog) => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });
    const company = `<img src=x onerror="alert('company')"> ${uniqueValue("Xss")}`;
    const application = await createApplication(page, {
      company,
      position: `<script>alert('position')</script>`,
      experience: `<svg onload=alert('experience')>`,
      location: `"><b>bold</b>`,
    });

    await page.goto("/applications");
    await expect(page.locator("article").filter({ hasText: application.company })).toBeVisible();
    await page.locator("article").filter({ hasText: application.company }).click();
    await expect(page.getByRole("heading", { name: `<script>alert('position')</script>` })).toBeVisible();
    await expect(page.locator("main").first()).toContainText("<svg onload=alert('experience')>");
    await expect(page.locator("main b")).toHaveCount(0);
    await expect(page.locator("main img[src='x']")).toHaveCount(0);
    expect(dialogs, "no script may execute").toEqual([]);
  });

  // Ký tự tiếng Việt, emoji và tên dài không có khoảng trắng không phá vỡ
  // layout của list (không tràn ngang).
  test("Vietnamese diacritics, emoji and very long unbroken names do not break the list layout", async ({ page }) => {
    await loginAsFreshTestUser(page);
    await createApplication(page, { company: `Công ty Cổ phần Phần mềm 🚀 ${"W".repeat(100)}`, position: "Kỹ sư kiểm thử — Đảm bảo chất lượng" });
    await page.goto("/applications");
    await expect(page.locator("article").filter({ hasText: "Kỹ sư kiểm thử — Đảm bảo chất lượng" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, "the page itself must not scroll sideways").toBeLessThanOrEqual(0);
  });
});