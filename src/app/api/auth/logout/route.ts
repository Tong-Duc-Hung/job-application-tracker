import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/shared/auth/jwt";

/**
 * `POST /api/auth/logout` — xóa cookie phiên. Chỉ xóa cookie ở trình duyệt hiện tại; không tăng `sessionVersion` nên không đăng xuất các thiết bị khác.
 */
export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(AUTH_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
