import { randomBytes } from "node:crypto";
import { expect, type APIRequestContext, type Page, type PlaywrightWorkerArgs } from "@playwright/test";

/**
 * Bộ tiện ích dùng chung cho toàn bộ test suite.
 *
 * File này gom 5 nhóm helper:
 *   1. Giá trị ngẫu nhiên / sinh IP              — tránh trùng lặp và rate-limit.
 *   2. Xử lý ngày tháng                          — tạo ngày theo giờ LOCAL, không UTC.
 *   3. Tài khoản (đăng ký / đăng nhập qua API)   — mỗi test dùng tài khoản riêng.
 *   4. Tạo bản ghi qua API (application, interview, note).
 *   5. Helper UI (toast, search, login form, ảnh nhỏ).
 *
 * Nguyên tắc chung: các helper ở đây KHÔNG được phụ thuộc vào state có sẵn của
 * app. Mỗi lần gọi phải độc lập, không dùng chung tài khoản demo@example.com —
 * đó là dữ liệu seed có thể bị thay đổi giữa các lần chạy.
 */

/** Fixture `playwright` (dùng để mở thêm API context riêng biệt). */
export type PlaywrightFixture = PlaywrightWorkerArgs["playwright"];

/* ------------------------------------------------------------------ basics */

export const testPassword = "password123";

export type TestUser = { email: string; password: string };

/**
 * Sinh giá trị duy nhất xuyên test, worker và các lần chạy lặp lại.
 *
 * Ghép timestamp (mili-giây) với một chuỗi base36 ngẫu nhiên 6 ký tự — đủ để
 * tránh trùng ngay cả khi nhiều worker chạy song song trong cùng một giây.
 * Dùng cho tên công ty, tiêu đề ghi chú, tiêu đề phỏng vấn... để mỗi test chỉ
 * tương tác với dữ liệu do chính nó tạo ra.
 */
