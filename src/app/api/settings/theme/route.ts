import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/shared/auth/session";
import { themeSchema } from "@/features/settings/settings.schema";
import * as settingsService from "@/features/settings/settings.service";
import { zodErrorResponse, unauthorizedResponse, errorResponse } from "@/shared/utils/validation";

/** `PUT /api/settings/theme` — cập nhật lựa chọn giao diện (sáng/tối/theo hệ thống). */
export async function PUT(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const body = await req.json().catch(() => null);
  const parsed = themeSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  try {
    const user = await settingsService.updateTheme(userId, parsed.data.theme);
    return NextResponse.json({ user });
  } catch (err) {
    console.error("Update theme error:", err);
    return errorResponse("Không thể cập nhật giao diện. Vui lòng thử lại.", 500);
  }
}
