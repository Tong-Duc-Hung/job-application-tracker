"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Pencil, Trash2, Plus, ExternalLink, Video, Tag, Clock, ArrowLeft, NotebookPen, Building2, CalendarDays } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import type { Interview, Note } from "@prisma/client";
import { Button } from "@/shared/ui/Button";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { ResultBadge, typeLabel } from "@/shared/ui/Badge";
import { EmptyState } from "@/shared/ui/EmptyState";
import { useToast } from "@/shared/ui/Toast";
import { formatDate } from "@/shared/utils/formatDate";

/** Một buổi phỏng vấn kèm thông tin đơn ứng tuyển liên quan và các ghi chú chuẩn bị. */
type InterviewWithApplication = Interview & {
  application: { id: string; company: string; position: string };
  notes: Note[];
};

/** Sắc thái hiển thị của nhãn thời gian: sắp tới, hôm nay, hoặc đã trễ mà chưa cập nhật kết quả. */
type ScheduleTone = "upcoming" | "today" | "overdue";

/**
 * Tính nhãn hiển thị thời gian tương đối cho một buổi phỏng vấn còn PENDING (Hôm nay, Ngày mai, Còn N ngày,
 * hoặc cảnh báo đã qua ngày mà chưa cập nhật kết quả). Trả `null` nếu buổi phỏng vấn đã có kết quả.
 *
 * @param scheduledAt Thời điểm diễn ra.
 * @param result Kết quả hiện tại.
 */
function getScheduleStatus(scheduledAt: Date, result: Interview["result"]) {
  if (result !== "PENDING") return null;
  const days = differenceInCalendarDays(scheduledAt, new Date());
  if (days === 0) return { label: "Hôm nay", tone: "today" as ScheduleTone };
  if (days === 1) return { label: "Ngày mai", tone: "upcoming" as ScheduleTone };
  if (days > 1) return { label: `Còn ${days} ngày`, tone: "upcoming" as ScheduleTone };
  if (days === -1) return { label: "Hôm qua — chưa cập nhật kết quả", tone: "overdue" as ScheduleTone };
  return { label: `${Math.abs(days)} ngày trước — chưa cập nhật kết quả`, tone: "overdue" as ScheduleTone };
}

/** Màu nền/chữ tương ứng với từng sắc thái thời gian. */
const scheduleToneClasses: Record<ScheduleTone, string> = {
  upcoming: "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300",
  today: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  overdue: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
};

interface InterviewDetailProps {
  interview: InterviewWithApplication;
  embedded?: boolean;
  onDeleted?: () => void;
}

/**
 * Chi tiết một buổi phỏng vấn: thời gian, đơn ứng tuyển liên quan, nhận xét cá nhân và ghi chú chuẩn bị riêng.
 *
 * @property embedded Khi `true`, chỉ render phần nội dung (không có khung trang và nút quay lại) — dùng khi
 * hiển thị lồng trong một trang khác (ví dụ mở nhanh trong modal).
 * @property onDeleted Gọi thay vì tự điều hướng sau khi xóa thành công, để nơi nhúng tự quyết định hành vi tiếp theo.
 */
