import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/features/auth/auth.schema";
import { login, AuthError } from "@/features/auth/auth.service";
import { zodErrorResponse, errorResponse } from "@/shared/utils/validation";
import { AUTH_COOKIE_NAME, getCookieMaxAge } from "@/shared/auth/jwt";
import { consumeRateLimits, getClientIp, rateLimitResponse, resetRateLimit } from "@/shared/auth/rate-limit";

/**
 * `POST /api/auth/login` — xác thực và đăng nhập.
 * Bị giới hạn tần suất theo cả email (5 lần / 15 phút) lẫn theo IP (30 lần / 15 phút) để chặn dò mật khẩu.
 * Đăng nhập thành công thì cấp cookie phiên (`AUTH_COOKIE_NAME`); thời hạn cookie phụ thuộc `rememberMe`.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const email = parsed.data.email.toLowerCase().trim();
  const rateLimit = await consumeRateLimits([
    { scope: "login-email", identifier: email, limit: 5, windowMs: 15 * 60 * 1000 },
    { scope: "login-ip", identifier: getClientIp(req), limit: 30, windowMs: 15 * 60 * 1000 },
  ]);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);

  try {
    const { token, user } = await login(parsed.data);

    // Chỉ những lần đăng nhập sai mới nên dồn vào giới hạn theo email; đăng nhập
    // đúng thì xóa bộ đếm để người dùng hợp lệ không bị khóa oan.
    await resetRateLimit({ scope: "login-email", identifier: email }).catch((err) => {
      console.error("Reset login rate limit error:", err);
    });

    const res = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl },
    });

    res.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: getCookieMaxAge(parsed.data.rememberMe),
    });

    return res;
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, 401);
    console.error("Login error:", err);
    return errorResponse("Đã xảy ra lỗi. Vui lòng thử lại.", 500);
  }
}
