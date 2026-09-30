import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import { ThemeProvider } from "@/shared/theme/ThemeProvider";
import { ToastProvider } from "@/shared/ui/Toast";
import "./globals.css";

// Các biến font được đăng ký làm CSS variable (`--font-*`) và áp dụng qua className trên thẻ `<html>`, để mọi trang trong ứng dụng dùng chung một bộ font mà không cần import lại.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["500", "600"],
  style: ["normal"],
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500"],
});

/** Metadata mặc định cho toàn bộ ứng dụng (tiêu đề tab trình duyệt, favicon). */
export const metadata: Metadata = {
  title: "Job Application Tracker",
  description: "Track job applications and interviews in one place.",
  icons: {
    icon: "/icons/icon.png",
    apple: "/icons/icon.png",
  },
};

/**
 * Layout gốc, bọc toàn bộ ứng dụng: khai báo font, `ThemeProvider` (sáng/tối) và `ToastProvider`
 * (thông báo dạng toast) dùng chung cho mọi trang.
 * `suppressHydrationWarning` cần thiết vì `next-themes` chỉnh class `<html>` ở phía client trước khi
 * React hydrate xong, nếu không React sẽ báo cảnh báo lệch nội dung giữa server và client.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${fraunces.variable} ${inter.variable} ${plexMono.variable}`}
    >
      <body>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
