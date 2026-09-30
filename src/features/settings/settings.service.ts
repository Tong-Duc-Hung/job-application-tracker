import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/shared/db/prisma";
import type { ProfileInput, PasswordInput } from "./settings.schema";
import type { Theme } from "@prisma/client";

/** Lỗi nghiệp vụ của tầng cài đặt tài khoản (không tìm thấy người dùng, sai mật khẩu). */
export class SettingsError extends Error {}

/** Cập nhật tên và ảnh đại diện của người dùng. */
export function updateProfile(userId: string, input: ProfileInput) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name.trim(),
      avatarUrl: input.avatarUrl?.trim() || null,
    },
    select: { id: true, name: true, email: true, avatarUrl: true, theme: true },
  });
}

/**
 * Đổi mật khẩu sau khi xác minh mật khẩu hiện tại.
 * Tăng `sessionVersion` để vô hiệu mọi phiên đăng nhập cũ (kể cả trên thiết bị khác); route gọi hàm này
 * phải tự xóa cookie của request hiện tại, nếu không sẽ tạo vòng lặp chuyển hướng ở proxy.ts
 * (xem `app/api/settings/password/route.ts`).
 *
 * @throws SettingsError nếu không tìm thấy người dùng hoặc mật khẩu hiện tại không đúng.
 */
export async function changePassword(userId: string, input: PasswordInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new SettingsError("Không tìm thấy tài khoản");

  const isValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!isValid) throw new SettingsError("Mật khẩu hiện tại không đúng");

  const passwordHash = await bcrypt.hash(input.newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, sessionVersion: { increment: 1 } },
  });
}

/** Cập nhật lựa chọn giao diện (sáng/tối/theo hệ thống) của người dùng. */
export function updateTheme(userId: string, theme: Theme) {
  return prisma.user.update({
    where: { id: userId },
    data: { theme },
    select: { id: true, theme: true },
  });
}

/** Xuất toàn bộ dữ liệu của người dùng (hồ sơ, đơn ứng tuyển, phỏng vấn, ghi chú) để phục vụ tải xuống. */
export async function exportUserData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  const applications = await prisma.application.findMany({
    where: { userId },
    include: { interviews: { include: { notes: true } }, notes: true },
    orderBy: { createdAt: "asc" },
  });

  return { user, applications, exportedAt: new Date().toISOString() };
}

/** Lấy thông tin tổng quan tài khoản: ngày tham gia, tổng số đơn và tổng số phỏng vấn. */
export async function getAccountOverview(userId: string) {
  const [user, applicationCount, interviewCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
    prisma.application.count({ where: { userId } }),
    prisma.interview.count({ where: { application: { userId } } }),
  ]);

  return {
    memberSince: user?.createdAt ?? null,
    applicationCount,
    interviewCount,
  };
}

/**
 * Xóa vĩnh viễn tài khoản sau khi xác minh mật khẩu, kéo theo toàn bộ dữ liệu liên quan.
 *
 * @throws SettingsError nếu không tìm thấy tài khoản hoặc mật khẩu không đúng.
 */
export async function deleteAccount(userId: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new SettingsError("Không tìm thấy tài khoản");
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) throw new SettingsError("Mật khẩu không đúng");
  return prisma.user.delete({ where: { id: userId } });
}
