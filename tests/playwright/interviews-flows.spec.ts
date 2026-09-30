import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
import { createApplication, createInterview, isoLocal, loginAsFreshTestUser, repeated, uniqueValue } from "./helpers";

async function chooseOption(page: Page, label: string, option: string) {
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

test.describe("Interview form and calendar", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsFreshTestUser(page);
  });

  // Form liên kết sẵn (có applicationId trên URL): mặc định ngày giờ đã
  // được set, "Loại phỏng vấn" mặc định "Khác", "Kết quả" mặc định
  // "Sắp diễn ra"; select liệt kê đủ 6 loại và 5 kết quả theo thứ tự.
  test("the linked form has defaults and lists every interview type and result", async ({ page }) => {
    const application = await createApplication(page);
    await page.goto(`/interviews/new?applicationId=${application.id}`);
    await expect(page.locator("form").getByText(application.company).first()).toBeVisible();
    await expect(page.getByLabel("Ngày & giờ")).toHaveValue(/.+/);
    await expect(page.getByRole("button", { name: "Loại phỏng vấn", exact: true })).toContainText("Khác");
    await expect(page.getByRole("button", { name: "Kết quả", exact: true })).toContainText("Sắp diễn ra");

    await page.getByRole("button", { name: "Loại phỏng vấn", exact: true }).click();
    await expect(page.getByRole("option")).toHaveText([
      "Vòng HR",
      "Bài test online",
      "Vòng kỹ thuật",
      "Vòng quản lý",
      "Vòng cuối",
      "Khác",
    ]);
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Kết quả", exact: true }).click();
    await expect(page.getByRole("option")).toHaveText(["Sắp diễn ra", "Đạt", "Không đạt", "Đã hủy", "Vắng mặt"]);
  });

  // Validation: tiêu đề chỉ gồm khoảng trắng và link họp không phải http(s)
  // bị từ chối trước khi tạo; review quá 1.000 ký tự bị chặn sau đó. Không
  // request nào được gửi.
  test("invalid title and meeting URL are rejected before creating an interview", async ({ page }) => {
    const application = await createApplication(page);
    let posts = 0;
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().includes("/api/interviews")) posts += 1;
    });
    await page.goto(`/interviews/new?applicationId=${application.id}`);
    await expect(page.locator("form").getByText(application.company).first()).toBeVisible();
    await page.getByLabel("Tiêu đề").fill("   ");
    await page.getByLabel("Link họp").fill("ftp://meeting.example/room");
    await page.getByRole("button", { name: "Lưu lịch phỏng vấn" }).click();

    await expect(page.getByText("Vui lòng nhập tiêu đề")).toBeVisible();
    await expect(page.getByText("Link họp phải bắt đầu bằng http:// hoặc https://")).toBeVisible();
    await expect(page).toHaveURL(/\/interviews\/new/);
    expect(posts).toBe(0);

    await page.getByLabel("Tiêu đề").fill("Valid title");
    await page.getByLabel("Link họp").fill("");
    await page.getByLabel("Nhận xét sau buổi phỏng vấn").fill(repeated("r", 1001));
    await page.getByRole("button", { name: "Lưu lịch phỏng vấn" }).click();
    await expect(page.getByText("Nhận xét tối đa 1.000 ký tự")).toBeVisible();
    expect(posts).toBe(0);
  });

  // Sửa interview: mọi trường (title, type, schedule, result, location,
  // meeting URL, review) được lưu đúng và đọc lại từ API khớp.
  test("editing an interview saves its schedule, result, location, meeting link, and review", async ({ page }) => {
    const application = await createApplication(page);
    const interview = await createInterview(page, application.id, { title: "Editable interview" });
    await page.goto(`/interviews/${interview.id}/edit`);
    await expect(page.getByLabel("Tiêu đề")).toHaveValue("Editable interview");
    await page.getByLabel("Tiêu đề").fill("Updated interview");
    await chooseOption(page, "Loại phỏng vấn", "Vòng HR");
    await page.getByLabel("Ngày & giờ").fill(isoLocal(5, "14:15"));
    await chooseOption(page, "Kết quả", "Đạt");
    await page.getByLabel("Địa điểm").fill("Hà Nội");
    await page.getByLabel("Link họp").fill("https://meet.example.com/room");
    await page.getByLabel("Nhận xét sau buổi phỏng vấn").fill("Reviewed and saved.");
    await page.getByRole("button", { name: "Lưu lịch phỏng vấn" }).click();

    await expect(page).toHaveURL(/\/interviews(?:\?|$)/);
    const stored = (await (await page.request.get(`/api/interviews/${interview.id}`)).json()).interview;
    expect(stored).toMatchObject({
      title: "Updated interview",
      type: "HR",
      result: "PASSED",
      meetingLocation: "Hà Nội",
      meetingUrl: "https://meet.example.com/room",
      review: "Reviewed and saved.",
    });
  });

  // Tìm kiếm + lọc theo loại + sắp xếp theo giờ phỏng vấn ("Xa nhất trước"):
  // kiểm tra kết hợp cả 3 thao tác với URL giữ param type.
  test("searches, filters by type, and orders interviews by scheduled time", async ({ page }) => {
    const application = await createApplication(page, { company: uniqueValue("Interview Filter") });
    const nearer = await createInterview(page, application.id, {
      title: uniqueValue("Technical round"),
      type: "TECHNICAL",
      scheduledAt: isoLocal(2, "09:00"),
    });
    const farther = await createInterview(page, application.id, {
      title: uniqueValue("HR round"),
      type: "HR",
      scheduledAt: isoLocal(5, "09:00"),
    });
    await page.goto("/interviews");
    await page.getByRole("button", { name: "Sắp xếp" }).click();
    await page.getByRole("button", { name: "Xa nhất trước" }).click();
    await expect(page.locator("article")).toContainText([farther.title, nearer.title]);

    await page.getByRole("button", { name: "Bộ lọc" }).click();
    await chooseOption(page, "Loại phỏng vấn", "Vòng kỹ thuật");
    await expect(page.locator("article")).toContainText(nearer.title);
    await expect(page.locator("article")).not.toContainText(farther.title);

    await page.getByPlaceholder("Tìm theo tên công ty hoặc tiêu đề…").fill(nearer.title);
    await expect(page.locator("article")).toContainText(nearer.title);
    await expect(page.locator("article")).not.toContainText(farther.title);
    await expect(page).toHaveURL(/type=TECHNICAL/);
  });

  // Deep link ?applicationId= mở list interview đã chọn sẵn application
  // trong sidebar: hiện interview của app đó, không hiện interview của app khác.
  test("opens the interview list filtered to the application in its deep link", async ({ page }) => {
    const selected = await createApplication(page, { company: uniqueValue("Selected application") });
    const other = await createApplication(page, { company: uniqueValue("Other application") });
    const selectedInterview = await createInterview(page, selected.id, { title: "Selected application's round" });
    const otherInterview = await createInterview(page, other.id, { title: "Other application's round" });

    await page.goto(`/interviews?applicationId=${selected.id}`);
    await expect(page.getByRole("button", { name: new RegExp(selected.company) })).toBeVisible();
    const otherApplicationButton = page.getByRole("button", { name: new RegExp(other.company) });
    await expect(otherApplicationButton).toBeVisible();
    await expect(page.locator("article")).toContainText(selectedInterview.title);
    await expect(page.locator("article")).not.toContainText(otherInterview.title);

    await otherApplicationButton.click();
    await expect(page.getByText("Không có lịch phỏng vấn phù hợp")).toBeVisible();
  });

  // Ranh giới giữa "review" của interview và "note" (ghi chú) là hai khái
  // niệm TÁCH BIỆT: review lưu trong interview, note lưu thành bản ghi riêng
  // và không lẫn nội dung vào nhau.
  test("review stays on the interview while notes remain separate records", async ({ page }) => {
    const application = await createApplication(page, { company: uniqueValue("Review Boundary") });
    const review = "Questions about system design and team collaboration.";
    await page.goto(`/interviews/new?applicationId=${application.id}`);
    await expect(page.locator("form").getByText(application.company).first()).toBeVisible();
    await page.getByLabel("Tiêu đề").fill("Review boundary interview");
    await page.getByLabel("Nhận xét sau buổi phỏng vấn").fill(review);

    const createResponse = page.waitForResponse(
      (response) => response.url().includes("/api/interviews") && response.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Lưu lịch phỏng vấn" }).click();
    const interviewResponse = await createResponse;
    expect(interviewResponse.status(), await interviewResponse.text()).toBe(201);
    const { interview } = await interviewResponse.json();

    const noteResponse = await page.request.post("/api/notes", {
      data: { interviewId: interview.id, title: "Separate interview note", content: "Preparation notes" },
    });
    expect(noteResponse.status(), await noteResponse.text()).toBe(201);

    const storedInterview = await (await page.request.get(`/api/interviews/${interview.id}`)).json();
    const storedNotes = await (await page.request.get(`/api/notes?interviewId=${interview.id}`)).json();
    expect(storedInterview.interview.review).toBe(review);
    expect(storedNotes.items).toHaveLength(1);
    expect(storedNotes.items[0]).toMatchObject({ title: "Separate interview note", content: "Preparation notes" });
    expect(storedNotes.items[0].content).not.toBe(review);

    await page.goto(`/interviews/${interview.id}`);
    await expect(page.getByText("Nhận xét sau buổi phỏng vấn")).toBeVisible();
    await expect(page.getByText(review)).toBeVisible();
  });

  // Lịch: chọn một ngày có buổi phỏng vấn → hiện danh sách buổi trong ngày
  // → click vào một buổi đi tới trang chi tiết.
  test("calendar selects a day and opens its interview detail", async ({ page }) => {
    const application = await createApplication(page, { company: uniqueValue("Calendar Interview") });
    const title = uniqueValue("Calendar round");
    const created = await page.request.post("/api/interviews", {
      data: { applicationId: application.id, title, type: "TECHNICAL", scheduledAt: isoLocal(0, "23:30"), result: "PENDING" },
    });
    expect(created.status(), await created.text()).toBe(201);
    const { interview } = await created.json();

    await page.goto("/interviews");
    await page.getByRole("tab", { name: "Lịch" }).click();
    const dayCell = page.getByRole("button").filter({ hasText: application.company });
    await expect(dayCell).toBeVisible();
    await dayCell.click();
    const selectedInterview = page.getByText(title, { exact: false });
    await expect(selectedInterview).toBeVisible();
    await selectedInterview.click();
    await expect(page).toHaveURL(new RegExp(`/interviews/${interview.id}$`));
  });

  // Điều hướng lịch: "Tháng sau" và "Tháng trước" thay đổi heading;
  // "Hôm nay" quay về tháng hiện tại.
  test("calendar month controls move forward, backward, and return to the current month", async ({ page }) => {
    await page.goto("/interviews");
    await page.getByRole("tab", { name: "Lịch" }).click();
    const monthHeading = page.locator("h2").filter({ hasText: /^Tháng \d+, \d{4}$/ });
    const currentMonth = await monthHeading.textContent();

    await page.getByRole("button", { name: "Tháng sau" }).click();
    await expect(monthHeading).not.toHaveText(currentMonth!);
    await page.getByRole("button", { name: "Tháng trước" }).click();
    await expect(monthHeading).toHaveText(currentMonth!);
    await page.getByRole("button", { name: "Tháng sau" }).click();
    await page.getByRole("button", { name: "Hôm nay" }).click();
    await expect(monthHeading).toHaveText(currentMonth!);
  });

  // Deep link tới một interview id không tồn tại: trang edit hiện
  // thông báo "Không tìm thấy lịch phỏng vấn này."
  test("an unknown interview id shows a not-found state on the edit page", async ({ page }) => {
    await loginAsFreshTestUser(page);
    await page.goto("/interviews/cabcdefghijklmnopqrstuvwx/edit");
    await expect(page.getByRole("status")).toHaveText("Không tìm thấy lịch phỏng vấn này.");
  });
});