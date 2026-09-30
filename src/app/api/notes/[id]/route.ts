import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/shared/auth/session";
import { noteFormSchema } from "@/features/notes/note.schema";
import * as noteService from "@/features/notes/note.service";
import {
  zodErrorResponse,
  unauthorizedResponse,
  notFoundResponse,
  errorResponse,
} from "@/shared/utils/validation";

/** Tham số động của route: id ghi chú trong URL. */
interface Params {
  params: Promise<{ id: string }>;
}

/**
 * `GET /api/notes/:id` — chi tiết một ghi chú.
 * Không có `try/catch` như các handler `GET` chi tiết khác — xem ghi chú tương tự ở `notes/route.ts`.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const note = await noteService.getNote(userId, id);
  if (!note) return notFoundResponse("Không tìm thấy ghi chú này");
  return NextResponse.json({ note });
}

/** `PUT /api/notes/:id` — cập nhật một ghi chú (có thể đổi đối tượng liên kết). */
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const body = await req.json().catch(() => null);
  const parsed = noteFormSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  try {
    const note = await noteService.updateNote(userId, id, parsed.data);
    if (!note) return notFoundResponse("Không tìm thấy ghi chú này");
    return NextResponse.json({ note });
  } catch (err) {
    console.error("Update note error:", err);
    return errorResponse("Không thể cập nhật ghi chú. Vui lòng kiểm tra lại thông tin.", 400);
  }
}

/**
 * `DELETE /api/notes/:id` — xóa một ghi chú.
 * Không có `try/catch` như handler `DELETE` của applications/interviews — xem ghi chú tương tự ở `notes/route.ts`.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const deleted = await noteService.deleteNote(userId, id);
  if (!deleted) return notFoundResponse("Không tìm thấy ghi chú này");
  return NextResponse.json({ success: true });
}
