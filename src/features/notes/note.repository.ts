import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/db/prisma";
import type { NoteQuery } from "./note.schema";

/**
 * Các quan hệ luôn được nạp kèm khi trả về ghi chú: thông tin rút gọn của đơn ứng tuyển hoặc buổi phỏng vấn mà ghi chú gắn vào.
 */
const noteInclude = {
  application: { select: { id: true, company: true, position: true } },
  interview: {
    select: {
      id: true,
      title: true,
      scheduledAt: true,
      application: { select: { id: true, company: true, position: true } },
    },
  },
} satisfies Prisma.NoteInclude;

/** Đếm tổng số ghi chú gắn với đơn ứng tuyển hoặc lịch phỏng vấn của người dùng. */
export function countNotes(userId: string) {
  return prisma.note.count({
    where: { OR: [{ application: { userId } }, { interview: { application: { userId } } }] },
  });
}

/**
 * Dựng điều kiện `where` của Prisma.
 * Quyền sở hữu được kiểm tra gián tiếp: ghi chú hợp lệ là ghi chú mà đơn ứng tuyển (trực tiếp) hoặc
 * buổi phỏng vấn (gián tiếp, qua đơn ứng tuyển của nó) thuộc về `userId`.
 */
function buildWhereClause(userId: string, query: Partial<NoteQuery>) {
  const ownership: Prisma.NoteWhereInput = {
    OR: [{ application: { userId } }, { interview: { application: { userId } } }],
  };

  const and: Prisma.NoteWhereInput[] = [ownership];

  if (query.search) {
    and.push({
      OR: [
        { title: { contains: query.search, mode: "insensitive" } },
        { content: { contains: query.search, mode: "insensitive" } },
      ],
    });
  }

  if (query.applicationId) and.push({ applicationId: query.applicationId });
  if (query.interviewId) and.push({ interviewId: query.interviewId });
  if (query.linkType === "application") and.push({ applicationId: { not: null } });
  if (query.linkType === "interview") and.push({ interviewId: { not: null } });

  return { AND: and };
}

/** Truy vấn danh sách ghi chú có phân trang, kèm thông tin rút gọn của đơn/phỏng vấn liên quan. */
export async function listNotes(userId: string, query: NoteQuery) {
  const where = buildWhereClause(userId, query);
  const skip = (query.page - 1) * query.pageSize;

  const [items, total] = await Promise.all([
    prisma.note.findMany({
      where,
      orderBy: { createdAt: query.sortDir },
      skip,
      take: query.pageSize,
      include: noteInclude,
    }),
    prisma.note.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

/** Lấy một ghi chú theo id; trả `null` nếu không thuộc về `userId`. */
export function getNoteById(userId: string, id: string) {
  return prisma.note.findFirst({
    where: {
      id,
      OR: [{ application: { userId } }, { interview: { application: { userId } } }],
    },
    include: noteInclude,
  });
}

/**
 * Tạo bản ghi ghi chú mới. Không tự kiểm tra quyền sở hữu — việc đó do tầng service đảm nhiệm trước khi gọi.
 */
export function createNote(data: Prisma.NoteUncheckedCreateInput) {
  return prisma.note.create({ data, include: noteInclude });
}

/**
 * Cập nhật ghi chú bằng `updateMany` với điều kiện quyền sở hữu gián tiếp qua đơn/phỏng vấn.
 *
 * @returns Bản ghi sau cập nhật, hoặc `null` nếu không có dòng nào khớp.
 */
export async function updateNote(userId: string, id: string, data: Prisma.NoteUncheckedUpdateInput) {
  const { count } = await prisma.note.updateMany({
    where: {
      id,
      OR: [{ application: { userId } }, { interview: { application: { userId } } }],
    },
    data,
  });
  if (count === 0) return null;
  return prisma.note.findUnique({ where: { id }, include: noteInclude });
}

/** Xóa một ghi chú, với cùng điều kiện quyền sở hữu gián tiếp như `updateNote`. */
export async function deleteNote(userId: string, id: string) {
  const { count } = await prisma.note.deleteMany({
    where: {
      id,
      OR: [{ application: { userId } }, { interview: { application: { userId } } }],
    },
  });
  return count > 0;
}

/** Kiểm tra một đơn ứng tuyển có thuộc về `userId` hay không. */
export function applicationBelongsToUser(userId: string, applicationId: string) {
  return prisma.application.findFirst({ where: { id: applicationId, userId }, select: { id: true } });
}

/** Kiểm tra một buổi phỏng vấn có thuộc về `userId` hay không (qua đơn ứng tuyển của nó). */
export function interviewBelongsToUser(userId: string, interviewId: string) {
  return prisma.interview.findFirst({
    where: { id: interviewId, application: { userId } },
    select: { id: true },
  });
}
