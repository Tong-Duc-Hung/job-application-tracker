import { ReactNode } from "react";

/** Khối hiển thị khi danh sách rỗng: icon, tiêu đề, mô tả và một hành động gợi ý (ví dụ nút tạo mới). */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 px-6 py-14 text-center dark:border-white/10">
      {icon && <div className="text-slate-300 dark:text-slate-600">{icon}</div>}
      <div className="min-w-0 max-w-full">
        <p className="line-clamp-2 break-words font-medium text-slate-700 dark:text-slate-300">{title}</p>
        {description && <p className="mt-1 line-clamp-3 break-words text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}
