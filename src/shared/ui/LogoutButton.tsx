"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Nút đăng xuất: gọi API xóa cookie phiên rồi điều hướng về trang đăng nhập. Không có `children` thì chỉ hiện icon (dạng nút vuông).
 */
export function LogoutButton({ children, className }: { children?: ReactNode; className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  /** Gửi `POST /api/auth/logout`, sau đó chuyển tới `/login` và làm mới dữ liệu Server Component. */
  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      aria-label="Đăng xuất"
      title="Đăng xuất"
      className={`flex h-9 items-center justify-center gap-2 rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 ${children ? "px-3 text-sm font-medium" : "w-9"} ${className ?? ""}`}
    >
      <LogOut className="h-4 w-4" />
      {children}
    </button>
  );
}
