/** Đích chuyển hướng mặc định khi tham số quay lại không hợp lệ. */
const DEFAULT_REDIRECT = "/dashboard";
/** Các trang xác thực; không dùng làm đích quay lại để tránh vòng lặp chuyển hướng. */
const AUTH_PATHS = ["/login", "/register"];

/**
 * Chuẩn hoá đường dẫn quay lại sau khi đăng nhập (tham số `?from=`).
 * Chỉ chấp nhận đường dẫn nội bộ tuyệt đối như "/applications/abc" để tránh
 * open-redirect ("//evil.com", "/\evil.com", "https://evil.com"...).
 * Trang đăng nhập/đăng ký bị loại để không tạo vòng lặp chuyển hướng.
 */
export function getSafeRedirectPath(
  value: string | string[] | null | undefined,
  fallback: string = DEFAULT_REDIRECT
): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2000) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(raw)) return fallback;

  const path = raw.split(/[?#]/)[0];
  if (AUTH_PATHS.some((authPath) => path === authPath || path.startsWith(`${authPath}/`))) return fallback;

  return raw;
}
