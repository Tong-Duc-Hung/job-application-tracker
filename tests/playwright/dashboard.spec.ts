import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
import { createApplication, createInterview, createNote, isoDay, isoLocal, loginAsFreshTestUser, uniqueValue } from "./helpers";

/**
 * The dashboard overview shows totals for applications, interviews, notes, and applications
 * with experience. Tests create their own records and check both displayed totals and units.
 */

const metric = (page: Page, label: string) => page.locator("main").first().getByText(label, { exact: true }).locator("xpath=../..");
const metricValue = (page: Page, label: string) => metric(page, label).locator("span").nth(1);
/** The dashboard card (nearest ancestor that owns a list) that contains the given title/description text. */
const listCard = (page: Page, text: string) => page.getByText(text, { exact: true }).locator("xpath=ancestor::*[.//ul][1]");

test.describe("Empty account", () => {
  test("greets the user by last word of the name and shows zeroes and three empty states", async ({ page }) => {
    await loginAsFreshTestUser(page);
    await expect(page.getByRole("heading", { name: /^Chào User, tiếp tục tiến về phía trước\.$/ })).toBeVisible();
    await expect(page.getByText("Chưa có lịch phỏng vấn nào")).toBeVisible();
    await expect(page.getByText("Không có hạn chót gấp nào")).toBeVisible();
    await expect(page.getByText("Chưa có đơn ứng tuyển nào")).toBeVisible();
  });

  test("overview cards show their labels, values, and units", async ({ page }) => {
    await loginAsFreshTestUser(page);
    const cards = [
      ["Đơn ứng tuyển", "đơn"],
      ["Lịch phỏng vấn", "lịch"],
      ["Ghi chú", "ghi chú"],
      ["Số đơn có kinh nghiệm", "đơn"],
    ] as const;
    for (const [label, unit] of cards) {
      await expect(metric(page, label)).toBeVisible();
      await expect(metric(page, label)).toContainText(unit);
      await expect(metricValue(page, label)).toHaveText("0");
    }
  });
});

test.describe("Overview metrics", () => {
  test("shows the total applications, interviews, notes, and applications with experience", async ({ page }) => {
    await loginAsFreshTestUser(page);
    const first = await createApplication(page, { experience: "Built automated regression tests" });
    const second = await createApplication(page, { experience: "Improved release quality" });
    const third = await createApplication(page);
    await createInterview(page, first.id, { result: "PENDING" });
    await createInterview(page, second.id, { result: "PASSED" });
    await createNote(page, first.id, { title: uniqueValue("Dashboard note") });
    await createNote(page, third.id, { title: uniqueValue("Dashboard note") });
    await page.goto("/dashboard");

    await expect(metricValue(page, "Đơn ứng tuyển")).toHaveText("3");
    await expect(metricValue(page, "Lịch phỏng vấn")).toHaveText("2");
    await expect(metricValue(page, "Ghi chú")).toHaveText("2");
    await expect(metricValue(page, "Số đơn có kinh nghiệm")).toHaveText("2");
    for (const [label, unit] of [["Đơn ứng tuyển", "đơn"], ["Lịch phỏng vấn", "lịch"], ["Ghi chú", "ghi chú"], ["Số đơn có kinh nghiệm", "đơn"]]) {
      await expect(metric(page, label)).toContainText(unit);
    }
  });

  test("the displayed totals belong to the signed-in account only", async ({ page, playwright, baseURL }) => {
    await loginAsFreshTestUser(page);
    const other = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { "x-forwarded-for": "10.9.9.9" } });
    const email = `${uniqueValue("dash-other")}@example.com`;
    await other.post("/api/auth/register", { data: { name: "Other", email, password: "password123", confirmPassword: "password123" } });
    await other.post("/api/auth/login", { data: { email, password: "password123" } });
    for (let i = 0; i < 3; i += 1) await other.post("/api/applications", { data: { company: uniqueValue("Other"), position: "P", appliedDate: "2026-08-01", status: "OFFER" } });
    await other.dispose();
    await page.goto("/dashboard");
    await expect(metricValue(page, "Đơn ứng tuyển")).toHaveText("0");
    await expect(metricValue(page, "Lịch phỏng vấn")).toHaveText("0");
    await expect(metricValue(page, "Ghi chú")).toHaveText("0");
    await expect(metricValue(page, "Số đơn có kinh nghiệm")).toHaveText("0");
  });
});

test.describe("Dashboard data presentation", () => {
  test("recent interviews show the four latest scheduled records with readable times and working links", async ({ page }) => {
    await loginAsFreshTestUser(page);
    const application = await createApplication(page, { company: uniqueValue("Recent Interview Co"), position: "Tester" });
    await createInterview(page, application.id, { title: "Scheduled in two days", scheduledAt: isoLocal(2, "09:00"), result: "PENDING" });
    await createInterview(page, application.id, { title: "Scheduled in three days", scheduledAt: isoLocal(3, "09:00"), result: "PENDING" });
    await createInterview(page, application.id, { title: "Scheduled in four days", scheduledAt: isoLocal(4, "09:00"), result: "PENDING" });
    await createInterview(page, application.id, { title: "Scheduled in five days", scheduledAt: isoLocal(5, "09:00"), result: "PENDING" });
    const sixDays = await createInterview(page, application.id, { title: "Scheduled in six days", scheduledAt: isoLocal(6, "09:00"), result: "PENDING" });
    const resolved = await createInterview(page, application.id, { title: "Resolved interview", scheduledAt: isoLocal(-1, "09:00"), result: "PASSED" });
    await page.goto("/dashboard");

    const card = listCard(page, "Lịch phỏng vấn gần đây");
    const rows = card.locator("li");
    await expect(rows).toHaveCount(4);
    await expect(rows.nth(0)).toContainText("Scheduled in six days");
    await expect(rows.nth(0)).toContainText(/\d{2}\/\d{2}\/\d{4} 09:00/);
    await expect(rows.nth(1)).toContainText("Scheduled in five days");
    await expect(rows.nth(2)).toContainText("Scheduled in four days");
    await expect(rows.nth(3)).toContainText("Scheduled in three days");
    await expect(card).not.toContainText("Scheduled in two days");

    await expect(card).not.toContainText(resolved.title);
    await rows.nth(0).getByRole("link").click();
    await expect(page).toHaveURL(new RegExp(`/interviews/${sixDays.id}(?:\\?.*)?$`));
  });
});

