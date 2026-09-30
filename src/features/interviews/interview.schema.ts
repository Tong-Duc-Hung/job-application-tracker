import { z } from "zod";

/** Các vòng phỏng vấn được hỗ trợ, theo thứ tự thường gặp trong một quy trình tuyển dụng. */
export const interviewTypeValues = [
  "HR",
  "ONLINE_ASSESSMENT",
  "TECHNICAL",
  "MANAGER",
  "FINAL",
  "OTHER",
] as const;

/** Kết quả có thể có của một buổi phỏng vấn. */
export const interviewResultValues = ["PENDING", "PASSED", "FAILED", "CANCELLED", "NO_SHOW"] as const;

/**
 * Tạo một schema chuỗi ngày giờ không được rỗng và phải parse được thành `Date` hợp lệ.
 * Chấp nhận cả giá trị thô từ `<input type="datetime-local">` lẫn chuỗi ISO đầy đủ (client hiện gửi ISO UTC,
 * xem `toIsoFromDateTimeInput`), nên không ràng buộc định dạng cụ thể.
 *
 * @param message Thông báo lỗi khi giá trị bị bỏ trống.
 * @returns Schema Zod kiểu `string`.
 */
const validDateString = (message: string) =>
  z.string().min(1, message).refine((value) => !Number.isNaN(new Date(value).getTime()), "Ngày giờ không hợp lệ");

/**
 * Schema xác thực cho form tạo/sửa lịch phỏng vấn.
 * `title` được `trim()` trước khi kiểm tra độ dài. `applicationId` bắt buộc vì một buổi phỏng vấn
 * luôn phải gắn với một đơn ứng tuyển cụ thể.
 */
export const interviewFormSchema = z.object({
  applicationId: z.string().min(1, "Vui lòng chọn đơn ứng tuyển"),
  title: z.string().trim().min(1, "Vui lòng nhập tiêu đề").max(150, "Tiêu đề tối đa 150 ký tự"),
  type: z.enum(interviewTypeValues).default("OTHER"),
  scheduledAt: validDateString("Vui lòng chọn ngày và giờ"),
  meetingLocation: z.string().max(200, "Địa điểm tối đa 200 ký tự").optional().or(z.literal("")),
  meetingUrl: z
    .string()
    .max(500, "Link cuộc họp tối đa 500 ký tự")
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^https?:\/\//.test(v), "Link họp phải bắt đầu bằng http:// hoặc https://"),
  result: z.enum(interviewResultValues).default("PENDING"),
  review: z.string().max(1000, "Nhận xét tối đa 1.000 ký tự").optional().or(z.literal("")),
});
export type InterviewFormInput = z.infer<typeof interviewFormSchema>;
export type InterviewFormRawInput = z.input<typeof interviewFormSchema>;

/**
 * Schema xác thực tham số truy vấn của `GET /api/interviews`.
 * `from`/`to` dùng để lọc theo khoảng thời gian; xem `upperBound` trong interview.repository.ts
 * về cách xử lý khi `to` chỉ là ngày (không kèm giờ).
 */
export const interviewQuerySchema = z.object({
  search: z.string().optional(),
  type: z.enum(interviewTypeValues).optional(),
  result: z.enum(interviewResultValues).optional(),
  applicationId: z.string().optional(),
  from: validDateString("Ngày bắt đầu không hợp lệ").optional(),
  to: validDateString("Ngày kết thúc không hợp lệ").optional(),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
});
export type InterviewQuery = z.infer<typeof interviewQuerySchema>;