export function InterviewDetail({ interview, embedded = false, onDeleted }: InterviewDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromDashboard = searchParams.get("from") === "dashboard";
  const backHref = fromDashboard ? "/dashboard" : "/interviews";
  const { push } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Xóa buổi phỏng vấn hiện tại; gọi `onDeleted` nếu có (chế độ nhúng), ngược lại tự điều hướng về danh sách hoặc Dashboard.
   */
  async function handleDelete() {
    setIsDeleting(true);
    const res = await fetch(`/api/interviews/${interview.id}`, { method: "DELETE" });
    setIsDeleting(false);
    if (!res.ok) {
      push("Không thể xóa lịch phỏng vấn này.", "error");
      return;
    }
    push("Đã xóa lịch phỏng vấn");
    setDeleteOpen(false);
    if (onDeleted) onDeleted();
    else router.push(backHref);
  }

  const scheduledAt = new Date(interview.scheduledAt);
  const scheduleStatus = getScheduleStatus(scheduledAt, interview.result);
  const monthLabel = `Th${scheduledAt.getMonth() + 1}`;
  const dayLabel = String(scheduledAt.getDate()).padStart(2, "0");
  const timeLabel = scheduledAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const weekdayLabel = scheduledAt.toLocaleDateString("vi-VN", { weekday: "long" });

  const content = (
    <div className="p-5 sm:p-6">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 border-l-4 border-l-brand-500 bg-white shadow-sm dark:border-white/10 dark:border-l-brand-400 dark:bg-slate-900">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="w-16 shrink-0 overflow-hidden rounded-2xl border border-brand-200 bg-brand-50 text-center shadow-sm dark:border-brand-500/20 dark:bg-brand-500/10">
              <div className="bg-brand-600 py-1 text-[10px] font-semibold uppercase tracking-wide text-white dark:bg-brand-500">{monthLabel}</div>
              <div className="py-2 text-2xl font-bold text-brand-700 dark:text-brand-300">{dayLabel}</div>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">{interview.title}</h1>
                <ResultBadge result={interview.result} />
              </div>
              <button
                onClick={() => router.push(`/applications/${interview.application.id}`)}
                className="mt-1 flex max-w-full items-center gap-1.5 truncate text-sm font-medium text-slate-600 transition-colors hover:text-brand-700 dark:text-slate-300 dark:hover:text-brand-300"
              >
                <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{interview.application.company} · {interview.application.position}</span>
              </button>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300"><Clock className="h-3.5 w-3.5" />{timeLabel}, {weekdayLabel}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"><Tag className="h-3.5 w-3.5" />{typeLabel[interview.type]}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 lg:shrink-0">
            <Button variant="outline" onClick={() => router.push(`/interviews/${interview.id}/edit`)} className="flex-1 sm:flex-none"><Pencil className="h-4 w-4" /> Chỉnh sửa</Button>
            <Button variant="danger" onClick={() => setDeleteOpen(true)} className="flex-1 sm:flex-none"><Trash2 className="h-4 w-4" /> Xóa</Button>
          </div>
        </div>
      </section>

      {scheduleStatus && (
        <div
          className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${scheduleToneClasses[scheduleStatus.tone]}`}
        >
          <Clock className="h-3 w-3" />
          {scheduleStatus.label}
        </div>
      )}

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            <div><h2 className="text-base font-semibold text-slate-900 dark:text-white">Thông tin buổi phỏng vấn</h2><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Chi tiết lịch và hình thức tham gia</p></div>
          </div>
        </div>
        <div className="grid gap-4 border-t border-slate-100 pt-4 dark:border-white/10 sm:grid-cols-2 lg:grid-cols-4">
          <div><p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Thời gian</p><p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{timeLabel}</p><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{weekdayLabel}, {dayLabel}/{scheduledAt.getMonth() + 1}</p></div>
          <div><p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Loại phỏng vấn</p><p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{typeLabel[interview.type]}</p></div>
          <div><p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Kết quả</p><div className="mt-1"><ResultBadge result={interview.result} /></div></div>
          <div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Địa điểm / hình thức</p>{interview.meetingUrl ? <button onClick={() => window.open(interview.meetingUrl!, "_blank", "noopener,noreferrer")} className="mt-1 flex max-w-full items-center gap-1.5 text-left text-sm font-semibold text-brand-700 hover:text-brand-900 dark:text-brand-300 dark:hover:text-brand-200"><Video className="h-4 w-4 shrink-0" /><span className="truncate">{interview.meetingLocation || "Phỏng vấn trực tuyến"}</span><ExternalLink className="h-3.5 w-3.5 shrink-0" /></button> : <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100"><Video className="h-4 w-4 shrink-0 text-slate-400" />{interview.meetingLocation || "Chưa cập nhật"}</p>}</div>
        </div>
      </section>

      {interview.review && (
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900 sm:p-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Nhận xét sau buổi phỏng vấn</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">{interview.review}</p>
        </section>
      )}

      <div className="mt-7">
        <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">Ghi chú chuẩn bị</p>
        {interview.notes.length === 0 ? (
          <div className="flex flex-col items-center gap-3">
            <EmptyState
              icon={<NotebookPen className="h-8 w-8" />}
              title="Chưa có ghi chú nào"
              description="Ghi lại kiến thức cần ôn hoặc câu hỏi có thể gặp trong vòng phỏng vấn này."
            />
            <Button variant="outline" onClick={() => router.push(`/notes/new?interviewId=${interview.id}`)}>
              <Plus className="h-4 w-4" /> Thêm ghi chú
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
            {interview.notes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => router.push(`/notes?interviewId=${interview.id}&noteId=${note.id}`)}
                className="w-full rounded-2xl border border-slate-200 p-3.5 text-left shadow-sm transition-colors hover:border-brand-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 dark:border-white/10 dark:hover:border-brand-500/40"
              >
                <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{note.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{note.content}</p>
                <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">{formatDate(note.createdAt)}</p>
              </button>
            ))}
            <button
              onClick={() => router.push(`/notes/new?interviewId=${interview.id}`)}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-300 p-3.5 text-xs text-slate-400 transition-colors hover:border-violet-300 hover:text-violet-600 dark:border-white/15 dark:hover:border-violet-500/40 dark:hover:text-violet-300"
            >
              <Plus className="h-3.5 w-3.5" /> Thêm ghi chú
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Xóa lịch phỏng vấn"
        description="Thao tác này sẽ xóa vĩnh viễn lịch phỏng vấn này cùng các ghi chú liên quan."
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );

  if (embedded) return content;

  return (
    <div className="mx-auto w-full max-w-7xl pb-12">
      <nav className="mb-2 flex items-center gap-1.5 px-5 text-sm text-slate-500 dark:text-slate-400 sm:px-6">
        <Button variant="ghost" onClick={() => router.push(backHref)} className="-ml-2 w-fit rounded-full px-2">
          <ArrowLeft className="h-4 w-4" /> {fromDashboard ? "Quay về" : "Quay về Lịch phỏng vấn"}
        </Button>
      </nav>
      {content}
    </div>
  );
}
