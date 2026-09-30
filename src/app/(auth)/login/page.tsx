import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { AuthHero } from "@/features/auth/components/AuthHero";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { getSafeRedirectPath } from "@/shared/utils/safeRedirect";

/** Tiêu đề tab trình duyệt riêng cho trang đăng nhập. */
export const metadata: Metadata = { title: "Đăng nhập · Job Application Tracker" };

/**
 * Trang đăng nhập (`/login`).
 * `from` (nơi người dùng định vào trước khi bị chuyển tới đây) được lọc qua `getSafeRedirectPath`
 * trước khi truyền xuống `LoginForm`, để tránh open-redirect. `expired` (khi được kèm theo, ví dụ
 * `?expired=1` từ `proxy.ts` hoặc sau khi đổi mật khẩu) hiển thị thêm thông báo phiên đã hết hạn.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[]; expired?: string | string[] }>;
}) {
  const { from, expired } = await searchParams;

  return (
    <AuthShell
      hero={
        <AuthHero
          title="Sẵn sàng cho cơ hội tiếp theo."
          description="Giữ mọi việc ngăn nắp để bạn tự tin tập trung vào điều quan trọng nhất: tìm công việc phù hợp."
        />
      }
    >
      <LoginForm redirectTo={getSafeRedirectPath(from)} sessionExpired={expired !== undefined} />
    </AuthShell>
  );
}
