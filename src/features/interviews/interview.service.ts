import "server-only";
import * as repo from "./interview.repository";
import type { InterviewFormInput, InterviewQuery } from "./interview.schema";

/**
 * Lỗi nghiệp vụ của tầng phỏng vấn (ngày giờ không hợp lệ, đơn ứng tuyển không tồn tại hoặc không thuộc người dùng).
 */
export class InterviewError extends Error {}

/**
 * Chuẩn hóa dữ liệu form phỏng vấn đã qua Zod thành payload Prisma.
 *
 * @throws InterviewError nếu `scheduledAt` không parse được thành ngày giờ hợp lệ.
 */
function toPrismaInput(input: InterviewFormInput) {
  const scheduledAt = new Date(input.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) throw new InterviewError("Ngày giờ phỏng vấn không hợp lệ");

  return {
    applicationId: input.applicationId,
    title: input.title.trim(),
    type: input.type,
    scheduledAt,
    meetingLocation: input.meetingLocation?.trim() || null,
    meetingUrl: input.meetingUrl?.trim() || null,
    result: input.result,
    review: input.review?.trim() || null,
  };
}

/** Lấy danh sách phỏng vấn của người dùng theo bộ lọc/sắp xếp/phân trang. */
export function listInterviews(userId: string, query: InterviewQuery) {
  return repo.listInterviews(userId, query);
}

/** Lấy chi tiết một buổi phỏng vấn kèm ghi chú liên quan. */
export function getInterview(userId: string, id: string) {
  return repo.getInterviewById(userId, id);
}

/**
 * Tạo buổi phỏng vấn mới.
 *
 * @throws InterviewError nếu `applicationId` không tồn tại hoặc không thuộc về `userId` — kiểm tra quyền sở hữu
 * đơn ứng tuyển trước khi ghi, vì tầng repository chỉ nhận `applicationId` mà không tự biết `userId` đang thao tác.
 */
export async function createInterview(userId: string, input: InterviewFormInput) {
  const owned = await repo.applicationBelongsToUser(userId, input.applicationId);
  if (!owned) throw new InterviewError("Không tìm thấy đơn ứng tuyển này");
  return repo.createInterview(toPrismaInput(input));
}

/**
 * Cập nhật buổi phỏng vấn, kể cả khi đổi sang một đơn ứng tuyển khác.
 *
 * @throws InterviewError nếu đơn ứng tuyển đích không thuộc về `userId`.
 * @returns Bản ghi sau cập nhật, hoặc `null` nếu buổi phỏng vấn không tồn tại hoặc không thuộc về `userId`.
 */
export async function updateInterview(userId: string, id: string, input: InterviewFormInput) {
  const owned = await repo.applicationBelongsToUser(userId, input.applicationId);
  if (!owned) throw new InterviewError("Không tìm thấy đơn ứng tuyển này");
  return repo.updateInterview(userId, id, toPrismaInput(input));
}

/** Xóa một buổi phỏng vấn (kéo theo ghi chú liên quan). */
export function deleteInterview(userId: string, id: string) {
  return repo.deleteInterview(userId, id);
}

/** Lấy các buổi phỏng vấn sắp diễn ra (còn PENDING, từ hiện tại trở đi) để hiển thị trên Dashboard. */
export function upcomingInterviews(userId: string, take?: number) {
  return repo.upcomingInterviews(userId, take);
}

/** Lấy các lịch phỏng vấn gần nhất theo thời điểm diễn ra, mới nhất trước. */
export function recentInterviews(userId: string, take?: number) {
  return repo.recentInterviews(userId, take);
}

/** Đếm toàn bộ lịch phỏng vấn của người dùng. */
export function countInterviews(userId: string) {
  return repo.countInterviews(userId);
}

/** Đếm số buổi phỏng vấn sắp diễn ra, dùng cho thẻ tổng quan trên Dashboard. */
export function countUpcomingInterviews(userId: string, now?: Date) {
  return repo.countUpcomingInterviews(userId, now);
}
