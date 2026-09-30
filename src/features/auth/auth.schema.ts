import { z } from "zod";

/** Schema xác thực cho form đăng nhập. */
export const loginSchema = z.object({
  email: z.string().min(1, "Vui lòng nhập email").email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
  rememberMe: z.boolean().optional().default(false),
});
export type LoginInput = z.infer<typeof loginSchema>;
export type LoginRawInput = z.input<typeof loginSchema>;

/**
 * Schema xác thực cho form đăng ký.
 * Mật khẩu bắt buộc tối thiểu 8 ký tự, có ít nhất một chữ cái và một chữ số;
 * `refine` ở cuối đảm bảo mật khẩu xác nhận khớp với mật khẩu đã nhập.
 */
export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Họ tên phải có ít nhất 2 ký tự").max(100, "Họ tên tối đa 100 ký tự"),
    email: z.string().min(1, "Vui lòng nhập email").email("Email không hợp lệ"),
    password: z
      .string()
      .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
      .regex(/[A-Za-z]/, "Mật khẩu phải chứa ít nhất một chữ cái")
      .regex(/[0-9]/, "Mật khẩu phải chứa ít nhất một chữ số"),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;
