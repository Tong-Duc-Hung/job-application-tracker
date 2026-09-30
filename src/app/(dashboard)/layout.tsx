import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import { Sidebar } from "@/shared/ui/Sidebar";
import { Topbar } from "@/shared/ui/Topbar";

/**
 * Layout dùng chung cho toàn bộ khu vực dashboard (đơn ứng tuyển, phỏng vấn, ghi chú, thống kê, cài đặt):
 * yêu cầu đăng nhập, hiển thị Sidebar và Topbar bao quanh nội dung từng trang.
 * `?expired=1` báo cho trang đăng nhập biết đây là do phiên bị vô hiệu (không phải người dùng chủ động
 * vào `/login`), để proxy.ts không đẩy ngược lại `/dashboard` và tạo vòng lặp chuyển hướng.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?expired=1");

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar name={user.name} email={user.email} avatarUrl={user.avatarUrl} />
        <main className="min-h-0 flex-1 overflow-auto px-4 py-6 pb-20 sm:px-8 sm:py-8 sm:pb-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
