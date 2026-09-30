import "server-only";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifySessionToken, type VerifiedSession } from "./jwt";
import { prisma } from "@/shared/db/prisma";

/**
 * Đọc và xác minh cookie phiên của request hiện tại.
 * Chỉ kiểm tra chữ ký/thời hạn của JWT, không đối chiếu cơ sở dữ liệu.
 *
 * @returns Phiên hợp lệ, hoặc `null` nếu không có phiên (nơi gọi tự quyết định cách phản ứng).
 */
export async function getSession(): Promise<VerifiedSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Lấy bản ghi người dùng hiện tại (không gồm mã băm mật khẩu) cho API route và Server Component.
 * Trả về `null` khi không có phiên, người dùng không còn tồn tại, hoặc `sessionVersion` trong token
 * khác với DB (phiên đã bị vô hiệu, ví dụ sau khi đổi mật khẩu).
 *
 * @returns Thông tin người dùng hoặc `null`.
 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      theme: true,
      createdAt: true,
      sessionVersion: true,
    },
  });

  if (!user || user.sessionVersion !== session.sessionVersion) return null;

  return user;
}

/**
 * Lấy id người dùng của phiên hợp lệ cho các API route; không ném lỗi để route tự trả về 401.
 * Cũng đối chiếu `sessionVersion` với DB nên một phiên đã bị vô hiệu sẽ bị từ chối.
 *
 * @returns Id người dùng, hoặc `null` nếu chưa đăng nhập hoặc phiên không còn hiệu lực.
 */
export async function requireUserId(): Promise<string | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, sessionVersion: true },
  });
  return user?.sessionVersion === session.sessionVersion ? user.id : null;
}
