import "server-only";
import * as repo from "./note.repository";
import type { NoteFormInput, NoteQuery } from "./note.schema";

/** Lỗi nghiệp vụ của tầng ghi chú (thiếu liên kết hợp lệ, hoặc đơn/phỏng vấn không thuộc về người dùng). */
export class NoteError extends Error {}

/**
 * Chuẩn hóa dữ liệu form ghi chú đã qua Zod thành payload Prisma: chuỗi rỗng thành `null`, cắt khoảng trắng thừa.
 */
function toPrismaInput(input: NoteFormInput) {
  return {
    applicationId: input.applicationId || null,
    interviewId: input.interviewId || null,
    title: input.title.trim(),
    content: input.content.trim(),
  };
}

/** Lấy danh sách ghi chú của người dùng theo bộ lọc/sắp xếp/phân trang. */
export function listNotes(userId: string, query: NoteQuery) {
  return repo.listNotes(userId, query);
}

/** Đếm tổng số ghi chú của người dùng. */
export function countNotes(userId: string) {
  return repo.countNotes(userId);
}

/** Lấy chi tiết một ghi chú. */
export function getNote(userId: string, id: string) {
  return repo.getNoteById(userId, id);
}

/**
 * Kiểm tra đối tượng mà ghi chú sắp gắn vào (đơn ứng tuyển hoặc buổi phỏng vấn) thực sự thuộc về `userId`.
 * Ghi chú không tự mang `userId` — quyền sở hữu được suy ra gián tiếp qua đơn/phỏng vấn mà nó gắn vào,
 * nên bước kiểm tra này là bắt buộc trước khi tạo hoặc sửa.
 *
 * @throws NoteError nếu thiếu cả hai liên kết, hoặc đối tượng được liên kết không thuộc về `userId`.
 */
async function assertOwnership(userId: string, input: NoteFormInput) {
  if (input.applicationId) {
    const owned = await repo.applicationBelongsToUser(userId, input.applicationId);
    if (!owned) throw new NoteError("Không tìm thấy đơn ứng tuyển này");
  } else if (input.interviewId) {
    const owned = await repo.interviewBelongsToUser(userId, input.interviewId);
    if (!owned) throw new NoteError("Không tìm thấy lịch phỏng vấn này");
  } else {
    throw new NoteError("Ghi chú cần được liên kết với một đơn ứng tuyển hoặc một buổi phỏng vấn");
  }
}

/** Tạo ghi chú mới, sau khi xác nhận đối tượng liên kết thuộc về người dùng. */
export async function createNote(userId: string, input: NoteFormInput) {
  await assertOwnership(userId, input);
  return repo.createNote(toPrismaInput(input));
}

/** Cập nhật ghi chú, sau khi xác nhận đối tượng liên kết (mới, nếu bị đổi) thuộc về người dùng. */
export async function updateNote(userId: string, id: string, input: NoteFormInput) {
  await assertOwnership(userId, input);
  return repo.updateNote(userId, id, toPrismaInput(input));
}

/** Xóa một ghi chú. */
export function deleteNote(userId: string, id: string) {
  return repo.deleteNote(userId, id);
}
