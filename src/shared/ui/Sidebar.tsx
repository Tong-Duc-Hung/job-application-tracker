"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { navItems } from "@/shared/config/navigation";

/**
 * Thanh điều hướng chính, dùng chung một nguồn mục điều hướng (`navItems`) cho hai giao diện:
 * cột dọc thu gọn/mở rộng trên desktop (`sm:flex`) và thanh dưới cùng trên di động (`sm:hidden`).
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-300 dark:border-white/10 dark:bg-slate-950 sm:flex sm:w-[72px] lg:w-72">
        <div className="flex h-16 items-center border-b border-slate-100 dark:border-white/10 sm:justify-center sm:px-2 lg:justify-start lg:gap-2.5 lg:px-5">
          <Link href="/dashboard" aria-label="Job Application Tracker" className="flex min-w-0 items-center lg:gap-2.5">
            <Image src="/icons/icon.png" alt="Job Application Tracker" width={32} height={32} className="h-8 w-8 shrink-0" priority />
            <span className="hidden whitespace-nowrap font-semibold text-slate-900 dark:text-white lg:block">Job Application Tracker</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-2 lg:p-3">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center rounded-lg py-2 text-base font-medium transition-colors",
                  "justify-center px-2 lg:justify-start lg:gap-3 lg:px-3",
                  active
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden truncate lg:block">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-slate-200 bg-white py-1.5 dark:border-white/10 dark:bg-slate-950 sm:hidden">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-medium",
                active ? "text-brand-700 dark:text-brand-400" : "text-slate-500 dark:text-slate-400"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
