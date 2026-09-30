import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/shared/auth/session";
import { noteFormSchema, noteQuerySchema } from "@/features/notes/note.schema";
import * as noteService from "@/features/notes/note.service";
import { zodErrorResponse, unauthorizedResponse, errorResponse } from "@/shared/utils/validation";

/**
 * `GET /api/notes` — danh sách ghi chú của người dùng hiện tại.
 * Không có `try/catch` quanh lệnh gọi service như các handler `GET` khác trong dự án — lỗi bất ngờ ở đây
 * sẽ trả về trang lỗi mặc định của Next.js thay vì JSON `{ error }` nhất quán.
 */
export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = noteQuerySchema.safeParse(params);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const result = await noteService.listNotes(userId, parsed.data);
  return NextResponse.json(result);
}

/** `POST /api/notes` — tạo ghi chú mới, gắn với một đơn ứng tuyển hoặc một buổi phỏng vấn. */
export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const body = await req.json().catch(() => null);
  const parsed = noteFormSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  try {
    const note = await noteService.createNote(userId, parsed.data);
    return NextResponse.json({ note }, { status: 201 });
  } catch (err) {
    console.error("Create note error:", err);
    return errorResponse("Không thể tạo ghi chú. Vui lòng kiểm tra lại thông tin.", 400);
  }
}
