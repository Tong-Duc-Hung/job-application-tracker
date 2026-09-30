import { NextRequest, NextResponse } from "next/server";
import { registerSchema } from "@/features/auth/auth.schema";
import { register, AuthError } from "@/features/auth/auth.service";
import { zodErrorResponse, errorResponse } from "@/shared/utils/validation";
import { consumeRateLimit, getClientIp, rateLimitResponse } from "@/shared/auth/rate-limit";
import { Prisma } from "@prisma/client";

/**
 * `POST /api/auth/register` — tạo tài khoản mới.
 * Bị giới hạn tần suất theo IP (10 lần / giờ). Bắt cả lỗi nghiệp vụ (`AuthError`, email trùng — 409)
 * lẫn lỗi ràng buộc duy nhất từ Prisma (mã `P2002`) cho trường hợp hai request đăng ký cùng email
 * gần như đồng thời và vượt qua được lần kiểm tra tồn tại ở tầng service.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const rateLimit = await consumeRateLimit({
    scope: "register-ip",
    identifier: getClientIp(req),
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);

  try {
    const user = await register(parsed.data);
    return NextResponse.json(
      { user: { id: user.id, name: user.name, email: user.email } },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, 409);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return errorResponse("Email này đã được sử dụng", 409);
    }
    console.error("Register error:", err);
    return errorResponse("Đã xảy ra lỗi. Vui lòng thử lại.", 500);
  }
}
