import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken, signSessionToken, shouldRefreshSession, getCookieMaxAge } from "@/shared/auth/jwt";

/** Các trang công khai (không cần đăng nhập). */
const PUBLIC_ROUTES = ["/login", "/register"];

/**
 * Bộ chặn route: chuyển người chưa đăng nhập ra khỏi nhóm trang (dashboard) và chuyển người đã đăng nhập
 * ra khỏi trang đăng nhập/đăng ký. Đồng thời hiện thực "phiên trượt": phiên "ghi nhớ" được âm thầm cấp cookie mới
 * khi người dùng còn hoạt động nên không hết hạn với người thường xuyên quay lại, còn phiên bị bỏ quên
 * vẫn tự hết hạn khi không còn gì gia hạn nó.
 *
 * Chạy trên runtime Node.js (Next.js 16 đã bỏ hỗ trợ Edge runtime cho proxy). Vẫn dùng `jose` để xác minh JWT
 * vì thư viện này chạy được mọi runtime, nhưng file này không còn bắt buộc tương thích Edge.
 *
 * Lưu ý: proxy chỉ kiểm tra chữ ký/hạn của JWT chứ không truy vấn DB, nên phiên đã bị vô hiệu
 * (`sessionVersion` lệch) chỉ được phát hiện ở tầng layout/API.
 *
 * @param req Request đang được chặn.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  // Chưa đăng nhập mà vào trang cần bảo vệ: chuyển tới /login và ghi đường dẫn gốc vào `from` để quay lại sau khi đăng nhập.
  if (!session && !isPublicRoute) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // `?expired=` là dấu hiệu server đã phát hiện cookie còn chữ ký hợp lệ nhưng
  // phiên đã bị vô hiệu (đổi mật khẩu, tài khoản bị xóa...). Proxy chỉ kiểm tra
  // chữ ký JWT nên nếu vẫn chuyển /login → /dashboard sẽ tạo vòng lặp vô hạn.
  const isSessionExpiredRedirect = pathname === "/login" && req.nextUrl.searchParams.has("expired");

  if (session && isPublicRoute && !isSessionExpiredRedirect) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const res = NextResponse.next();

  // Phiên "ghi nhớ" đã đủ cũ: cấp token và cookie mới để phiên tiếp tục trượt về phía trước.
  if (session && shouldRefreshSession(session)) {
    const freshToken = await signSessionToken({
      userId: session.userId,
      email: session.email,
      remember: session.remember,
      sessionVersion: session.sessionVersion,
    });
    res.cookies.set(AUTH_COOKIE_NAME, freshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: getCookieMaxAge(session.remember),
    });
  }

  return res;
}

/**
 * Cấu hình matcher: chạy cho mọi route trừ `api`, tài nguyên tĩnh, ảnh và phần nội bộ của Next.js.
 * Các API route tự kiểm tra xác thực nên không đi qua bộ chặn này.
 */
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|icons).*)",
  ],
};
