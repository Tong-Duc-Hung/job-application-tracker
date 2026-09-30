import "server-only";
import { Prisma, ApplicationStatus, Priority } from "@prisma/client";
import { addDays, startOfDay, subDays } from "date-fns";
import { prisma } from "@/shared/db/prisma";
import type { ApplicationQuery } from "./application.schema";

const FINAL_APPLICATION_STATUSES = [ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN];
const DEADLINE_PROTECTED_STATUSES = [...FINAL_APPLICATION_STATUSES, ApplicationStatus.OFFER];

function utcStartOfLocalDay(date: Date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

/** Lưu trạng thái quá hạn cho các đơn còn hoạt động có hạn chót trước ngày hiện tại. */
export function refreshOverdueApplications(userId: string, now = new Date(), id?: string) {
  return prisma.application.updateMany({
    where: {
      userId,
      ...(id ? { id } : {}),
      deadline: { lt: utcStartOfLocalDay(now) },
      status: { notIn: [...DEADLINE_PROTECTED_STATUSES, ApplicationStatus.EXPIRED] },
    },
    data: { status: ApplicationStatus.EXPIRED },
  });
}

/**
 * Dựng điều kiện `where` của Prisma từ tham số truy vấn: luôn giới hạn theo `userId` (chống truy cập chéo
 * dữ liệu người dùng khác), cộng thêm điều kiện tìm kiếm/lọc nếu có.
 *
 * @param userId Id người dùng sở hữu dữ liệu.
 * @param query Tham số truy vấn (có thể chỉ có một phần các trường).
 */
export function buildWhereClause(userId: string, query: Partial<ApplicationQuery>) {
  const where: Prisma.ApplicationWhereInput = { userId };

  if (query.search) {
    where.OR = [
      { company: { contains: query.search, mode: "insensitive" } },
      { position: { contains: query.search, mode: "insensitive" } },
      { location: { contains: query.search, mode: "insensitive" } },
    ];
  }

  if (query.status) where.status = query.status as ApplicationStatus;
  if (query.priority) where.priority = query.priority as Priority;

  return where;
}

/**
 * Truy vấn danh sách đơn ứng tuyển có phân trang, kèm số lượng phỏng vấn/ghi chú của mỗi đơn.
 *
 * @returns Trang dữ liệu gồm `items`, `total`, `page`, `pageSize`.
 */
export async function listApplications(userId: string, query: ApplicationQuery) {
  await refreshOverdueApplications(userId);
  const where = buildWhereClause(userId, query);
  const skip = (query.page - 1) * query.pageSize;

  const [items, total] = await Promise.all([
    prisma.application.findMany({
      where,
      orderBy: { [query.sortBy]: query.sortDir },
      skip,
      take: query.pageSize,
      include: { _count: { select: { interviews: true, notes: true } } },
    }),
    prisma.application.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

/**
 * Lấy một đơn theo id, kèm toàn bộ phỏng vấn (đã kèm ghi chú) và ghi chú trực tiếp của đơn; trả `null` nếu không thuộc về `userId`.
 */
export async function getApplicationById(userId: string, id: string) {
  await refreshOverdueApplications(userId, new Date(), id);
  return prisma.application.findFirst({
    where: { id, userId },
    include: {
      interviews: { orderBy: { scheduledAt: "asc" }, include: { notes: { orderBy: { createdAt: "desc" } } } },
      notes: { orderBy: { createdAt: "desc" } },
    },
  });
}

/** Tạo bản ghi đơn ứng tuyển mới, tự gán `userId` sở hữu. */
export async function createApplication(userId: string, data: Omit<Prisma.ApplicationUncheckedCreateInput, "userId">) {
  const application = await prisma.application.create({ data: { ...data, userId } });
  await refreshOverdueApplications(userId, new Date(), application.id);
  return prisma.application.findUniqueOrThrow({ where: { id: application.id } });
}

/**
 * Cập nhật đơn ứng tuyển bằng `updateMany` với điều kiện `id + userId` để không cần truy vấn quyền sở hữu
 * riêng trước khi ghi (tránh race condition kiểu time-of-check-to-time-of-use).
 *
 * @returns Bản ghi sau cập nhật, hoặc `null` nếu không có dòng nào khớp (không tồn tại hoặc không thuộc `userId`).
 */
export async function updateApplication(
  userId: string,
  id: string,
  data: Prisma.ApplicationUncheckedUpdateInput
) {
  const { count } = await prisma.application.updateMany({ where: { id, userId }, data });
  if (count === 0) return null;
  await refreshOverdueApplications(userId, new Date(), id);
  return prisma.application.findUnique({ where: { id } });
}

/** Xóa đơn ứng tuyển bằng `deleteMany` với điều kiện `id + userId`; trả về đã xóa được hay không. */
export async function deleteApplication(userId: string, id: string) {
  const { count } = await prisma.application.deleteMany({ where: { id, userId } });
  return count > 0;
}

/** Đếm số đơn theo từng trạng thái bằng `groupBy` của Prisma. */
export async function countByStatus(userId: string) {
  await refreshOverdueApplications(userId);
  return prisma.application.groupBy({
    by: ["status"],
    where: { userId },
    _count: { _all: true },
  });
}

/** Đếm tổng số đơn ứng tuyển của người dùng. */
export function countApplications(userId: string) {
  return prisma.application.count({ where: { userId } });
}

/** Đếm số đơn có nội dung kinh nghiệm khác rỗng. */
export function countApplicationsWithExperience(userId: string) {
  return prisma.application.count({
    where: { userId, AND: [{ experience: { not: null } }, { experience: { not: "" } }] },
  });
}

/**
 * Đếm đơn đang xử lý (không phải trạng thái kết quả cuối cùng hoặc EXPIRED) và chưa quá hạn (không có hạn chót,
 * hoặc hạn chót từ hôm nay trở về sau).
 *
 * @param now Thời điểm tham chiếu "hôm nay" (mặc định thời điểm gọi hàm; cho phép truyền vào để test).
 */
export async function countActiveApplications(userId: string, now = new Date()) {
  await refreshOverdueApplications(userId, now);
  const today = startOfDay(now);
  return prisma.application.count({
    where: {
      userId,
      status: { notIn: [...FINAL_APPLICATION_STATUSES, ApplicationStatus.EXPIRED] },
      OR: [{ deadline: null }, { deadline: { gte: today } }],
    },
  });
}

/**
 * Đếm đơn chưa kết thúc có hạn chót rơi trong khoảng `[from, to]` (mặc định 3 ngày tới).
 *
 * @param from Mốc bắt đầu (mặc định thời điểm gọi hàm).
 * @param to Mốc kết thúc (mặc định `from` + 3 ngày).
 */
export async function countUpcomingDeadlines(userId: string, from = new Date(), to = new Date(from.getTime() + 3 * 24 * 60 * 60 * 1000)) {
  await refreshOverdueApplications(userId, from);
  const fromDay = startOfDay(from);
  return prisma.application.count({
    where: {
      userId,
      status: { notIn: [...FINAL_APPLICATION_STATUSES, ApplicationStatus.EXPIRED] },
      deadline: { gte: fromDay, lte: to },
    },
  });
}

/**
 * Lấy tối đa `take` cảnh báo hạn chót trong khoảng 3 ngày trước đến 3 ngày sau hôm nay.
 * Hạn từ hôm nay trở đi được xếp trước theo ngày gần nhất; sau đó là hạn đã qua, cũng gần hôm nay trước.
 *
 * @param take Số lượng bản ghi tối đa (mặc định 4).
 */
export function listUrgentDeadlines(userId: string, now = new Date(), take = 4) {
  const today = startOfDay(now);
  const pastWindowStart = subDays(today, 3);
  const futureWindowEnd = addDays(today, 4);

  return (async () => {
    await refreshOverdueApplications(userId, now);
    const where = {
      userId,
      status: { notIn: FINAL_APPLICATION_STATUSES },
    } satisfies Prisma.ApplicationWhereInput;
    const [upcoming, overdue] = await Promise.all([
      prisma.application.findMany({
        where: { ...where, deadline: { gte: today, lt: futureWindowEnd } },
        orderBy: { deadline: "asc" },
        take,
      }),
      prisma.application.findMany({
        where: { ...where, deadline: { gte: pastWindowStart, lt: today } },
        orderBy: { deadline: "desc" },
        take,
      }),
    ]);

    return [...upcoming, ...overdue].slice(0, take);
  })();
}