export function uniqueValue(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Email duy nhất, chữ thường. Dùng cho tài khoản đăng ký mới. */
export function uniqueEmail(prefix = "e2e-user") {
  return `${uniqueValue(prefix)}@example.com`.toLowerCase();
}

/** Chuỗi gồm `length` ký tự `char` giống nhau — tiện cho test giới hạn ký tự. */
export function repeated(char: string, length: number) {
  return char.repeat(length);
}

/**
 * Sinh một địa chỉ IPv4 private ngẫu nhiên.
 *
 * Mục đích: cấp IP riêng cho mỗi test để không cạn budget rate-limit của API.
 * Xem giải thích đầy đủ trong fixtures.ts.
 *
 * Địa chỉ luôn thuộc dải 10.x.x.x (private), octet cuối được đảm bảo khác 0
 * (vì `|| 1`) để tránh vô tình sinh ra địa chỉ mạng.
 */
export function randomIp() {
  const [a, b, c] = randomBytes(3);
  return `10.${a}.${b}.${c || 1}`;
}

/** Header `x-forwarded-for` sẵn sàng truyền vào API context. */
export const ipHeader = (ip: string = randomIp()) => ({ "x-forwarded-for": ip });

/**
 * Tạo một API client thứ hai, HOÀN TOÀN độc lập với client hiện tại.
 *
 * Khác biệt so với `request` fixture của Playwright:
 *   - Cookie jar riêng — có thể đăng nhập tài khoản khác mà không ảnh hưởng
 *     session của test chính (dùng cho test cách ly dữ liệu giữa hai tài khoản).
 *   - IP riêng — tránh dùng chung budget rate-limit.
 *
 * Nhớ gọi `.dispose()` khi xong để giải phóng tài nguyên.
 */
export async function newApiContext(playwright: PlaywrightFixture, baseURL: string | undefined, ip: string = randomIp()) {
  return playwright.request.newContext({ baseURL, extraHTTPHeaders: ipHeader(ip) });
}

/* ------------------------------------------------------------------- dates */

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Trả về ngày `yyyy-MM-dd` theo giờ LOCAL của máy test, cộng/trừ `offsetDays`
 * so với hôm nay (hoặc so với `base` nếu truyền vào).
 *
 * Cố ý KHÔNG dùng `toISOString()` vì hàm đó chuyển sang UTC và có thể trả về
 * ngày hôm qua/hôm nay lệch một ngày so với kỳ vọng của người dùng cuối. Test
 * và app được giả định chạy cùng timezone (đúng với môi trường `next dev` local).
 */
export function isoDay(offsetDays = 0, base: Date = new Date()) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offsetDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Trả về `yyyy-MM-ddTHH:mm` theo giờ local — đúng định dạng mà
 * `<input type="datetime-local">` và API chấp nhận (không có giây, không có Z).
 */
export function isoLocal(offsetDays: number, hhmm = "09:00") {
  return `${isoDay(offsetDays)}T${hhmm}`;
}

/* ------------------------------------------------------------ accounts (API) */

/**
 * Đăng ký một tài khoản dùng-một-lần qua API và trả về credentials.
 *
 * LƯU Ý: hàm này KHÔNG đăng nhập. Nếu cần vừa đăng ký vừa đăng nhập, dùng
 * `signInApi()`. Nếu cần đăng nhập trên chính browser, dùng
 * `loginAsFreshTestUser(page)`.
 *
 * Truyền `page.request` để chia sẻ cookie jar với page; truyền `request` (fixture)
 * khi test chỉ thao tác ở tầng API, không cần browser.
 *
 * Không bao giờ dùng demo@example.com: đó là tài khoản seed dùng chung, có thể
 * đã bị thay đổi bởi test khác.
 */
export async function registerFreshUser(
  request: APIRequestContext,
  overrides: { name?: string; email?: string; password?: string } = {}
): Promise<TestUser> {
  const email = overrides.email ?? uniqueEmail();
  const password = overrides.password ?? testPassword;
  const register = await request.post("/api/auth/register", {
    data: { name: overrides.name ?? "E2E User", email, password, confirmPassword: password },
  });
  // Kỳ vọng 201; nếu khác, in body để biết server trả lỗi gì.
  expect(register.status(), await register.text()).toBe(201);
  return { email, password };
}

/**
 * Đăng nhập qua API (đặt cookie session vào cookie jar của context).
 * `rememberMe` quyết định cookie có expire sau 30 ngày hay chết cùng browser.
 */
export async function loginApi(request: APIRequestContext, user: TestUser, rememberMe = false) {
  const login = await request.post("/api/auth/login", { data: { email: user.email, password: user.password, rememberMe } });
  expect(login.status(), await login.text()).toBe(200);
  return login;
}

/** Đăng ký + đăng nhập liền mạch trên cùng API context. Trả về credentials. */
export async function signInApi(request: APIRequestContext, overrides: { name?: string; rememberMe?: boolean } = {}) {
  const user = await registerFreshUser(request, { name: overrides.name });
  await loginApi(request, user, overrides.rememberMe ?? false);
  return user;
}

/**
 * Đọc token `jat_session` thô từ cookie jar của context.
 * Dùng cho test cần kiểm tra nội dung JWT (ví dụ: decode payload xem userId).
 */
export async function readSessionToken(request: APIRequestContext) {
  const state = await request.storageState();
  const cookie = state.cookies.find((c) => c.name === "jat_session");
  return cookie?.value ?? null;
}

/**
 * Giải mã payload của JWT mà KHÔNG xác thực chữ ký.
 * Chỉ dùng để đọc các claim trong test — không dùng cho mục đích bảo mật.
 */
export function decodeJwt(token: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
}

/* -------------------------------------------------------- records (API level) */

export type ApplicationRecord = { id: string; company: string; position: string; status: string; priority: string };
export type InterviewRecord = { id: string; title: string; applicationId: string };
export type NoteRecord = { id: string; title: string };

/**
 * Tạo application qua API với payload mặc định hợp lệ, cho phép override từng
 * trường. Trả về bản ghi đã tạo (kèm id).
 *
 * Mặc định đặt appliedDate = "2026-08-01" (ngày cố định trong tương lai gần)
 * để tránh vô tình kích hoạt logic "quá hạn" khi test không quan tâm tới hạn chót.
 */
export async function apiCreateApplication(request: APIRequestContext, overrides: Record<string, unknown> = {}) {
  const response = await request.post("/api/applications", {
    data: {
      company: uniqueValue("E2E Company"),
      position: "E2E Position",
      priority: "MEDIUM",
      status: "APPLIED",
      appliedDate: "2026-08-01",
      ...overrides,
    },
  });
  expect(response.status(), await response.text()).toBe(201);
  return (await response.json()).application as ApplicationRecord;
}

/**
 * Tạo interview gắn với một application qua API.
 * Mặc định scheduledAt = 7 ngày kể từ hôm nay (local), result = PENDING —
 * đủ để interview rơi vào hầu hết các preset thống kê (7 ngày, 30 ngày, 6 tháng).
 */
export async function apiCreateInterview(request: APIRequestContext, applicationId: string, overrides: Record<string, unknown> = {}) {
  const response = await request.post("/api/interviews", {
    data: {
      applicationId,
      title: uniqueValue("E2E Interview"),
      type: "TECHNICAL",
      scheduledAt: isoLocal(7, "09:00"),
      result: "PENDING",
      ...overrides,
    },
  });
  expect(response.status(), await response.text()).toBe(201);
  return (await response.json()).interview as InterviewRecord;
}

/**
 * Tạo note qua API. `target` xác định note thuộc application hay interview —
 * đúng một trong hai trường phải được cung cấp, theo ràng buộc của API.
 */
export async function apiCreateNote(
  request: APIRequestContext,
  target: { applicationId: string } | { interviewId: string },
  overrides: Record<string, unknown> = {}
) {
  const response = await request.post("/api/notes", {
    data: { ...target, title: uniqueValue("E2E Note"), content: "E2E note content", ...overrides },
  });
  expect(response.status(), await response.text()).toBe(201);
  return (await response.json()).note as NoteRecord;
}

/**
 * Payload đầy đủ, hợp lệ cho application — dùng khi test cần gửi PUT (thay thế
 * toàn bộ bản ghi, không phải PATCH từng phần). Spread payload này rồi override
 * trường cần thay đổi.
 */
export function applicationPayload(overrides: Record<string, unknown> = {}) {
  return {
    company: "Payload Co",
    position: "QA Engineer",
    priority: "MEDIUM",
    status: "APPLIED",
    appliedDate: "2026-08-01",
    ...overrides,
  };
}

/** Payload đầy đủ, hợp lệ cho interview (dùng cho PUT). */
export function interviewPayload(applicationId: string, overrides: Record<string, unknown> = {}) {
  return {
    applicationId,
    title: "Payload Round",
    type: "TECHNICAL",
    scheduledAt: isoLocal(7, "09:00"),
    result: "PENDING",
    ...overrides,
  };
}

/* ------------------------------------------------- records (page-based, UI) */

// Các wrapper dưới đây nhận `page` thay vì `request`, tiện cho test UI — chúng
// dùng cookie jar của chính browser page nên ghi vào đúng tài khoản đang đăng
// nhập trong phiên test đó.
export const createApplication = (page: Page, overrides: Record<string, unknown> = {}) =>
  apiCreateApplication(page.request, overrides);

export const createInterview = (page: Page, applicationId: string, overrides: Record<string, unknown> = {}) =>
  apiCreateInterview(page.request, applicationId, overrides);

export const createNote = (page: Page, applicationId: string, overrides: Record<string, unknown> = {}) =>
  apiCreateNote(page.request, { applicationId }, overrides);

/* ------------------------------------------------------------- UI (browser) */

/**
 * Điền email + mật khẩu và submit form đăng nhập đang hiển thị.
 * Yêu cầu trang hiện tại đã ở /login với form đã render xong.
 */
export async function submitLoginForm(page: Page, user: TestUser) {
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Mật khẩu").fill(user.password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
}

/**
 * CHỈ dùng cho mục đích thủ công / khám phá thủ công.
 *
 * Không test nào trong suite này đăng nhập bằng tài khoản demo dùng chung, vì
 * dữ liệu có thể bị thay đổi giữa các lần chạy. Luôn dùng
 * `loginAsFreshTestUser()` cho test tự động.
 */
export async function loginAsDemo(page: Page) {
  await page.goto("/login");
  await submitLoginForm(page, { email: "demo@example.com", password: testPassword });
  await expect(page).toHaveURL(/\/dashboard/);
}

/**
 * Helper chuẩn để test đăng nhập: tạo tài khoản mới qua API, đăng nhập browser
 * bằng chính tài khoản đó, và dừng lại ở /dashboard.
 *
 * Trả về credentials để test có thể dùng lại (ví dụ đăng nhập lại sau khi đổi
 * mật khẩu, hoặc kiểm tra tài khoản đã bị xóa chưa).
 *
 * Đây là điểm vào phổ biến nhất cho mọi `test.beforeEach`.
 */
export async function loginAsFreshTestUser(page: Page): Promise<TestUser> {
  const user = await registerFreshUser(page.request);
  await loginApi(page.request, user);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/);
  return user;
}

