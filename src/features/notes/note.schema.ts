import { z } from "zod";

/**
 * Schema xác thực cho form tạo/sửa ghi chú.
 * Một ghi chú phải gắn với đúng một trong hai loại đối tượng: đơn ứng tuyển hoặc buổi phỏng vấn,
 * không được gắn cả hai và cũng không được bỏ trống cả hai — ràng buộc này nằm ở `refine` cuối schema.
 */
export const noteFormSchema = z
  .object({
    applicationId: z.string().optional().or(z.literal("")),
    interviewId: z.string().optional().or(z.literal("")),
    title: z.string().trim().min(1, "Vui lòng nhập tiêu đề").max(150, "Tiêu đề tối đa 150 ký tự"),
    content: z.string().trim().min(1, "Vui lòng nhập nội dung").max(2000, "Nội dung tối đa 2.000 ký tự"),
  })
  .refine((data) => Boolean(data.applicationId) !== Boolean(data.interviewId), {
    message: "Vui lòng chọn đúng một mục: đơn ứng tuyển hoặc buổi phỏng vấn",
    path: ["applicationId"],
  });
export type NoteFormInput = z.infer<typeof noteFormSchema>;

/** Hai loại đối tượng mà một ghi chú có thể gắn vào. */
export const noteLinkTypeValues = ["application", "interview"] as const;
export type NoteLinkType = (typeof noteLinkTypeValues)[number];

/** Schema xác thực tham số truy vấn của `GET /api/notes`: tìm kiếm, lọc theo loại liên kết và phân trang. */
export const noteQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  applicationId: z.string().optional(),
  interviewId: z.string().optional(),
  linkType: z.enum(noteLinkTypeValues).optional(),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
});
export type NoteQuery = z.infer<typeof noteQuerySchema>;
