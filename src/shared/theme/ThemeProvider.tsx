"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * Bọc `next-themes` với cấu hình dùng chung: chuyển giao diện bằng class CSS, mặc định theo hệ thống, tắt hiệu ứng chuyển động khi đổi giao diện để tránh chớp màu.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
