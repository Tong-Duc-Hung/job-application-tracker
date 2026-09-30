import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/shared/auth/session";
import { applicationFormSchema } from "@/features/applications/application.schema";
import * as applicationService from "@/features/applications/application.service";
import {
  zodErrorResponse,
  unauthorizedResponse,
  notFoundResponse,
  errorResponse,
} from "@/shared/utils/validation";

/** Tham số động của route: id đơn ứng tuyển trong URL. */
interface Params {
  params: Promise<{ id: string }>;
}

/**
 * `GET /api/applications/:id` — chi tiết một đơn ứng tuyển; trả 404 nếu không tồn tại hoặc không thuộc về người dùng.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const application = await applicationService.getApplication(userId, id);
    if (!application) return notFoundResponse("Không tìm thấy đơn ứng tuyển này");
    return NextResponse.json({ application });
  } catch (err) {
    console.error("Get application error:", err);
    return errorResponse("Không thể tải đơn ứng tuyển. Vui lòng thử lại.", 500);
  }
}

/**
 * `PUT /api/applications/:id` — cập nhật toàn bộ một đơn ứng tuyển (thay thế, không phải patch từng phần).
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const body = await req.json().catch(() => null);
  const parsed = applicationFormSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  try {
    const application = await applicationService.updateApplication(userId, id, parsed.data);
    if (!application) return notFoundResponse("Không tìm thấy đơn ứng tuyển này");
    return NextResponse.json({ application });
  } catch (err) {
    console.error("Update application error:", err);
    return errorResponse("Không thể cập nhật đơn ứng tuyển. Vui lòng thử lại.", 500);
  }
}

/** `DELETE /api/applications/:id` — xóa một đơn ứng tuyển. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const deleted = await applicationService.deleteApplication(userId, id);
    if (!deleted) return notFoundResponse("Không tìm thấy đơn ứng tuyển này");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete application error:", err);
    return errorResponse("Không thể xóa đơn ứng tuyển. Vui lòng thử lại.", 500);
  }
}
