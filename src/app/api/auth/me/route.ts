import { NextResponse } from "next/server";
import { getCurrentUser } from "@/shared/auth/session";
import { unauthorizedResponse } from "@/shared/utils/validation";

/**
 * `GET /api/auth/me` — trả thông tin người dùng của phiên hiện tại; dùng để kiểm tra trạng thái đăng nhập.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();
  return NextResponse.json({ user });
}
