import { z } from "zod";

/**
 * Schema xác thực cho form hồ sơ cá nhân.
 * `avatarUrl` là data URL (ảnh đã được nén ở client bằng `resizeImageToDataUrl`) nên giới hạn độ dài
 * chuỗi thay vì kiểm tra định dạng URL.
 */
export const profileSchema = z.object({
  name: z.string().trim().min(2, "Tên phải có ít nhất 2 ký tự").max(100, "Tên tối đa 100 ký tự"),
  avatarUrl: z
    .string()
    .max(400_000, "Ảnh quá lớn, vui lòng chọn ảnh khác")
    .optional()
    .or(z.literal("")),
});
export type ProfileInput = z.infer<typeof profileSchema>;

/**
 * Schema xác thực cho form đổi mật khẩu.
 * Hai `refine` ở cuối đảm bảo: mật khẩu xác nhận khớp với mật khẩu mới, và mật khẩu mới
 * phải khác mật khẩu hiện tại.
 */
export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: z
      .string()
      .min(8, "Mật khẩu mới phải có ít nhất 8 ký tự")
      .regex(/[A-Za-z]/, "Mật khẩu mới phải chứa ít nhất một chữ cái")
      .regex(/[0-9]/, "Mật khẩu mới phải chứa ít nhất một chữ số"),
    confirmNewPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu mới"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmNewPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "Mật khẩu mới phải khác mật khẩu hiện tại",
    path: ["newPassword"],
  });
export type PasswordInput = z.infer<typeof passwordSchema>;

/** Schema xác thực cho lựa chọn giao diện (sáng/tối/theo hệ thống). */
export const themeSchema = z.object({
  theme: z.enum(["LIGHT", "DARK", "SYSTEM"]),
});

/** Schema xác thực cho thao tác xóa tài khoản: yêu cầu nhập lại mật khẩu để xác nhận. */
export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Vui lòng nhập mật khẩu để xác nhận"),
});
