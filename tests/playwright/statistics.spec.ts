import { type APIRequestContext, type Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { createApplication, createInterview, loginAsFreshTestUser } from "./helpers";

/**
 * Trang Thống kê — CHỈ kiểm thử phần PAGE tại /statistics: các preset, khoảng tùy chỉnh,
 * thẻ KPI, biểu đồ tròn, nhãn trục, trạng thái rỗng + lỗi, response đến muộn, màn hình cỡ điện thoại.
 *
 * Hợp đồng số liệu của chính GET /api/statistics (tổng, phân rã, tỷ lệ thành công, biên
 * khoảng ngày kể cả ngày nhuận, độ mịn time-bucket, validation, cách ly giữa tài khoản)
 * đã được kiểm thử một lần ở tầng API trong Postman collection — không lặp lại ở đây.
 * File này chỉ xác nhận PAGE render đúng những gì API trả về.
 *
 * Mỗi test dùng một tài khoản dùng-một-lần với lượng dữ liệu đã biết trước, và các ngày
 * được viết rõ ràng (hoặc tính từ "hôm nay" bằng Date thuần, không dùng thư viện của app)
 * để kỳ vọng không bao giờ chỉ phản chiếu lại code đang kiểm thử.
 *
 * Giả định: process test và server chạy cùng timezone (đúng với `next dev` local).
 * "Hôm nay", biên ngày và các bucket ngày đều theo timezone này.
 */

/* ------------------------------------------------------------------ types */

type Bucket = { month: string; count: number };

type ApplicationStats = {
  total: number;
  byStatus: { status: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  monthly: Bucket[];
  daily: Bucket[];
  active: number;
  interviewing: number;
  responded: number;
  offers: number;
  withInterviews: number;
};

type InterviewStats = {
  total: number;
  applicationTotal: number;
  applicationsWithInterviews: number;
  upcoming: number;
  passed: number;
  failed: number;
  cancelled: number;
  noShow: number;
  successRate: number;
  byType: { type: string; count: number }[];
  monthly: Bucket[];
  daily: Bucket[];
};

type Range = { from?: string; to?: string };

/** Ngày 29/02 năm nhuận, hai ranh giới năm, và các biên tháng 3/4-2025 — dùng để seed cho test page. */
const APPLICATION_DATES = ["2024-02-29", "2024-12-31", "2025-01-01", "2025-03-10", "2025-03-20", "2025-03-31", "2025-04-01"];

/* ------------------------------------------------------------ date helpers */

const pad = (value: number) => String(value).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const ddmm = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
const ddmmyyyy = (d: Date) => `${ddmm(d)}/${d.getFullYear()}`;
const mmyyyy = (d: Date) => `${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const dayOffset = (base: Date, days: number) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
const monthStart = (base: Date, months: number) => new Date(base.getFullYear(), base.getMonth() + months, 1);
const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};
/** `count` ngày gần nhất kết thúc hôm nay, cũ nhất trước. */
const lastDays = (count: number, today: Date) => Array.from({ length: count }, (_, i) => dayOffset(today, i - (count - 1)));
/** `count` tháng gần nhất kết thúc bằng tháng hiện tại, cũ nhất trước. */
const lastMonths = (count: number, today: Date) => Array.from({ length: count }, (_, i) => monthStart(today, i - (count - 1)));

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ------------------------------------------------------------- API helpers */

function statisticsUrl(tab: string, range: Range = {}) {
  const params = new URLSearchParams({ tab });
  if (range.from) params.set("from", range.from);
  if (range.to) params.set("to", range.to);
  return `/api/statistics?${params.toString()}`;
}

async function applicationStats(request: APIRequestContext, range: Range = {}) {
  const response = await request.get(statisticsUrl("applications", range));
  expect(response.status(), await response.text()).toBe(200);
  return (await response.json()).applications as ApplicationStats;
}

/** PUT validate toàn bộ form, nên gửi đủ mọi trường bắt buộc mỗi lần. */
/** Dù khoảng thế nào, các phần của kết quả cũng phải cộng lại bằng tổng của nó. */
function checkApplicationInvariants(stats: ApplicationStats, label: string) {
  expect.soft(sum(stats.byStatus.map((s) => s.count)), `${label}: byStatus adds up to total`).toBe(stats.total);
  expect.soft(sum(stats.byPriority.map((p) => p.count)), `${label}: byPriority adds up to total`).toBe(stats.total);
  expect.soft(sum(stats.monthly.map((b) => b.count)), `${label}: time series adds up to total`).toBe(stats.total);
}

/* ============================================================= the page (UI) */

/** Một thẻ KPI: `value` và `note` là dòng thứ 2 và thứ 3 dưới nhãn. */
function kpi(page: Page, label: string) {
  // Chỉ <p>: một hàng legend của pie có thể chứa cùng từ ngữ trong <span>.
  const labelElement = page.locator("p").filter({ hasText: new RegExp(`^${escapeRegExp(label)}$`) });
  const card = labelElement.locator("..");
  return { value: card.locator("p").nth(1), note: card.locator("p").nth(2) };
}

/**
 * Mở /statistics và chờ cho tới khi trang thật sự tương tác được.
 *
 * `goto()` resolve trước khi React hydrate xong, và fetch đầu tiên chỉ bắt đầu trong effect.
 * Gõ vào date input hay bấm tab trước thời điểm đó sẽ bị nuốt mất (đúng race mà form notes
 * và interviews từng gặp), khiến test có thể pass lần này và timeout lần khác. Nhãn KPI chỉ
 * xuất hiện sau khi response đầu tiên đã render — chứng tỏ hydration đã xong — nên chờ một
 * nhãn trước khi làm gì khác.
 */
async function openStatistics(page: Page) {
  await page.goto("/statistics");
  await expect(kpi(page, "Tổng số đơn").value).toBeVisible();
}

/** Một hàng trong legend của pie chart, ví dụ "Đạt: 2 lịch phỏng vấn (29%)". */
function pieRow(page: Page, name: string, count: number, unit: string, percentage: number) {
  return page.getByText(new RegExp(`^${escapeRegExp(name)}: ${count} ${escapeRegExp(unit)} \\(${percentage}%\\)$`));
}

/**
 * Nhãn trục X được tìm theo NỘI DUNG CHÚNG HIỂN THỊ (dd/MM, MM/yyyy hoặc yyyy),
 * không theo class nội bộ của recharts — nhờ vậy vẫn hoạt động khi recharts nâng cấp.
 * Không có gì khác trên trang đọc giống vậy: số KPI là số nguyên, hàng legend kết
 * thúc bằng "(29%)".
 */
const TICK_LABEL = /^(\d{2}\/\d{2}|\d{2}\/\d{4}|\d{4})$/;
const xAxisTicks = (page: Page) => page.getByText(TICK_LABEL);

/** Nội dung thực tế của time chart — in ra khi assertion về trục / loại chart fail. */
async function describeTimeChart(page: Page) {
  return page
    .locator(".recharts-wrapper")
    .last()
    .evaluate((wrapper) => ({
      classes: Array.from(new Set(Array.from(wrapper.querySelectorAll("[class]")).map((el) => el.getAttribute("class")))).slice(0, 40),
      texts: Array.from(wrapper.querySelectorAll("text, tspan")).map((el) => `${el.tagName}:${el.textContent}`),
    }))
    .catch(() => "(no .recharts-wrapper on the page)");
}

async function withChartDiagnostics(page: Page, check: () => Promise<void>) {
  try {
    await check();
  } catch (error) {
    console.log("[time chart DOM]", JSON.stringify(await describeTimeChart(page), null, 2));
    throw error;
  }
}

/** Hoặc danh sách đầy đủ nhãn tick, hoặc chỉ nhãn đầu và cuối (khoảng dài làm thưa nhãn). */
async function expectAxis(page: Page, expected: string[] | { first: string; last: string }) {
  await withChartDiagnostics(page, async () => {
    if (Array.isArray(expected)) {
      await expect(xAxisTicks(page)).toHaveText(expected);
    } else {
      await expect(xAxisTicks(page).first()).toHaveText(expected.first);
      await expect(xAxisTicks(page).last()).toHaveText(expected.last);
    }
  });
}

/** Bar cho ≤ 7 bucket, area (line) cho nhiều hơn. Selector dạng substring giữ test độc lập với tên class chính xác của recharts. */
async function expectChartKind(page: Page, kind: "bar" | "area") {
  await withChartDiagnostics(page, async () => {
    const bars = page.locator('[class*="recharts-bar"]');
    const areas = page.locator('[class*="recharts-area"]');
    if (kind === "bar") {
      await expect(bars).not.toHaveCount(0);
      await expect(areas).toHaveCount(0);
    } else {
      await expect(areas).not.toHaveCount(0);
      await expect(bars).toHaveCount(0);
    }
  });
}
const contentTab = (page: Page, name: "Đơn ứng tuyển" | "Phỏng vấn") => page.getByRole("tab", { name, exact: true });

/** Nhập khoảng tùy chỉnh vào hai ô date input và chờ request khớp. */
async function setCustomRange(page: Page, from: string, to: string) {
  const loaded = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      response.url().includes("/api/statistics") &&
      response.url().includes(`from=${from}`) &&
      response.url().includes(`to=${to}`),
  );
  loaded.catch(() => undefined); // không bao giờ unhandled rejection nếu assertion bên dưới fail trước
  const fromInput = page.getByLabel("Từ ngày");
  const toInput = page.getByLabel("Đến ngày");
  // Tránh khoảng bị đảo tạm thời khi đang gõ: đặt biên nào an toàn trước.
  if (from > (await toInput.inputValue())) {
    await toInput.fill(to);
    await fromInput.fill(from);
  } else {
    await fromInput.fill(from);
    await toInput.fill(to);
  }
  // Nếu trang vứt bỏ ngày đã gõ, báo ngay thay vì chờ hết timeout của test.
  await expect(fromInput).toHaveValue(from);
  await expect(toInput).toHaveValue(to);
  await loaded;
}

/** Đơn ứng tuyển vào các ngày "khó" ở trên, kèm 4 buổi phỏng vấn quanh nửa đêm. */
async function seedMarch2025(page: Page) {
  const applications: { id: string }[] = [];
  for (const appliedDate of APPLICATION_DATES) applications.push(await createApplication(page, { appliedDate }));
  for (const scheduledAt of ["2025-03-09T23:59", "2025-03-10T00:00", "2025-03-31T23:59", "2025-04-01T00:00"]) {
    await createInterview(page, applications[0].id, { scheduledAt });
  }
}

test.describe("Statistics page", () => {
  // Mỗi preset (7 ngày, 30 ngày, 3 tháng, 6 tháng, 12 tháng, Toàn bộ) bao phủ
  // đúng số ngày/tháng mà nó hứa: API và page phải khớp (label, input ngày,
  // KPI, nhãn trục, loại chart). Seed dữ liệu ở hai bên mỗi ranh giới preset.
  test("every preset covers exactly the days it promises (API and page agree)", async ({ page }) => {
    test.setTimeout(120_000);
    await loginAsFreshTestUser(page);
    const today = startOfToday();

    // Một đơn ở mỗi bên ranh giới của mọi preset, cộng một đơn chỉ "Toàn bộ" mới với tới.
    const dates = [
      today,
      dayOffset(today, -6), // ngày đầu của 7 ngày
      dayOffset(today, -7), // vừa ngoài 7 ngày
      dayOffset(today, -29), // ngày đầu của 30 ngày
      dayOffset(today, -30), // vừa ngoài 30 ngày
      monthStart(today, -2), // ngày đầu của 3 tháng
      dayOffset(monthStart(today, -2), -1), // vừa ngoài 3 tháng
      monthStart(today, -5), // ngày đầu của 6 tháng
      dayOffset(monthStart(today, -5), -1), // vừa ngoài 6 tháng
      monthStart(today, -11), // ngày đầu của 12 tháng
      dayOffset(monthStart(today, -11), -1), // vừa ngoài 12 tháng
      monthStart(today, -14), // chỉ "Toàn bộ"
    ].map(iso);
    for (const appliedDate of dates) await createApplication(page, { appliedDate });

    const expectedTotal = (from: Date | null) => dates.filter((d) => (from === null || d >= iso(from)) && d <= iso(today)).length;

    const presets: {
      tab: string;
      label: string;
      from: Date | null;
      chart: "bar" | "area" | null;
      axis: string[] | { first: string; last: string };
    }[] = [
      { tab: "7 ngày", label: "7 ngày gần nhất", from: dayOffset(today, -6), chart: "bar", axis: lastDays(7, today).map(ddmm) },
      {
        tab: "30 ngày",
        label: "30 ngày gần nhất",
        from: dayOffset(today, -29),
        chart: "area",
        axis: { first: ddmm(dayOffset(today, -29)), last: ddmm(today) },
      },
      { tab: "3 tháng", label: "3 tháng gần nhất", from: monthStart(today, -2), chart: "bar", axis: lastMonths(3, today).map(mmyyyy) },
      { tab: "6 tháng", label: "6 tháng gần nhất", from: monthStart(today, -5), chart: "bar", axis: lastMonths(6, today).map(mmyyyy) },
      { tab: "12 tháng", label: "12 tháng gần nhất", from: monthStart(today, -11), chart: "area", axis: lastMonths(12, today).map(mmyyyy) },
      {
        tab: "Toàn bộ",
        label: "Toàn bộ dữ liệu",
        from: null,
        chart: null,
        axis: { first: String(monthStart(today, -14).getFullYear()), last: String(today.getFullYear()) },
      },
    ];

    await openStatistics(page);
    // Mặc định là 6 tháng.
    await expect(page.getByText("Đang xem 6 tháng gần nhất", { exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "6 tháng", exact: true })).toHaveAttribute("aria-selected", "true");

    for (const preset of presets) {
      await test.step(`preset "${preset.tab}"`, async () => {
        const expected = expectedTotal(preset.from);

        // Server: đúng tham số mà page gửi cho preset này.
        const range = preset.from ? { from: iso(preset.from), to: iso(today) } : {};
        const stats = await applicationStats(page.request, range);
        expect.soft(stats.total, `API total for ${preset.tab}`).toBe(expected);
        checkApplicationInvariants(stats, preset.tab);

        // Page: label, date input, số liệu, trục, loại chart.
        await page.getByRole("tab", { name: preset.tab, exact: true }).click();
        await expect(page.getByRole("tab", { name: preset.tab, exact: true })).toHaveAttribute("aria-selected", "true");
        await expect(page.getByText(`Đang xem ${preset.label.toLowerCase()}`, { exact: true })).toBeVisible();
        await expect(page.getByText(preset.label, { exact: true })).toBeVisible();

        if (preset.from) {
          await expect(page.getByLabel("Từ ngày")).toHaveValue(iso(preset.from));
          await expect(page.getByLabel("Đến ngày")).toHaveValue(iso(today));
        } else {
          await expect(page.getByLabel("Từ ngày")).toHaveCount(0);
          await expect(page.getByLabel("Đến ngày")).toHaveCount(0);
        }

        await expect(kpi(page, "Tổng số đơn").value).toHaveText(String(expected));

        await expectAxis(page, preset.axis);
        if (preset.chart) await expectChartKind(page, preset.chart);
      });
    }
  });

  // Khoảng tùy chỉnh lọc CẢ HAI tab (đơn ứng tuyển và phỏng vấn) chính xác
  // tới từng ngày, và giữ nguyên khi chuyển tab qua lại.
  test("a custom range filters both tabs, to the day, and survives tab switches", async ({ page }) => {
    test.setTimeout(90_000);
    await loginAsFreshTestUser(page);
    await seedMarch2025(page);
    await openStatistics(page);

    await setCustomRange(page, "2025-03-10", "2025-03-31");
    await expect(page.getByText("Đang xem khoảng tùy chỉnh", { exact: true })).toBeVisible();
    await expect(page.getByText("Khoảng tùy chỉnh", { exact: true })).toBeVisible();
    await expect(kpi(page, "Tổng số đơn").value).toHaveText("3");
    await expect(kpi(page, "Số đơn có phỏng vấn").value).toHaveText("0");
    // Chart bắt đầu từ ngày đầu tiên được yêu cầu và kết thúc ngày cuối.
    await expectAxis(page, { first: "10/03", last: "31/03" });

    // Phỏng vấn: 03-10 00:00 và 03-31 23:59 nằm trong; 03-09 23:59 và 04-01 00:00 nằm ngoài.
    await contentTab(page, "Phỏng vấn").click();
    await expect(kpi(page, "Tổng số").value).toHaveText("2");
    await expect(kpi(page, "Tỷ lệ đơn có phỏng vấn").value).toHaveText("0");
    await expect(kpi(page, "Tỷ lệ đơn có phỏng vấn").note).toHaveText("/ 3 đơn");
    await expect(page.getByText("Đang xem khoảng tùy chỉnh", { exact: true })).toBeVisible();
    await expectAxis(page, { first: "10/03", last: "31/03" });

    // Quay lại tab đơn ứng tuyển thì khoảng vẫn được áp dụng.
    await contentTab(page, "Đơn ứng tuyển").click();
    await expect(kpi(page, "Tổng số đơn").value).toHaveText("3");

    // Khoảng một ngày là hợp lệ: một bucket, một đơn.
    await setCustomRange(page, "2025-03-20", "2025-03-20");
    await expect(kpi(page, "Tổng số đơn").value).toHaveText("1");
    await expectAxis(page, ["20/03"]);
  });

  // Khoảng đảo ngược (from > to): hiện cảnh báo, KHÔNG gửi request mới, và
  // giữ số liệu cũ ở trạng thái mờ (dimmed) kèm thông báo "đang hiển thị số
  // liệu khoảng trước đó".
  test("an inverted range warns, stops fetching and keeps the previous numbers dimmed", async ({ page }) => {
    test.setTimeout(90_000);
    await loginAsFreshTestUser(page);
    await seedMarch2025(page);

    let statisticsRequests = 0;
    page.on("request", (request) => {
      if (request.url().includes("/api/statistics")) statisticsRequests += 1;
    });

    await openStatistics(page);
    await setCustomRange(page, "2025-03-10", "2025-03-31");
    await expect(kpi(page, "Tổng số đơn").value).toHaveText("3");
    const requestsBefore = statisticsRequests;

    // "Từ ngày" sau "Đến ngày".
    await page.getByLabel("Từ ngày").fill("2025-04-05");
    const warning = page.getByText("Ngày bắt đầu phải trước ngày kết thúc.");
    const staleNotice = page.getByText(/Đang hiển thị số liệu của khoảng thời gian trước đó/);
    await expect(warning).toBeVisible();
    await expect(staleNotice).toBeVisible();
    await page.waitForTimeout(500);
    expect(statisticsRequests, "no request may be sent for an invalid range").toBe(requestsBefore);
    await expect(kpi(page, "Tổng số đơn").value).toHaveText("3"); // vẫn là số cũ, không trống hay bằng 0

    // Sửa khoảng thì cả hai thông báo biến mất và fetch lại: 04-05..04-30 rỗng.
    await page.getByLabel("Đến ngày").fill("2025-04-30");
    await expect(warning).toHaveCount(0);
    await expect(staleNotice).toHaveCount(0);
    await expect(kpi(page, "Tổng số đơn").value).toHaveText("0");
  });

  // Tab đơn ứng tuyển: KPI, 2 pie (status + priority) và time chart hiển thị
  // đúng số liệu thật; hover lên bar tháng hiện tại hiện tooltip đúng.
  test("applications tab: KPIs, pies and the time chart show the real numbers", async ({ page }) => {
    test.setTimeout(90_000);
    await loginAsFreshTestUser(page);
    const today = startOfToday();
    const appliedDate = iso(today);

    const rows = [
      ["EXPIRED", "LOW"],
      ["APPLIED", "MEDIUM"],
      ["REVIEWING", "MEDIUM"],
      ["INTERVIEWING", "HIGH"],
      ["AWAITING_RESULT", "HIGH"],
      ["OFFER", "HIGH"],
      ["ACCEPTED", "LOW"],
      ["REJECTED", "LOW"],
    ] as const;
    const created: { id: string }[] = [];
    for (const [status, priority] of rows) created.push(await createApplication(page, { status, priority, appliedDate }));
    await createInterview(page, created[3].id);
    await createInterview(page, created[3].id);
    await createInterview(page, created[4].id);

    await openStatistics(page);

    await expect(kpi(page, "Tổng số đơn").value).toHaveText("8");
    await expect(kpi(page, "Tổng số đơn").note).toHaveText("Tất cả trạng thái");
    await expect(kpi(page, "Số đơn còn lại").value).toHaveText("5");
    await expect(kpi(page, "Số đơn còn lại").note).toHaveText("/ 8 tổng số đơn");
    await expect(kpi(page, "Số đơn có phỏng vấn").value).toHaveText("2");
    await expect(kpi(page, "Số đơn có phỏng vấn").note).toHaveText("/ 8 đơn");
    await expect(kpi(page, "Tỷ lệ nhận offer").value).toHaveText("2");
    await expect(kpi(page, "Tỷ lệ nhận offer").note).toHaveText("/ 8 đơn");

    // Pie: 8 status có dữ liệu (WITHDRAWN không có, nên không có hàng) + 3 priority.
    await expect(pieRow(page, "Đã nhận việc", 1, "đơn ứng tuyển", 13)).toBeVisible(); // 1/8 = 12.5 -> 13
    await expect(page.getByText(/ đơn ứng tuyển \(\d+%\)$/)).toHaveCount(11);
    await expect(page.getByText("Chưa có dữ liệu")).toHaveCount(0);

    // Hai pie + một time chart được vẽ.
    await expect(page.locator(".recharts-wrapper")).toHaveCount(3);
    await expectAxis(page, lastMonths(6, today).map(mmyyyy));

    // Hover bar phải nhất (tháng hiện tại) hiện đúng số lượng. Tooltip là
    // ChartTooltip của app — tìm theo nền tối thay vì class recharts.
    const timeChart = page.locator(".recharts-wrapper").last();
    const chartBox = await timeChart.boundingBox();
    expect(chartBox).not.toBeNull();
    await timeChart.hover({ position: { x: chartBox!.width - 30, y: 120 } });
    const tooltip = page.locator('div[class*="bg-[#0f172a]"]');
    await expect(tooltip.locator("p")).toHaveText(mmyyyy(today));
    await expect(tooltip.locator("span.tabular-nums")).toHaveText("8");
  });

  // Tab phỏng vấn: KPI và pie hiển thị đúng số liệu thật; các buổi PENDING
  // (kể cả đã qua) vẫn nằm trong phân bố kết quả.
  test("interviews tab: KPIs and pies show the real numbers", async ({ page }) => {
    test.setTimeout(90_000);
    await loginAsFreshTestUser(page);
    const today = startOfToday();
    const application = await createApplication(page);
    // Buổi PENDING vẫn nằm trong phân bố kết quả, kể cả buổi đã qua chưa resolve.
    const scheduledAt = `${iso(dayOffset(today, -5))}T10:00`;
    const rows = [
      ["HR", "PASSED"],
      ["HR", "PASSED"],
      ["TECHNICAL", "FAILED"],
      ["TECHNICAL", "PENDING"],
      ["ONLINE_ASSESSMENT", "PENDING"],
      ["MANAGER", "CANCELLED"],
      ["FINAL", "NO_SHOW"],
    ] as const;
    for (const [type, result] of rows) await createInterview(page, application.id, { type, result, scheduledAt });

    await openStatistics(page);
    await contentTab(page, "Phỏng vấn").click();

    await expect(kpi(page, "Tổng số").value).toHaveText("7");
    await expect(kpi(page, "Tỷ lệ đơn có phỏng vấn").value).toHaveText("1");
    await expect(kpi(page, "Tỷ lệ đơn có phỏng vấn").note).toHaveText("/ 1 đơn");
    await expect(page.getByText("100%", { exact: true })).toBeVisible();
    await expect(kpi(page, "Tỷ lệ đạt").value).toHaveText("2");
    await expect(kpi(page, "Tỷ lệ đạt").note).toHaveText("/ 3 có kết quả"); // chỉ PASSED + FAILED là đã quyết

    // Theo kết quả. 2/7 = 28.6 -> 29 và 1/7 = 14.3 -> 14.
    await expect(pieRow(page, "Sắp diễn ra", 2, "lịch phỏng vấn", 29)).toBeVisible();
    await expect(pieRow(page, "Đạt", 2, "lịch phỏng vấn", 29)).toBeVisible();
    await expect(pieRow(page, "Không đạt", 1, "lịch phỏng vấn", 14)).toBeVisible();
    await expect(pieRow(page, "Đã hủy", 1, "lịch phỏng vấn", 14)).toBeVisible();
    await expect(pieRow(page, "Vắng mặt", 1, "lịch phỏng vấn", 14)).toBeVisible();

    // Theo loại; OTHER không có buổi nào nên không có hàng.
    await expect(pieRow(page, "Vòng HR", 2, "lịch phỏng vấn", 29)).toBeVisible();
    await expect(pieRow(page, "Vòng kỹ thuật", 2, "lịch phỏng vấn", 29)).toBeVisible();
    await expect(pieRow(page, "Bài test online", 1, "lịch phỏng vấn", 14)).toBeVisible();
    await expect(pieRow(page, "Vòng quản lý", 1, "lịch phỏng vấn", 14)).toBeVisible();
    await expect(pieRow(page, "Vòng cuối", 1, "lịch phỏng vấn", 14)).toBeVisible();
    await expect(page.getByText(/^Khác: /)).toHaveCount(0);

    await expect(page.locator(".recharts-wrapper")).toHaveCount(3);
  });

  // Tài khoản rỗng: mọi KPI bằng 0, pie hiện "Chưa có dữ liệu", trục vẫn
  // hiển thị 6 tháng gần nhất, và tuyệt đối không có NaN.
  test("an account with no data shows zeros, empty pies and the last 6 months on the axis", async ({ page }) => {
    await loginAsFreshTestUser(page);
    const today = startOfToday();
    await openStatistics(page);

    await expect(kpi(page, "Tổng số đơn").value).toHaveText("0");
    await expect(kpi(page, "Số đơn còn lại").value).toHaveText("0");
    await expect(kpi(page, "Số đơn còn lại").note).toHaveText("/ 0 tổng số đơn");
    await expect(kpi(page, "Số đơn có phỏng vấn").note).toHaveText("/ 0 đơn");
    await expect(kpi(page, "Tỷ lệ nhận offer").value).toHaveText("0");
    await expect(page.getByText("Chưa có dữ liệu")).toHaveCount(2); // pie status + pie priority
    await expectAxis(page, lastMonths(6, today).map(mmyyyy));
    await expect(page.getByText(/\bNaN\b/)).toHaveCount(0);

    await contentTab(page, "Phỏng vấn").click();
    await expect(kpi(page, "Tổng số").value).toHaveText("0");
    await expect(kpi(page, "Tỷ lệ đơn có phỏng vấn").value).toHaveText("0");
    await expect(kpi(page, "Tỷ lệ đơn có phỏng vấn").note).toHaveText("/ 0 đơn");
    await expect(kpi(page, "Tỷ lệ đạt").value).toHaveText("0");
    await expect(kpi(page, "Tỷ lệ đạt").note).toHaveText("/ 0 có kết quả");
    await expect(page.getByText("Chưa có dữ liệu")).toHaveCount(2); // pie kết quả + pie loại
    await expectAxis(page, lastMonths(6, today).map(mmyyyy));
    await expect(page.getByText(/\bNaN\b/)).toHaveCount(0);
  });

  // Trạng thái lỗi khi API fail: hiển thị "Không tải được dữ liệu"; sau khi
  // API hoạt động lại và đổi preset thì phục hồi bình thường.
  test("shows an error state when the API fails and recovers once it works again", async ({ page }) => {
    await loginAsFreshTestUser(page);
    await page.route(/\/api\/statistics/, (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "boom" }) }),
    );

    await page.goto("/statistics");
    await expect(page.getByText("Không tải được dữ liệu")).toBeVisible();

    await page.unroute(/\/api\/statistics/);
    await page.getByRole("tab", { name: "7 ngày", exact: true }).click(); // đổi khoảng nên fetch lại
    await expect(kpi(page, "Tổng số đơn").value).toHaveText("0");
    await expect(page.getByText("Không tải được dữ liệu")).toHaveCount(0);
  });

  // Tab phỏng vấn: preset lọc theo NGÀY ĐÃ LÊN LỊCH, chính xác tới từng ngày.
  test("interviews tab: the presets use the scheduled date, to the day", async ({ page }) => {
    test.setTimeout(90_000);
    await loginAsFreshTestUser(page);
    const today = startOfToday();
    const application = await createApplication(page);
    const days = [dayOffset(today, -6), dayOffset(today, -7), dayOffset(today, -29), dayOffset(today, -30)];
    for (const day of days) await createInterview(page, application.id, { scheduledAt: `${iso(day)}T10:00` });

    await openStatistics(page);
    await contentTab(page, "Phỏng vấn").click();

    const cases: [string, Date][] = [
      ["7 ngày", dayOffset(today, -6)],
      ["30 ngày", dayOffset(today, -29)],
      ["6 tháng", monthStart(today, -5)],
    ];
    for (const [tab, from] of cases) {
      await test.step(`preset "${tab}"`, async () => {
        const expected = days.filter((d) => iso(d) >= iso(from) && iso(d) <= iso(today)).length;
        await page.getByRole("tab", { name: tab, exact: true }).click();
        await expect(kpi(page, "Tổng số").value).toHaveText(String(expected));
      });
    }
  });

  // "Toàn bộ" bao gồm cả buổi phỏng vấn đã lên lịch trong TƯƠNG LAI — khác
  // với các preset khác (chỉ tính tới hôm nay).
  test("'Toàn bộ' includes interviews scheduled in the future, unlike the other presets", async ({ page }) => {
    await loginAsFreshTestUser(page);
    const application = await createApplication(page);
    const inThreeDays = `${iso(dayOffset(startOfToday(), 3))}T10:00`;
    await createInterview(page, application.id, { scheduledAt: inThreeDays, result: "PENDING" });

    await openStatistics(page);
    await contentTab(page, "Phỏng vấn").click();
    await expect(kpi(page, "Tổng số").value).toHaveText("0");
    await page.getByRole("tab", { name: "Toàn bộ", exact: true }).click();
    await expect(kpi(page, "Tổng số").value).toHaveText("1");
  });

  // Race condition: response cũ về muộn không được ghi đè lên lựa chọn mới.
  // Route "7 ngày" trả lời chậm 2s, user bấm "12 tháng" trước khi nó về —
  // UI phải giữ số liệu của "12 tháng".
  test("the newest choice wins even when an older request answers late", async ({ page }) => {
    test.setTimeout(60_000);
    await loginAsFreshTestUser(page);
    const today = startOfToday();
    await createApplication(page, { appliedDate: iso(today) });
    await createApplication(page, { appliedDate: iso(dayOffset(today, -100)) }); // trong 12 tháng, ngoài 7 ngày
    await openStatistics(page);
    await expect(kpi(page, "Tổng số đơn").value).toHaveText("2");

    // Trả lời request "7 ngày" chậm, để nó về SAU request "12 tháng".
    const sevenDaysAgo = iso(dayOffset(today, -6));
    await page.route(/\/api\/statistics/, async (route) => {
      if (route.request().url().includes(`from=${sevenDaysAgo}`)) await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.continue();
    });
    const lateResponse = page.waitForResponse((response) => response.url().includes(`from=${sevenDaysAgo}`));

    await page.getByRole("tab", { name: "7 ngày", exact: true }).click();
    await page.getByRole("tab", { name: "12 tháng", exact: true }).click();
    await lateResponse; // câu trả lời cũ (1 đơn) đã về
    await page.waitForTimeout(300);

    await expect(page.getByText("Đang xem 12 tháng gần nhất", { exact: true })).toBeVisible();
    await expect(kpi(page, "Tổng số đơn").value).toHaveText("2"); // không phải "1" từ response muộn
  });

  test.describe("on a phone-sized screen", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    // Trên màn hình điện thoại: không tràn ngang, chart vẫn render đầy đủ.
    test("nothing overflows sideways and the charts still render", async ({ page }) => {
      await loginAsFreshTestUser(page);
      await createApplication(page, { appliedDate: iso(startOfToday()) });
      await openStatistics(page);

      await expect(kpi(page, "Tổng số đơn").value).toHaveText("1");
      await expect(page.locator(".recharts-wrapper")).toHaveCount(3);
      const sidewaysOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(sidewaysOverflow, "the page must not scroll horizontally").toBeLessThanOrEqual(0);
    });
  });

  // Tổng số buổi phỏng vấn tuân theo khoảng đã chọn: preset mặc định chỉ đếm
  // các buổi trong khoảng; "Toàn bộ" đếm mọi buổi kể cả đã qua rất lâu hoặc
  // trong tương lai.
  test("interview totals follow the selected schedule range, and 'Toàn bộ' includes every date", async ({ page }) => {
    await loginAsFreshTestUser(page);
    const application = await createApplication(page);
    const today = startOfToday();
    const insideDefaultRange = `${iso(dayOffset(today, -5))}T10:00`;
    const inThreeDays = `${iso(dayOffset(startOfToday(), 3))}T10:00`;
    const outsideDefaultRange = `${iso(dayOffset(today, -400))}T10:00`;
    await createInterview(page, application.id, { scheduledAt: insideDefaultRange, result: "PENDING" });
    await createInterview(page, application.id, { scheduledAt: inThreeDays, result: "PENDING" });
    await createInterview(page, application.id, { scheduledAt: outsideDefaultRange, result: "PENDING" });

    await openStatistics(page);
    await contentTab(page, "Phỏng vấn").click();
    await expect(kpi(page, "Tổng số").value).toHaveText("1");

    await page.getByRole("tab", { name: "Toàn bộ", exact: true }).click();
    await expect(kpi(page, "Tổng số").value).toHaveText("3");
  });
});