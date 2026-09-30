import { z } from "zod";

/**
 * Các trạng thái hợp lệ của một đơn ứng tuyển, theo đúng thứ tự vòng đời từ lúc lưu tin đến khi có kết quả cuối cùng.
 */
export const applicationStatusValues = [
  "APPLIED",
  "REVIEWING",
  "INTERVIEWING",
  "AWAITING_RESULT",
  "OFFER",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
  "EXPIRED",
] as const;

/** Mức độ ưu tiên người dùng tự gán cho đơn ứng tuyển. */
export const priorityValues = ["LOW", "MEDIUM", "HIGH"] as const;

/**
 * Schema cho giá trị ngày dạng `YYYY-MM-DD` (khớp `<input type="date">`).
 * Regex chỉ kiểm tra định dạng; `refine` phía sau dựng lại ngày bằng UTC để bắt các ngày
 * không tồn tại trên lịch (ví dụ 30/02) mà `Date` của JavaScript âm thầm chuyển thành ngày khác.
 */
const dateInputSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải có định dạng YYYY-MM-DD")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, "Ngày không hợp lệ");

/**
 * Schema xác thực cho form tạo/sửa đơn ứng tuyển, dùng chung ở cả client (react-hook-form) và server (API route).
 * `company`/`position` được `trim()` trước khi kiểm tra độ dài để chuỗi chỉ toàn khoảng trắng không lọt qua.
 * `superRefine` ở cuối đảm bảo hạn chót (nếu có) không đứng trước ngày ứng tuyển.
 */
export const applicationFormSchema = z.object({
  company: z.string().trim().min(1, "Vui lòng nhập tên công ty").max(150, "Tên công ty tối đa 150 ký tự"),
  position: z.string().trim().min(1, "Vui lòng nhập vị trí").max(150, "Tên vị trí tối đa 150 ký tự"),
  location: z.string().max(150, "Địa điểm tối đa 150 ký tự").optional().or(z.literal("")),
  salary: z.string().max(100, "Mức lương tối đa 100 ký tự").optional().or(z.literal("")),
  jobUrl: z
    .string()
    .max(500, "Link tuyển dụng tối đa 500 ký tự")
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^https?:\/\//.test(v), "Link tin tuyển dụng phải bắt đầu bằng http:// hoặc https://"),
  priority: z.enum(priorityValues).default("MEDIUM"),
  status: z.enum(applicationStatusValues).default("APPLIED"),
  appliedDate: dateInputSchema.min(1, "Vui lòng chọn ngày ứng tuyển"),
  deadline: dateInputSchema.optional().or(z.literal("")),
  experience: z.string().max(2000, "Kinh nghiệm tối đa 2.000 ký tự").optional().or(z.literal("")),
}).superRefine((value, context) => {
  if (value.deadline && value.deadline < value.appliedDate) {
    context.addIssue({
      code: "custom",
      path: ["deadline"],
      message: "Hạn chót không được trước ngày ứng tuyển",
    });
  }
});
export type ApplicationFormInput = z.infer<typeof applicationFormSchema>;
export type ApplicationFormRawInput = z.input<typeof applicationFormSchema>;

/**
 * Schema xác thực tham số truy vấn của `GET /api/applications`: tìm kiếm, lọc, sắp xếp và phân trang.
 * `page`/`pageSize` dùng `z.coerce.number()` vì query string luôn là chuỗi.
 */
export const applicationQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(applicationStatusValues).optional(),
  priority: z.enum(priorityValues).optional(),
  sortBy: z.enum(["appliedDate", "deadline", "company", "createdAt"]).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ApplicationQuery = z.infer<typeof applicationQuerySchema>;
