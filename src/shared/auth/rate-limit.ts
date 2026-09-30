import "server-only";
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/db/prisma";

/** Tham số của một bộ đếm giới hạn tần suất. */
type RateLimitOptions = {
  /** Nhóm bộ đếm, ví dụ `login-email` hoặc `register-ip`. */
  scope: string;
  /** Đối tượng bị giới hạn trong nhóm đó (email, địa chỉ IP...). */
  identifier: string;
  /** Số lượt tối đa trong một cửa sổ thời gian. */
  limit: number;
  /** Độ dài cửa sổ thời gian, tính bằng mili giây. */
  windowMs: number;
};

/** Kết quả một lần tiêu thụ bộ đếm. */
type RateLimitResult = {
  /** `true` nếu request được phép đi tiếp. */
  allowed: boolean;
  /** Số giây còn lại đến khi cửa sổ hiện tại kết thúc (dùng cho header `Retry-After`). */
  retryAfterSeconds: number;
};

/**
 * Băm SHA-256 chuỗi `scope:identifier` để làm khóa bộ đếm, tránh lưu email/IP ở dạng rõ trong DB.
 *
 * @returns Chuỗi hex 64 ký tự.
 */
function hashKey(scope: string, identifier: string) {
  return createHash("sha256").update(`${scope}:${identifier}`).digest("hex");
}

/**
 * Tiêu thụ một lượt của bộ đếm cửa sổ cố định lưu trong PostgreSQL. Thao tác `INSERT ... ON CONFLICT DO UPDATE`
 * là nguyên tử nên an toàn khi nhiều request đến cùng lúc: cửa sổ hết hạn thì đếm lại từ 1,
 * còn trong cửa sổ thì tăng số đếm.
 *
 * LƯU Ý (lỗi đã biết): số đếm bị chặn trần ở `limit` (`count < limit ? count + 1 : count`) trong khi điều kiện
 * cho phép là `count <= limit`, nên `allowed` luôn là `true` và bộ đếm hiện không chặn request nào.
 * Cách sửa: cho phép đếm tới `limit + 1` (đổi `<` thành `<=` trong câu SQL) rồi giữ nguyên `count <= limit`.
 *
 * @param options Nhóm, đối tượng, số lượt tối đa và độ dài cửa sổ.
 * @returns Có được phép hay không và số giây phải chờ.
 */
export async function consumeRateLimit({ scope, identifier, limit, windowMs }: RateLimitOptions): Promise<RateLimitResult> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowMs);
  const key = hashKey(scope, identifier);
  const rows = await prisma.$queryRaw<Array<{ count: number; expires_at: Date }>>`
    INSERT INTO "auth_rate_limits" ("key", "count", "window_start", "expires_at")
    VALUES (${key}, 1, ${now}, ${expiresAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "auth_rate_limits"."expires_at" <= ${now} THEN 1
        WHEN "auth_rate_limits"."count" < ${limit} THEN "auth_rate_limits"."count" + 1
        ELSE "auth_rate_limits"."count"
      END,
      "window_start" = CASE
        WHEN "auth_rate_limits"."expires_at" <= ${now} THEN ${now}
        ELSE "auth_rate_limits"."window_start"
      END,
      "expires_at" = CASE
        WHEN "auth_rate_limits"."expires_at" <= ${now} THEN ${expiresAt}
        ELSE "auth_rate_limits"."expires_at"
      END
    RETURNING "count", "expires_at"
  `;

  const row = rows[0];
  const retryAfterSeconds = Math.max(1, Math.ceil((row.expires_at.getTime() - now.getTime()) / 1000));
  return { allowed: row.count <= limit, retryAfterSeconds };
}

/** Xóa bộ đếm của một khóa, ví dụ sau khi đăng nhập thành công. */
export async function resetRateLimit({ scope, identifier }: Pick<RateLimitOptions, "scope" | "identifier">) {
  await prisma.$executeRaw`DELETE FROM "auth_rate_limits" WHERE "key" = ${hashKey(scope, identifier)}`;
}

/**
 * Lấy địa chỉ IP của client: ưu tiên phần tử đầu của `x-forwarded-for`, sau đó `x-real-ip`, cuối cùng là `unknown`.
 * Các header này do client hoặc proxy gửi lên nên chỉ đáng tin khi hệ thống chạy sau một reverse proxy tin cậy.
 *
 * @param request Request đang xử lý.
 * @returns Địa chỉ IP hoặc chuỗi `unknown`.
 */
export function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

/**
 * Tạo phản hồi 429 (quá nhiều yêu cầu) kèm header `Retry-After`.
 *
 * @param retryAfterSeconds Số giây client nên chờ trước khi thử lại.
 */
export function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau ít phút." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

/**
 * Tiêu thụ song song nhiều bộ đếm (ví dụ theo email và theo IP) trong cùng một lần gọi.
 *
 * @param options Danh sách bộ đếm cần tiêu thụ.
 * @returns Kết quả bị chặn đầu tiên nếu có, ngược lại là kết quả đầu tiên.
 */
export async function consumeRateLimits(options: RateLimitOptions[]) {
  const results = await Promise.all(options.map((option) => consumeRateLimit(option)));
  return results.find((result) => !result.allowed) ?? results[0];
}