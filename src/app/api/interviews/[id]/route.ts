import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/shared/auth/session";
import { interviewFormSchema } from "@/features/interviews/interview.schema";
import * as interviewService from "@/features/interviews/interview.service";
import {
  zodErrorResponse,
  unauthorizedResponse,
  notFoundResponse,
  errorResponse,
} from "@/shared/utils/validation";

/** Tham số động của route: id buổi phỏng vấn trong URL. */
interface Params {
  params: Promise<{ id: string }>;
}

/**
 * `GET /api/interviews/:id` — chi tiết một buổi phỏng vấn; trả 404 nếu không tồn tại hoặc không thuộc về người dùng.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const interview = await interviewService.getInterview(userId, id);
    if (!interview) return notFoundResponse("Không tìm thấy lịch phỏng vấn này");
    return NextResponse.json({ interview });
  } catch (err) {
    console.error("Get interview error:", err);
    return errorResponse("Không thể tải lịch phỏng vấn. Vui lòng thử lại.", 500);
  }
}

/** `PUT /api/interviews/:id` — cập nhật một buổi phỏng vấn (có thể đổi cả đơn ứng tuyển liên kết). */
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const body = await req.json().catch(() => null);
  const parsed = interviewFormSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  try {
    const interview = await interviewService.updateInterview(userId, id, parsed.data);
    if (!interview) return notFoundResponse("Không tìm thấy lịch phỏng vấn này");
    return NextResponse.json({ interview });
  } catch (err) {
    console.error("Update interview error:", err);
    return errorResponse("Không thể cập nhật lịch phỏng vấn. Vui lòng kiểm tra lại thông tin.", 400);
  }
}

/** `DELETE /api/interviews/:id` — xóa một buổi phỏng vấn. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const deleted = await interviewService.deleteInterview(userId, id);
    if (!deleted) return notFoundResponse("Không tìm thấy lịch phỏng vấn này");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete interview error:", err);
    return errorResponse("Không thể xóa lịch phỏng vấn. Vui lòng thử lại.", 500);
  }
}
