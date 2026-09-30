"use client";

import { usePathname } from "next/navigation";
import { navItems } from "@/shared/config/navigation";

/** Tiêu đề trang hiện tại trên Topbar, suy ra từ URL đang mở khớp với `navItems`. */
export function TopbarTitle() {
  const pathname = usePathname();
  const current = navItems.find((item) => pathname === item.href || pathname.startsWith(item.href + "/"));

  if (!current) return <span />;

  return (
    <div className="flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-100">
      <current.icon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
      {current.label}
    </div>
  );
}
