import "server-only";
import { prisma } from "@/shared/db/prisma";

/** Tìm người dùng theo email (đã được chuẩn hóa chữ thường ở tầng service trước khi gọi). */
export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

/** Tạo bản ghi người dùng mới với mật khẩu đã băm sẵn. */
export function createUser(data: {
  name: string;
  email: string;
  passwordHash: string;
}) {
  return prisma.user.create({ data });
}