test.describe("Lists", () => {

  test("'Xem tất cả' links go to the interview and application lists", async ({ page }) => {
    await loginAsFreshTestUser(page);
    await page.getByRole("link", { name: /Xem tất cả/ }).first().click();
    await expect(page).toHaveURL(/\/interviews/);
    await page.goto("/dashboard");
    await page.getByRole("link", { name: /Xem tất cả/ }).last().click();
    await expect(page).toHaveURL(/\/applications/);
  });

  test("deadline alerts: includes only open deadlines from three days ago through three days ahead", async ({ page }) => {
    await loginAsFreshTestUser(page);
    const pastBoundary = await createApplication(page, { company: uniqueValue("Past Boundary"), deadline: isoDay(-3), appliedDate: isoDay(-10) });
    const futureBoundary = await createApplication(page, { company: uniqueValue("Future Boundary"), deadline: isoDay(3), appliedDate: isoDay(-3) });
    const stale = await createApplication(page, { company: uniqueValue("Stale Deadline"), deadline: isoDay(-30), appliedDate: isoDay(-60) });
    const tooSoon = await createApplication(page, { company: uniqueValue("Outside Past"), deadline: isoDay(-4), appliedDate: isoDay(-10) });
    const tooFar = await createApplication(page, { company: uniqueValue("Outside Future"), deadline: isoDay(4), appliedDate: isoDay(-3) });
    const closed = await createApplication(page, { company: uniqueValue("Closed Co"), deadline: isoDay(2), appliedDate: isoDay(-10), status: "REJECTED" });
    await page.goto("/dashboard");

    const card = listCard(page, "Hạn chót cần chú ý");
    const rows = card.locator("li");
    await expect(rows).toHaveCount(2);
    await expect(card).toContainText(pastBoundary.company);
    await expect(card).toContainText(futureBoundary.company);
    for (const application of [stale, tooSoon, tooFar, closed]) {
      await expect(card).not.toContainText(application.company);
    }
  });

  test("deadline alerts: upcoming first, then overdue, with nearest dates first in each group", async ({ page }) => {
    await loginAsFreshTestUser(page);
    const overdueNearest = await createApplication(page, { company: uniqueValue("Overdue Near"), deadline: isoDay(-1), appliedDate: isoDay(-10) });
    const overdueFarthest = await createApplication(page, { company: uniqueValue("Overdue Far"), deadline: isoDay(-3), appliedDate: isoDay(-10) });
    const upcomingNearest = await createApplication(page, { company: uniqueValue("Upcoming Near"), deadline: isoDay(1), appliedDate: isoDay(-3) });
    const upcomingFarthest = await createApplication(page, { company: uniqueValue("Upcoming Far"), deadline: isoDay(3), appliedDate: isoDay(-3) });
    await page.goto("/dashboard");

    const rows = listCard(page, "Hạn chót cần chú ý").locator("li");
    await expect(rows).toHaveCount(4);
    await expect(rows.nth(0)).toContainText(upcomingNearest.company);
    await expect(rows.nth(1)).toContainText(upcomingFarthest.company);
    await expect(rows.nth(2)).toContainText(overdueNearest.company);
    await expect(rows.nth(2)).toContainText(/Đã quá hạn \d{2}\/\d{2}\/\d{4}/);
    await expect(rows.nth(3)).toContainText(overdueFarthest.company);
  });

  test("a deadline that is today is labelled 'Hạn chót', not 'Đã quá hạn'", async ({ page }) => {
    await loginAsFreshTestUser(page);
    const application = await createApplication(page, { deadline: isoDay(0), appliedDate: isoDay(-3) });
    await page.goto("/dashboard");
    const row = listCard(page, "Hạn chót cần chú ý").locator("li").filter({ hasText: application.company });
    await expect(row).toContainText("Hạn chót");
    await expect(row).not.toContainText("Đã quá hạn");
  });

  test("recent applications: the four newest, each with its status badge, linking to its detail page", async ({ page }) => {
    await loginAsFreshTestUser(page);
    const created: { id: string; company: string }[] = [];
    for (let i = 0; i < 5; i += 1) {
      created.push(await createApplication(page, { company: uniqueValue(`Recent${i}`), status: i === 4 ? "OFFER" : "APPLIED" }));
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    await page.goto("/dashboard");
    const card = listCard(page, "Những cơ hội mới nhất trong hồ sơ của bạn");
    const rows = card.locator("li");
    await expect(rows).toHaveCount(4);
    await expect(rows.nth(0)).toContainText(created[4].company);
    await expect(rows.nth(0)).toContainText("Offer");
    await expect(card).not.toContainText(created[0].company);
    await rows.nth(0).getByRole("link").click();
    await expect(page).toHaveURL(new RegExp(`/applications/${created[4].id}(?:\\?.*)?$`));
  });
});
