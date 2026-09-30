import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/shared/auth/session";
import { AUTH_COOKIE_NAME } from "@/shared/auth/jwt";
import { passwordSchema } from "@/features/settings/settings.schema";
import * as settingsService from "@/features/settings/settings.service";
import { zodErrorResponse, unauthorizedResponse, errorResponse } from "@/shared/utils/validation";

/**
 * `PUT /api/settings/password` — đổi mật khẩu.
 * Sau khi đổi thành công, cookie phiên hiện tại bị xóa ngay tại đây (không chỉ tăng `sessionVersion`
 * ở tầng service) để tránh vòng lặp chuyển hướng ở proxy.ts khi client điều hướng người dùng tới /login.
 */
export async function PUT(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const body = await req.json().catch(() => null);
  const parsed = passwordSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  try {
    await settingsService.changePassword(userId, parsed.data);
    // changePassword tăng sessionVersion nên cookie hiện tại đã vô hiệu; xóa nó để
    // lần điều hướng tới /login không bị proxy đẩy ngược về /dashboard.
    const res = NextResponse.json({ success: true });
    res.cookies.set(AUTH_COOKIE_NAME, "", { path: "/", maxAge: 0 });
    return res;
  } catch (err) {
    if (err instanceof settingsService.SettingsError) return errorResponse(err.message, 400);
    console.error("Change password error:", err);
    return errorResponse("Không thể đổi mật khẩu. Vui lòng thử lại.", 500);
  }
}
