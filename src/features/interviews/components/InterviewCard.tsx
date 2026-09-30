"use client";

import { useRouter } from "next/navigation";
import { Clock, Eye, ExternalLink, MapPin, Pencil, Trash2, Video } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import type { Interview } from "@prisma/client";
import { ResultBadge, TypeBadge } from "@/shared/ui/Badge";

/**
 * Một buổi phỏng vấn kèm thông tin rút gọn của đơn ứng tuyển liên quan, dùng cho thẻ hiển thị trong danh sách.
 */
type InterviewRow = Interview & { application: { id: string; company: string; position: string } };

interface InterviewCardProps {
  interview: InterviewRow;
  onEdit: (interview: Interview) => void;
  onDelete: (interview: Interview) => void;
}

/**
 * Thẻ hiển thị một buổi phỏng vấn trong danh sách: thời gian, đơn ứng tuyển liên quan, địa điểm/link họp, kết quả và các nút thao tác nhanh.
 */
export function InterviewCard({ interview, onEdit, onDelete }: InterviewCardProps) {
  const router = useRouter();

  return (
    <article
      onClick={() => router.push(`/interviews/${interview.id}`)}
      className="group grid w-full cursor-pointer grid-cols-[76px_minmax(0,1fr)] gap-3 overflow-hidden rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-sm shadow-slate-200/20 transition-all hover:border-brand-300 hover:shadow-md dark:border-white/10 dark:bg-slate-900 dark:shadow-black/10 dark:hover:border-brand-500/30 sm:grid-cols-[92px_minmax(0,1fr)_auto] sm:gap-4 sm:p-3"
    >
      <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200/80 bg-slate-50/80 px-2 py-2 text-center dark:border-white/10 dark:bg-white/[0.03]">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">{format(new Date(interview.scheduledAt), "EEE", { locale: vi })}</span>
        <span className="mt-0.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{format(new Date(interview.scheduledAt), "dd/MM")}</span>
        <span className="my-1.5 h-px w-8 bg-slate-200 dark:bg-white/10" />
        <span className="inline-flex items-center gap-1 text-lg font-bold leading-5 tracking-tight text-slate-900 dark:text-white">
          <Clock className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
          {format(new Date(interview.scheduledAt), "HH:mm")}
        </span>
      </div>

      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <button
            onClick={() => router.push(`/interviews/${interview.id}`)}
            type="button"
            className="min-w-0 flex-1 truncate break-words text-left text-sm font-semibold text-slate-900 transition-colors group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-300"
          >
            {interview.title}
          </button>
          <TypeBadge type={interview.type} />
        </div>
        <p className="mt-1 truncate break-words text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-600 dark:text-slate-300">{interview.application.company}</span>
          <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
          {interview.application.position}
        </p>
        <div className="mt-2 flex min-h-4 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
          {interview.meetingUrl ? (
            <button
              onClick={(event) => {
                event.stopPropagation();
                window.open(interview.meetingUrl!, "_blank", "noopener,noreferrer");
              }}
              type="button"
            aria-label="Mở địa điểm phỏng vấn"
            title="Mở địa điểm phỏng vấn"
              className="inline-flex min-w-0 max-w-full items-center gap-1 text-brand-700 transition-colors hover:text-brand-900 dark:text-brand-300 dark:hover:text-brand-200"
            >
              <Video className="h-3 w-3 shrink-0" />
              <span className="truncate">{interview.meetingLocation || "Online"}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </button>
          ) : interview.meetingLocation ? (
            <span className="inline-flex min-w-0 max-w-full items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="truncate">{interview.meetingLocation}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500">
              <MapPin className="h-3 w-3 shrink-0" />
              Chưa có địa điểm
            </span>
          )}
        </div>
        {interview.review && <p className="mt-1 truncate break-words text-[11px] text-slate-400 dark:text-slate-500">Nhận xét: {interview.review}</p>}
      </div>

      <div className="col-span-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 sm:col-span-1 sm:min-w-[112px] sm:flex-col sm:items-end sm:justify-between sm:border-t-0 sm:pt-0">
        <ResultBadge result={interview.result} />
        <div className="flex shrink-0 gap-0.5 opacity-80 transition-opacity group-hover:opacity-100">
          <button
            onClick={(event) => {
              event.stopPropagation();
              router.push(`/interviews/${interview.id}`);
            }}
            type="button"
            aria-label="Xem chi tiết"
            title="Xem chi tiết"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onEdit(interview);
            }}
            type="button"
            aria-label="Sửa"
            title="Sửa"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onDelete(interview);
            }}
            type="button"
            aria-label="Xóa"
            title="Xóa"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
