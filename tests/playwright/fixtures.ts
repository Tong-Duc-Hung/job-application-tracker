import { test as base, expect } from "@playwright/test";
import { randomIp } from "./helpers";

/**
 * Fixture tùy chỉnh dùng chung cho TOÀN BỘ test suite.
 *
 * Mọi file spec đều import `test` từ ĐÂY thay vì từ "@playwright/test". Nhờ vậy
 * tất cả test đều tự động nhận một IP client riêng biệt — điều mà bộ test này
 * cần vì lý do rate-limit:
 *
 *   - API rate-limit các endpoint xác thực theo địa chỉ IP client (register:
 *     10 lần/giờ, login: 30 lần/15 phút, cộng thêm rate-limit theo từng email).
 *   - IP được server đọc từ header `x-forwarded-for`.
 *
 * Nếu mọi test dùng chung một IP (mặc định "unknown" hoặc 127.0.0.1), chỉ cần
 * vài chục test chạy liên tiếp là cạn budget và bắt đầu fail với HTTP 429 —
 * ngay khi rate-limiter được bật đúng như thiết kế. Cấp IP riêng cho từng test
 * loại bỏ hoàn toàn vấn đề này mà không cần tắt rate-limit.
 *
 * Cách hoạt động:
 *   1. Fixture `clientIp` sinh một IPv4 private ngẫu nhiên cho mỗi test.
 *   2. Fixture `extraHTTPHeaders` (do Playwright cung cấp sẵn) được override để
 *      gắn `x-forwarded-for: <clientIp>` vào mọi request.
 *
 * Playwright áp dụng `extraHTTPHeaders` cho CẢ HAI:
 *   - fixture `request` (API call trong test, ví dụ `request.post(...)`), VÀ
 *   - browser context (mọi `fetch()` mà trang tự gọi trong lúc test chạy).
 *
 * Nhờ vậy cả request từ test lẫn request từ chính app đều mang cùng một IP,
 * giữ hành vi nhất quán giữa hai phía.
 */
export const test = base.extend<{ clientIp: string }>({
  // Sinh IP riêng cho từng test. Không có dependency nào khác, chỉ cần trả về
  // giá trị là dùng được.
  clientIp: async ({}, use) => {
    await use(randomIp());
  },

  // Ghi đè fixture `extraHTTPHeaders` mặc định: giữ nguyên header người dùng
  // đã cấu hình (nếu có) và thêm `x-forwarded-for` của test hiện tại.
  extraHTTPHeaders: async ({ clientIp, extraHTTPHeaders }, use) => {
    await use({ ...(extraHTTPHeaders ?? {}), "x-forwarded-for": clientIp });
  },
});

// Re-export `expect` để các file spec chỉ cần import từ "./fixtures" là đủ,
// không phải import riêng từ "@playwright/test".
export { expect };