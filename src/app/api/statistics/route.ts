import { NextRequest, NextResponse } from "next/server";
import { addDays } from "date-fns";
import { requireUserId } from "@/shared/auth/session";
import * as statisticsService from "@/features/statistics/statistics.service";
import { unauthorizedResponse, errorResponse } from "@/shared/utils/validation";

/**
 * `GET /api/statistics?tab=applications|interviews&from=&to=` — số liệu thống kê cho trang Thống kê.
 * `to` được hiểu là bao gồm cả ngày đó (cộng thêm 1 ngày rồi dùng làm mốc `lt` khi lọc), nên `from` và `to`
 * có thể trùng nhau để lọc đúng một ngày.
 *
 * @param req Query gồm `tab` ("applications" hoặc "interviews", mặc định "applications") và tùy chọn `from`/`to`
 * dạng `YYYY-MM-DD`.
 */
export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const tab = req.nextUrl.searchParams.get("tab") ?? "applications";
  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");

  if (tab !== "applications" && tab !== "interviews") {
    return errorResponse("Khoảng thời gian thống kê không hợp lệ.", 400);
  }

  if ((fromParam && !isValidDateOnly(fromParam)) || (toParam && !isValidDateOnly(toParam))) {
    return errorResponse("Khoảng thời gian thống kê không hợp lệ.", 400);
  }

  const from = fromParam ? new Date(`${fromParam}T00:00:00`) : undefined;
  const toDate = toParam ? new Date(`${toParam}T00:00:00`) : undefined;
  const to = toDate ? addDays(toDate, 1) : undefined;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime())) || (from && to && from >= to)) {
    return errorResponse("Khoảng thời gian thống kê không hợp lệ.", 400);
  }
  const range = { from, to };

  try {
    if (tab === "interviews") {
      const data = await statisticsService.getInterviewStatistics(userId, range);
      return NextResponse.json({ interviews: data });
    }
    const data = await statisticsService.getApplicationStatistics(userId, range);
    return NextResponse.json({ applications: data });
  } catch (err) {
    console.error("Statistics error:", err);
    return errorResponse("Không thể tải thống kê. Vui lòng thử lại.", 500);
  }
}

/**
 * Kiểm tra chuỗi có đúng định dạng `YYYY-MM-DD` và là một ngày tồn tại trên lịch hay không
 * (tự tính số ngày tối đa của từng tháng, có tính năm nhuận).
 *
 * @param value Chuỗi cần kiểm tra.
 * @returns `true` nếu là ngày hợp lệ.
 */
function isValidDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const [, year, month, day] = match;
  const maxDay = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
  return Number(month) >= 1 && Number(month) <= 12 && Number(day) >= 1 && Number(day) <= maxDay;
}
