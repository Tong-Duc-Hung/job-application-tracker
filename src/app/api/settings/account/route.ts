import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/shared/auth/session";
import * as settingsService from "@/features/settings/settings.service";
import { deleteAccountSchema } from "@/features/settings/settings.schema";
import { AUTH_COOKIE_NAME } from "@/shared/auth/jwt";
import { unauthorizedResponse, errorResponse, zodErrorResponse } from "@/shared/utils/validation";

/**
 * `DELETE /api/settings/account` — xóa vĩnh viễn tài khoản sau khi xác nhận mật khẩu; xóa luôn cookie phiên hiện tại.
 */
export async function DELETE(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const parsed = deleteAccountSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return zodErrorResponse(parsed.error);

  try {
    await settingsService.deleteAccount(userId, parsed.data.password);
    const res = NextResponse.json({ success: true });
    res.cookies.set(AUTH_COOKIE_NAME, "", { path: "/", maxAge: 0 });
    return res;
  } catch (err) {
    if (err instanceof settingsService.SettingsError) return errorResponse(err.message, 400);
    console.error("Delete account error:", err);
    return errorResponse("Không thể xóa tài khoản. Vui lòng thử lại.", 500);
  }
}
