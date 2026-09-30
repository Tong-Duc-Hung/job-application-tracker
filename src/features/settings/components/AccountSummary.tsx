import { CalendarDays, Briefcase, Users2, Palette } from "lucide-react";
import type { Theme } from "@prisma/client";
import { Avatar } from "@/shared/ui/Avatar";
import { LogoutButton } from "@/shared/ui/LogoutButton";
import { formatDate } from "@/shared/utils/formatDate";

/** Nhãn tiếng Việt cho từng giá trị giao diện, hiển thị trong danh sách thống kê. */
const THEME_LABEL: Record<Theme, string> = {
  LIGHT: "Sáng",
  DARK: "Tối",
  SYSTEM: "Hệ thống",
};

/** Định dạng ngày tham gia; trả về dấu gạch ngang nếu không xác định được. */
function formatMemberSince(date: Date | null) {
  if (!date) return "—";
  return formatDate(date);
}

/**
 * @property overview Số liệu tổng quan lấy từ `getAccountOverview` (ngày tham gia, tổng số đơn, tổng số phỏng vấn).
 */
interface AccountSummaryProps {
  user: { name: string; email: string; avatarUrl: string | null; theme: Theme };
  overview: { memberSince: Date | null; applicationCount: number; interviewCount: number };
}

/** Thẻ tổng quan tài khoản ở đầu trang Cài đặt: ảnh đại diện, tên, email và các số liệu thống kê nhanh. */
export function AccountSummary({ user, overview }: AccountSummaryProps) {
  const stats = [
    { icon: Briefcase, label: "Đơn ứng tuyển", value: overview.applicationCount },
    { icon: Users2, label: "Buổi phỏng vấn", value: overview.interviewCount },
    { icon: Palette, label: "Giao diện", value: THEME_LABEL[user.theme] },
    { icon: CalendarDays, label: "Thành viên từ", value: formatMemberSince(overview.memberSince) },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/40">
      <div className="relative h-14 bg-gradient-to-r from-brand-500 to-brand-400">
        <Avatar
          name={user.name}
          avatarUrl={user.avatarUrl}
          size="lg"
          className="absolute bottom-0 left-5 translate-y-1/2 ring-4 ring-white dark:ring-slate-900"
        />
      </div>

      <div className="flex flex-col gap-5 p-5 pt-10">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user.name}</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
        </div>

        <div className="h-px bg-slate-100 dark:bg-white/10" />

        <div className="flex flex-col gap-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex min-w-0 items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Icon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <span className="line-clamp-2 break-words">{stat.label}</span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-slate-900 dark:text-white">{stat.value}</span>
              </div>
            );
          })}
        </div>

        <div className="h-px bg-slate-100 dark:bg-white/10" />

        <LogoutButton className="w-full justify-center">Đăng xuất</LogoutButton>
      </div>
    </div>
  );
}