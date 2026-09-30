import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/shared/auth/session";
import { profileSchema } from "@/features/settings/settings.schema";
import * as settingsService from "@/features/settings/settings.service";
import { zodErrorResponse, unauthorizedResponse, errorResponse } from "@/shared/utils/validation";

/** `PUT /api/settings/profile` — cập nhật tên và ảnh đại diện. */
export async function PUT(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const body = await req.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  try {
    const user = await settingsService.updateProfile(userId, parsed.data);
    return NextResponse.json({ user });
  } catch (err) {
    console.error("Update profile error:", err);
    return errorResponse("Không thể cập nhật hồ sơ. Vui lòng thử lại.", 500);
  }
}
