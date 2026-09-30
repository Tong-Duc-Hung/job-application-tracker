import "server-only";
import bcrypt from "bcryptjs";
import {
  findUserByEmail,
  createUser,
} from "./auth.repository";
import { signSessionToken } from "@/shared/auth/jwt";
import type { LoginInput, RegisterInput } from "./auth.schema";

/**
 * Số vòng băm bcrypt cho mật khẩu (đăng ký). Đổi mật khẩu ở settings.service.ts hiện dùng số cố định 10, nên giữ hai nơi này đồng bộ nếu chỉnh sửa.
 */
const SALT_ROUNDS = 10;

/** Lỗi nghiệp vụ xác thực (sai email/mật khẩu, email đã tồn tại). */
export class AuthError extends Error {}

/**
 * Xác thực email và mật khẩu, sau đó ký JWT phiên đăng nhập.
 * Thông báo lỗi cố ý giống nhau dù email không tồn tại hay mật khẩu sai, để không lộ thông tin
 * email nào đã đăng ký trong hệ thống.
 *
 * @throws AuthError nếu email không tồn tại hoặc mật khẩu không đúng.
 * @returns Token đã ký và thông tin người dùng.
 */
export async function login(input: LoginInput) {
  const user = await findUserByEmail(input.email.toLowerCase().trim());
  if (!user) {
    throw new AuthError("Email hoặc mật khẩu không đúng");
  }

  const isValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!isValid) {
    throw new AuthError("Email hoặc mật khẩu không đúng");
  }

  const token = await signSessionToken({
    userId: user.id,
    email: user.email,
    remember: input.rememberMe,
    sessionVersion: user.sessionVersion,
  });
  return { token, user };
}

/**
 * Tạo tài khoản mới.
 *
 * @throws AuthError nếu email đã được sử dụng.
 * @returns Bản ghi người dùng vừa tạo (chưa đăng nhập; client cần gọi `login` sau đó).
 */
export async function register(input: Omit<RegisterInput, "confirmPassword">) {
  const email = input.email.toLowerCase().trim();
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new AuthError("Email này đã được sử dụng");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await createUser({
    name: input.name.trim(),
    email,
    passwordHash,
  });

  return user;
}
