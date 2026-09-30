// Tiện ích ký và xác minh JWT cho phiên đăng nhập.
// Dùng thư viện `jose` (thay vì `jsonwebtoken`) vì chạy được trên mọi runtime: proxy.ts, API route
// và Server Component dùng chung một đoạn mã, không cần nhánh xử lý riêng cho từng môi trường.
// 
import { SignJWT, jwtVerify } from "jose";

/**
 * Lấy khóa bí mật `JWT_SECRET` từ biến môi trường và mã hóa thành mảng byte để ký/xác minh token.
 * Biến môi trường được đọc tại thời điểm gọi hàm, không đọc khi import module.
 *
 * @returns Khóa dạng `Uint8Array`.
 * @throws Error nếu chưa cấu hình `JWT_SECRET`.
 */
const encodedSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set. Add it to your .env file.");
  }
  return new TextEncoder().encode(secret);
};

/** Dữ liệu được lưu trong JWT phiên đăng nhập. */
export type SessionPayload = {
  userId: string;
  email: string;
  sessionVersion: number;
  /**
   * Phản ánh lựa chọn "Ghi nhớ đăng nhập" lúc đăng nhập. Quyết định cả thời hạn của token
   * lẫn việc proxy.ts có được phép âm thầm gia hạn phiên khi người dùng còn hoạt động hay không
   * (xem `shouldRefreshSession`).
   */
  remember: boolean;
};

/**
 * Thời hạn JWT của phiên "ghi nhớ đăng nhập": 30 ngày và được gia hạn ngầm khi người dùng còn hoạt động,
 * nghĩa là chỉ bị đăng xuất sau khoảng 30 ngày không quay lại.
 */
const REMEMBERED_SESSION_DURATION = "30d";
/** Thời hạn (giây) của cookie đi kèm phiên "ghi nhớ đăng nhập"; khớp với `REMEMBERED_SESSION_DURATION`. */
const REMEMBERED_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/**
 * Thời hạn JWT của phiên không ghi nhớ: cố định 12 giờ, không bao giờ được gia hạn.
 * Cookie của phiên này không có `maxAge` (xem `getCookieMaxAge`) nên mất khi đóng trình duyệt;
 * hạn của JWT chỉ là lớp bảo vệ dự phòng phòng trường hợp cookie không bị xóa.
 */
const SESSION_ONLY_DURATION = "12h";

/**
 * Ngưỡng tuổi token (1 ngày) để cấp lại token cho phiên "ghi nhớ". Nhờ vậy phiên của người dùng đang hoạt động
 * trượt dần về phía trước thay vì bị cắt cứng theo thời điểm đăng nhập ban đầu.
 */
const REFRESH_THRESHOLD_SECONDS = 24 * 60 * 60;

/**
 * Ký JWT (HS256) cho một phiên đăng nhập.
 * Thời hạn phụ thuộc `payload.remember`: 30 ngày nếu ghi nhớ, ngược lại 12 giờ.
 *
 * @param payload Thông tin phiên cần lưu vào token.
 * @returns Chuỗi JWT đã ký.
 */
export async function signSessionToken(payload: SessionPayload): Promise<string> {
  const duration = payload.remember ? REMEMBERED_SESSION_DURATION : SESSION_ONLY_DURATION;
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(duration)
    .sign(encodedSecret());
}

/** Phiên đã xác minh: payload cộng thêm thời điểm phát hành token (`iat`, tính bằng giây). */
export type VerifiedSession = SessionPayload & { issuedAt: number };

/**
 * Xác minh chữ ký, thời hạn và cấu trúc của JWT phiên.
 * Token cũ không có `sessionVersion` được coi là phiên bản 0 để tương thích ngược.
 *
 * @param token Chuỗi JWT lấy từ cookie.
 * @returns Phiên hợp lệ, hoặc `null` nếu token hết hạn, sai định dạng hoặc bị giả mạo.
 */
export async function verifySessionToken(token: string): Promise<VerifiedSession | null> {
  try {
    const { payload } = await jwtVerify(token, encodedSecret());
    if (
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.iat !== "number" ||
      (payload.sessionVersion !== undefined && typeof payload.sessionVersion !== "number")
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      email: payload.email,
      remember: payload.remember === true,
      sessionVersion: typeof payload.sessionVersion === "number" ? payload.sessionVersion : 0,
      issuedAt: payload.iat,
    };
  } catch {
    // Token hết hạn, sai định dạng hoặc bị can thiệp.
    return null;
  }
}

/**
 * Xác định `maxAge` của cookie đi kèm token.
 *
 * @param remember Người dùng có chọn "Ghi nhớ đăng nhập" hay không.
 * @returns Số giây sống của cookie; `undefined` nghĩa là cookie phiên (mất khi đóng hẳn trình duyệt),
 * dùng cho trường hợp không ghi nhớ.
 */
export function getCookieMaxAge(remember: boolean): number | undefined {
  return remember ? REMEMBERED_MAX_AGE_SECONDS : undefined;
}

/**
 * Cho biết proxy.ts có nên âm thầm cấp lại cookie cho phiên này ngay bây giờ không.
 * Chỉ trả về `true` với phiên "ghi nhớ" đã đủ cũ; phiên không ghi nhớ không bao giờ được gia hạn
 * vì chúng được thiết kế để tự hết hạn.
 *
 * @param session Phiên đã xác minh.
 * @returns `true` nếu cần cấp lại token.
 */
export function shouldRefreshSession(session: VerifiedSession): boolean {
  if (!session.remember) return false;
  const ageSeconds = Date.now() / 1000 - session.issuedAt;
  return ageSeconds > REFRESH_THRESHOLD_SECONDS;
}

/** Tên cookie chứa JWT phiên; có thể ghi đè bằng biến môi trường `AUTH_COOKIE_NAME`. */
export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "jat_session";
