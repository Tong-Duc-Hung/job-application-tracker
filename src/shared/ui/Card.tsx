import { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

/** Khung thẻ bo góc dùng chung cho các khối nội dung (form cài đặt, thống kê…). */
export function Card({
  children,
  className,
  allowOverflow = false,
}: {
  children: ReactNode;
  className?: string;
  allowOverflow?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0 break-words rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-200/40 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/10",
        !allowOverflow && "overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Tiêu đề chuẩn cho `Card`: icon (tùy chọn, có màu nền riêng theo `iconColor`), tiêu đề, mô tả
 * và khu vực hành động (nút, badge…) ở bên phải.
 *
 * @property centered Căn giữa toàn bộ tiêu đề thay vì căn trái (dùng cho trạng thái rỗng).
 */
export function CardHeader({
  title,
  action,
  description,
  icon,
  iconColor = "brand",
  centered = false,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  iconColor?: "brand" | "violet" | "amber" | "emerald";
  centered?: boolean;
}) {
  const iconColorClasses = {
    brand: "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  };

  return (
    <div className={cn("mb-4 flex items-start justify-between gap-3", centered && "justify-center text-center")}>
      <div className={cn("flex min-w-0 items-start gap-3", centered && "flex-col items-center gap-2")}>
        {icon && (
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              iconColorClasses[iconColor]
            )}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
          {description && <p className="mt-0.5 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
