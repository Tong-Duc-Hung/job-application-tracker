import "server-only";
import { Prisma, InterviewType, InterviewResult } from "@prisma/client";
import { prisma } from "@/shared/db/prisma";
import type { InterviewQuery } from "./interview.schema";

/**
 * Chuẩn hóa mốc kết thúc cho bộ lọc `to`.
 * Giá trị chỉ có ngày (`YYYY-MM-DD`) được hiểu là "đến hết ngày đó" (23:59:59.999 UTC); nếu parse trực tiếp
 * bằng `new Date()`, giá trị chỉ-có-ngày sẽ thành 00:00 UTC và làm mất mọi buổi phỏng vấn diễn ra sau đó
 * trong cùng ngày. Chuỗi ISO đầy đủ được giữ nguyên.
 *
 * @param value Giá trị `to` từ query, dạng ngày hoặc ISO đầy đủ.
 */
function upperBound(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T23:59:59.999Z`) : new Date(value);
}

/**
 * Dựng điều kiện `where` của Prisma; luôn giới hạn theo `application.userId` để không lộ dữ liệu người dùng khác.
 */
function buildWhereClause(userId: string, query: Partial<InterviewQuery>) {
  const where: Prisma.InterviewWhereInput = {
    application: { userId },
  };

  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { application: { company: { contains: query.search, mode: "insensitive" } } },
    ];
  }

  if (query.type) where.type = query.type as InterviewType;
  if (query.result) where.result = query.result as InterviewResult;
  if (query.applicationId) where.applicationId = query.applicationId;

  if (query.from || query.to) {
    where.scheduledAt = {
      ...(query.from ? { gte: new Date(query.from) } : {}),
      ...(query.to ? { lte: upperBound(query.to) } : {}),
    };
  }

  return where;
}

/** Truy vấn danh sách phỏng vấn có phân trang, kèm thông tin rút gọn của đơn ứng tuyển và số ghi chú. */
export async function listInterviews(userId: string, query: InterviewQuery) {
  const where = buildWhereClause(userId, query);
  const skip = (query.page - 1) * query.pageSize;

  const [items, total] = await Promise.all([
    prisma.interview.findMany({
      where,
      orderBy: { scheduledAt: query.sortDir },
      skip,
      take: query.pageSize,
      include: {
        application: { select: { id: true, company: true, position: true, priority: true, status: true } },
        _count: { select: { notes: true } },
      },
    }),
    prisma.interview.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

/**
 * Lấy một buổi phỏng vấn theo id, kèm thông tin đơn ứng tuyển và ghi chú; trả `null` nếu không thuộc về `userId`.
 */
export function getInterviewById(userId: string, id: string) {
  return prisma.interview.findFirst({
    where: { id, application: { userId } },
    include: {
      application: { select: { id: true, company: true, position: true } },
      notes: { orderBy: { createdAt: "desc" } },
    },
  });
}

/**
 * Tạo bản ghi phỏng vấn mới. Không tự kiểm tra quyền sở hữu đơn ứng tuyển — việc đó do tầng service đảm nhiệm trước khi gọi.
 */
export function createInterview(data: Prisma.InterviewUncheckedCreateInput) {
  return prisma.interview.create({ data });
}

/**
 * Cập nhật phỏng vấn bằng `updateMany` với điều kiện `id + application.userId`.
 *
 * @returns Bản ghi sau cập nhật, hoặc `null` nếu không có dòng nào khớp.
 */
export async function updateInterview(
  userId: string,
  id: string,
  data: Prisma.InterviewUncheckedUpdateInput
) {
  const { count } = await prisma.interview.updateMany({
    where: { id, application: { userId } },
    data,
  });
  if (count === 0) return null;
  return prisma.interview.findUnique({ where: { id } });
}

/** Xóa một buổi phỏng vấn bằng `deleteMany` với điều kiện `id + application.userId`. */
export async function deleteInterview(userId: string, id: string) {
  const { count } = await prisma.interview.deleteMany({
    where: { id, application: { userId } },
  });
  return count > 0;
}

/**
 * Kiểm tra một đơn ứng tuyển có tồn tại và thuộc về `userId` hay không (dùng trước khi tạo/sửa phỏng vấn).
 */
export function applicationBelongsToUser(userId: string, applicationId: string) {
  return prisma.application.findFirst({ where: { id: applicationId, userId }, select: { id: true } });
}

/**
 * Lấy các buổi phỏng vấn còn PENDING và có `scheduledAt` từ hiện tại trở đi, sắp theo thời gian gần nhất trước.
 *
 * @param take Số lượng bản ghi tối đa (mặc định 5).
 */
export function upcomingInterviews(userId: string, take = 5) {
  return prisma.interview.findMany({
    where: { application: { userId }, scheduledAt: { gte: new Date() }, result: "PENDING" },
    orderBy: { scheduledAt: "asc" },
    take,
    include: { application: { select: { company: true, position: true } } },
  });
}

/** Lấy các lịch phỏng vấn gần nhất theo thời điểm diễn ra, mới nhất trước. */
export function recentInterviews(userId: string, take = 4) {
  return prisma.interview.findMany({
    where: { application: { userId } },
    orderBy: { scheduledAt: "desc" },
    take,
    include: { application: { select: { company: true, position: true } } },
  });
}

/** Đếm toàn bộ lịch phỏng vấn của người dùng. */
export function countInterviews(userId: string) {
  return prisma.interview.count({ where: { application: { userId } } });
}

/** Đếm số buổi phỏng vấn còn PENDING và chưa diễn ra tính từ `now`. */
export function countUpcomingInterviews(userId: string, now = new Date()) {
  return prisma.interview.count({
    where: { application: { userId }, scheduledAt: { gte: now }, result: "PENDING" },
  });
}
