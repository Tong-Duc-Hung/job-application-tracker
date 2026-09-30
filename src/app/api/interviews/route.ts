import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/shared/auth/session";
import { interviewFormSchema, interviewQuerySchema } from "@/features/interviews/interview.schema";
import * as interviewService from "@/features/interviews/interview.service";
import { zodErrorResponse, unauthorizedResponse, errorResponse } from "@/shared/utils/validation";

/**
 * `GET /api/interviews` — danh sách phỏng vấn của người dùng hiện tại (tìm kiếm/lọc theo loại, kết quả, đơn ứng tuyển, khoảng thời gian/sắp xếp/phân trang).
 */
export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = interviewQuerySchema.safeParse(params);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  try {
    const result = await interviewService.listInterviews(userId, parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    console.error("List interviews error:", err);
    return errorResponse("Không thể tải danh sách lịch phỏng vấn. Vui lòng thử lại.", 500);
  }
}

/**
 * `POST /api/interviews` — tạo buổi phỏng vấn mới.
 * Trả 400 (không phải 500) khi service ném `InterviewError`, ví dụ khi `applicationId` không tồn tại
 * hoặc không thuộc về người dùng.
 */
export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const body = await req.json().catch(() => null);
  const parsed = interviewFormSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  try {
    const interview = await interviewService.createInterview(userId, parsed.data);
    return NextResponse.json({ interview }, { status: 201 });
  } catch (err) {
    console.error("Create interview error:", err);
    return errorResponse("Không thể tạo lịch phỏng vấn. Vui lòng kiểm tra lại thông tin.", 400);
  }
}
