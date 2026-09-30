import { LayoutDashboard, Briefcase, CalendarClock, NotebookPen, BarChart3, Settings } from "lucide-react";

/**
 * Nguồn duy nhất cho thanh điều hướng chính của ứng dụng. Được Sidebar (desktop và mobile) và tiêu đề mục
 * của Topbar cùng dùng nên hai nơi không bao giờ lệch nhau.
 */
export const navItems = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/applications", label: "Đơn ứng tuyển", icon: Briefcase },
  { href: "/interviews", label: "Phỏng vấn", icon: CalendarClock },
  { href: "/notes", label: "Ghi chú", icon: NotebookPen },
  { href: "/statistics", label: "Thống kê", icon: BarChart3 },
  { href: "/settings", label: "Cài đặt", icon: Settings },
] as const;
