import "server-only";
import type { ApplicationStatus } from "@prisma/client";
// Tầng service: chuyển dữ liệu form (chuỗi từ input) sang dữ liệu Prisma (Date, null thay vì chuỗi rỗng)
// và gọi xuống tầng repository. Không tự truy vấn Prisma trực tiếp để route/component không phụ thuộc
// vào chi tiết ORM.
// 
import * as repo from "./application.repository";
import type { ApplicationFormInput, ApplicationQuery } from "./application.schema";

/**
 * Chuẩn hóa dữ liệu form đã qua Zod thành payload Prisma: cắt khoảng trắng thừa, chuỗi rỗng thành `null`,
 * chuỗi ngày thành `Date`.
 *
 * @param input Dữ liệu đã được `applicationFormSchema` xác thực.
 * @returns Payload sẵn sàng truyền cho `application.repository`.
 */
function toPrismaInput(input: ApplicationFormInput) {
  return {
    company: input.company.trim(),
    position: input.position.trim(),
    location: input.location?.trim() || null,
    salary: input.salary?.trim() || null,
    jobUrl: input.jobUrl?.trim() || null,
    priority: input.priority,
    status: input.status,
    appliedDate: new Date(input.appliedDate),
    deadline: input.deadline ? new Date(input.deadline) : null,
    experience: input.experience?.trim() || null,
  };
}

/** Lấy danh sách đơn ứng tuyển của một người dùng theo bộ lọc/sắp xếp/phân trang. */
export function listApplications(userId: string, query: ApplicationQuery) {
  return repo.listApplications(userId, query);
}

/** Lấy chi tiết một đơn ứng tuyển, kèm các buổi phỏng vấn và ghi chú liên quan. */
export function getApplication(userId: string, id: string) {
  return repo.getApplicationById(userId, id);
}

/** Tạo đơn ứng tuyển mới cho người dùng. */
export function createApplication(userId: string, input: ApplicationFormInput) {
  return repo.createApplication(userId, toPrismaInput(input));
}

/**
 * Cập nhật một đơn ứng tuyển.
 *
 * @returns Đơn đã cập nhật, hoặc `null` nếu đơn không tồn tại hoặc không thuộc về `userId`.
 */
export function updateApplication(userId: string, id: string, input: ApplicationFormInput) {
  return repo.updateApplication(userId, id, toPrismaInput(input));
}

/**
 * Xóa một đơn ứng tuyển (kéo theo các phỏng vấn và ghi chú liên quan, theo cấu hình cascade của schema DB).
 *
 * @returns `true` nếu có bản ghi bị xóa.
 */
export function deleteApplication(userId: string, id: string) {
  return repo.deleteApplication(userId, id);
}

/**
 * Đếm số đơn ứng tuyển của người dùng theo từng trạng thái, dùng cho biểu đồ Thống kê.
 * Luôn trả về đủ mọi trạng thái (kể cả trạng thái chưa có đơn nào) với giá trị 0, để biểu đồ
 * không phải tự xử lý trạng thái bị thiếu khóa.
 */
export async function getStatusSummary(userId: string) {
  const grouped = await repo.countByStatus(userId);
  const summary: Record<ApplicationStatus, number> = {
    APPLIED: 0,
    REVIEWING: 0,
    INTERVIEWING: 0,
    AWAITING_RESULT: 0,
    OFFER: 0,
    ACCEPTED: 0,
    REJECTED: 0,
    WITHDRAWN: 0,
    EXPIRED: 0,
  };
  for (const g of grouped) summary[g.status] = g._count._all;
  return summary;
}

/** Đếm tổng số đơn ứng tuyển của người dùng. */
export function countApplications(userId: string) {
  return repo.countApplications(userId);
}

/** Đếm số đơn ứng tuyển có kinh nghiệm đã nhập. */
export function countApplicationsWithExperience(userId: string) {
  return repo.countApplicationsWithExperience(userId);
}

/** Đếm số đơn đang trong quá trình xử lý (chưa ở trạng thái kết thúc) cho thẻ tổng quan trên Dashboard. */
export function countActiveApplications(userId: string, now?: Date) {
  return repo.countActiveApplications(userId, now);
}

/** Đếm số đơn có hạn chót rơi vào khoảng thời gian cho trước, dùng cho thẻ cảnh báo trên Dashboard. */
export function countUpcomingDeadlines(userId: string, from?: Date, to?: Date) {
  return repo.countUpcomingDeadlines(userId, from, to);
}

/** Lấy danh sách các đơn có hạn chót gần nhất (đơn đang xử lý, sắp xếp theo hạn chót tăng dần). */
export function listUrgentDeadlines(userId: string, now?: Date, take?: number) {
  return repo.listUrgentDeadlines(userId, now, take);
}
