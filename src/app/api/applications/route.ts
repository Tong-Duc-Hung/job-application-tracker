import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/shared/auth/session";
import { applicationFormSchema, applicationQuerySchema } from "@/features/applications/application.schema";
import * as applicationService from "@/features/applications/application.service";
import { zodErrorResponse, unauthorizedResponse, errorResponse } from "@/shared/utils/validation";

/**
 * `GET /api/applications` — danh sách đơn ứng tuyển của người dùng hiện tại (tìm kiếm/lọc/sắp xếp/phân trang
 * qua query string, xác thực bằng `applicationQuerySchema`).
 */
export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = applicationQuerySchema.safeParse(params);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  try {
    const result = await applicationService.listApplications(userId, parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    console.error("List applications error:", err);
    return errorResponse("Không thể tải danh sách đơn ứng tuyển. Vui lòng thử lại.", 500);
  }
}

/** `POST /api/applications` — tạo đơn ứng tuyển mới; trả về 201 kèm bản ghi vừa tạo. */
export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const body = await req.json().catch(() => null);
  const parsed = applicationFormSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  try {
    const application = await applicationService.createApplication(userId, parsed.data);
    return NextResponse.json({ application }, { status: 201 });
  } catch (err) {
    console.error("Create application error:", err);
    return errorResponse("Không thể tạo đơn ứng tuyển. Vui lòng thử lại.", 500);
  }
}