/* ----------------------------------------------------------------- UI helpers */

/**
 * Trả về toast đang hiển thị khớp với `message`.
 *
 * Toast có hai role: "status" (thành công) và "alert" (lỗi) — xem
 * shared/ui/Toast.tsx. Dùng `.first()` vì ToastProvider render toast mới nhất
 * trước, và các toast cũ có thể còn hiển thị một lúc trong animation thoát —
 * nếu không chọn cẩn thận sẽ vi phạm strict mode khi cùng thông báo được push
 * hai lần liên tiếp.
 */
export function toast(page: Page, message: string | RegExp) {
  return page.getByRole("status").or(page.getByRole("alert")).filter({ hasText: message }).first();
}

/**
 * Gõ từ khóa vào ô tìm kiếm application trên /applications và chờ debounce
 * fetch xong (dựa vào param `search=` xuất hiện trong URL request).
 *
 * Cần thiết vì ô search debounce input — gõ xong ngay lập tức rồi assert
 * list sẽ race với request đang bay.
 */
export async function searchApplications(page: Page, text: string) {
  const loaded = page.waitForResponse((res) => res.url().includes("/api/applications?") && res.url().includes("search="));
  // Nuốt lỗi ở đây để nếu assertion bên dưới fail sớm, không có unhandled
  // rejection từ promise này.
  loaded.catch(() => undefined);
  await page.getByPlaceholder("Tìm theo tên công ty hoặc vị trí…").fill(text);
  await loaded;
}

/**
 * Một PNG 1×1 hợp lệ, kích thước tối thiểu — dùng cho test upload avatar.
 * Cố ý rất nhỏ để test nhanh và để app resize thành ảnh JPEG nhỏ hơn.
 */
export const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);