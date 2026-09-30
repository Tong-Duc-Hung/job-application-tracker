"use client";

import { useRouter } from "next/navigation";
import { Pencil, Trash2, Briefcase, BookOpen, CalendarDays, CalendarClock, MapPin, MessageSquare, ExternalLink } from "lucide-react";
import type { Application } from "@prisma/client";
import { StatusBadge, PriorityBadge } from "@/shared/ui/Badge";
import { EmptyState } from "@/shared/ui/EmptyState";
import { formatDate, isOverdue } from "@/shared/utils/formatDate";
import { cn } from "@/shared/utils/cn";

/** Một dòng trong bảng: bản ghi đơn ứng tuyển kèm số lượng phỏng vấn/ghi chú (nếu API có trả `_count`). */
type ApplicationRow = Application & { _count?: { interviews: number; notes: number } };

/**
 * Các trạng thái được coi là "đã có kết quả cuối cùng" — nút "Sửa kinh nghiệm" chỉ hiện ở các trạng thái này (hoặc khi đơn đã có sẵn nội dung kinh nghiệm).
 */
const OUTCOME_STATUSES = new Set(["REJECTED", "WITHDRAWN"]);

/** Màu dải nhấn bên trái mỗi dòng, tương ứng với trạng thái của đơn. */
const statusAccentClasses: Record<string, string> = {
  APPLIED: "before:bg-sky-500 dark:before:bg-sky-400",
  REVIEWING: "before:bg-cyan-500 dark:before:bg-cyan-400",
  INTERVIEWING: "before:bg-amber-500 dark:before:bg-amber-400",
  AWAITING_RESULT: "before:bg-orange-500 dark:before:bg-orange-400",
  OFFER: "before:bg-emerald-500 dark:before:bg-emerald-400",
  ACCEPTED: "before:bg-green-500 dark:before:bg-green-400",
  REJECTED: "before:bg-red-500 dark:before:bg-red-400",
  WITHDRAWN: "before:bg-slate-500 dark:before:bg-slate-400",
  EXPIRED: "before:bg-rose-500 dark:before:bg-rose-400",
};

interface ApplicationTableProps {
  items: ApplicationRow[];
  onEdit: (application: Application) => void;
  onEditExperience: (application: Application) => void;
  onDelete: (application: Application) => void;
}

/**
 * Bảng danh sách đơn ứng tuyển. Mỗi dòng bấm vào để xem chi tiết; các nút thao tác (sửa, sửa kinh nghiệm, xóa) chặn sự kiện nổi bọt để không kích hoạt việc mở chi tiết.
 */
export function ApplicationTable({ items, onEdit, onEditExperience, onDelete }: ApplicationTableProps) {
  const router = useRouter();

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Briefcase className="h-10 w-10" />}
        title="Chưa có đơn ứng tuyển nào"
        description="Thêm đơn ứng tuyển đầu tiên để bắt đầu theo dõi tại đây."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/10">
      <div className="min-w-[900px]">
        <div className="grid grid-cols-[minmax(230px,1.5fr)_minmax(150px,1fr)_minmax(190px,1.2fr)_minmax(150px,1fr)_116px] items-center gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-500">
          <span>Đơn ứng tuyển</span>
          <span>Trạng thái</span>
          <span>Thời gian</span>
          <span>Chi tiết</span>
          <span className="text-right">Thao tác</span>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-white/10">
      {items.map((app) => {
        const overdue = app.deadline ? isOverdue(app.deadline) : false;
        const canEditExperience = OUTCOME_STATUSES.has(app.status) || Boolean(app.experience);

        return (
          <article
            key={app.id}
            onClick={() => router.push(`/applications/${app.id}`)}
            className={cn(
              "group relative grid cursor-pointer grid-cols-[minmax(230px,1.5fr)_minmax(150px,1fr)_minmax(190px,1.2fr)_minmax(150px,1fr)_116px] items-center gap-4 bg-white px-5 py-3.5 pl-6 transition-colors before:absolute before:inset-y-0 before:left-0 before:w-1 before:content-[''] hover:bg-brand-50/40 dark:bg-slate-900 dark:hover:bg-brand-500/[0.04]",
              statusAccentClasses[app.status]
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-base font-bold uppercase text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                  {app.company.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-slate-900 transition-colors group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-300">
                    {app.company}
                  </h2>
                  <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">{app.position}</p>
                </div>
            </div>

              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <StatusBadge status={app.status} />
                <PriorityBadge priority={app.priority} />
            </div>

              <div className="min-w-0 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span className={cn("flex items-center gap-1.5 whitespace-nowrap", overdue && "text-red-500 dark:text-red-400")}><CalendarClock className="h-3.5 w-3.5" />Hạn chót <strong className="font-medium text-slate-700 dark:text-slate-200">{app.deadline ? formatDate(app.deadline) : "Chưa đặt"}</strong></span>
                <span className="flex items-center gap-1.5 whitespace-nowrap text-slate-400"><CalendarDays className="h-3.5 w-3.5" />{formatDate(app.appliedDate)}</span>
              </div>

              <div className="min-w-0 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                {app.location && <span className="flex max-w-[150px] items-center gap-1.5 truncate"><MapPin className="h-3.5 w-3.5 shrink-0" />{app.location}</span>}
                <span className="flex items-center gap-1.5 whitespace-nowrap"><CalendarClock className="h-3.5 w-3.5" />{app._count?.interviews ?? 0} vòng</span>
                {Boolean(app._count?.notes) && <span className="flex items-center gap-1.5 whitespace-nowrap"><MessageSquare className="h-3.5 w-3.5" />{app._count?.notes} ghi chú</span>}
              </div>

              <div className="flex items-center justify-end gap-1" onClick={(event) => event.stopPropagation()}>
                <button onClick={() => onEdit(app)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200" aria-label="Sửa" title="Sửa"><Pencil className="h-4 w-4" /></button>
                {app.jobUrl && <a href={app.jobUrl} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/10 dark:hover:text-brand-300" aria-label="Mở tin tuyển dụng" title="Mở tin tuyển dụng"><ExternalLink className="h-4 w-4" /></a>}
                {canEditExperience && <button onClick={() => onEditExperience(app)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200" aria-label="Sửa kinh nghiệm" title="Sửa kinh nghiệm"><BookOpen className="h-4 w-4" /></button>}
                <button onClick={() => onDelete(app)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400" aria-label="Xóa" title="Xóa"><Trash2 className="h-4 w-4" /></button>
            </div>
          </article>
        );
      })}
        </div>
      </div>
    </div>
  );
}
