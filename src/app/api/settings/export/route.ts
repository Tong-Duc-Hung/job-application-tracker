import { NextResponse } from "next/server";
import { requireUserId } from "@/shared/auth/session";
import * as settingsService from "@/features/settings/settings.service";
import { unauthorizedResponse, errorResponse } from "@/shared/utils/validation";

/**
 * `GET /api/settings/export` — xuất toàn bộ dữ liệu người dùng thành file JSON tải xuống (header `Content-Disposition: attachment`).
 */
export async function GET() {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const data = await settingsService.exportUserData(userId);
    const now = new Date();
    const dateStamp = [now.getDate(), now.getMonth() + 1, now.getFullYear()]
      .map((value, index) => (index < 2 ? String(value).padStart(2, "0") : String(value)))
      .join("-");
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="Job Application Tracker ${dateStamp}.json"`,
      },
    });
  } catch (err) {
    console.error("Export error:", err);
    return errorResponse("Không thể xuất dữ liệu. Vui lòng thử lại.", 500);
  }
}
