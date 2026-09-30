"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  ChevronRight,
  Pencil,
  Trash2,
  ExternalLink,
  CalendarClock,
  NotebookPen,
  TrendingUp,
  BriefcaseBusiness,
  CheckCircle2,
  Circle,
  MapPin,
  Plus,
} from "lucide-react";
import type { Application, Interview, Note } from "@prisma/client";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { ResultBadge, StatusBadge, PriorityBadge, TypeBadge } from "@/shared/ui/Badge";
import { useToast } from "@/shared/ui/Toast";
import { formatDate, formatRelativeSchedule, isOverdue } from "@/shared/utils/formatDate";
import { cn } from "@/shared/utils/cn";

/**
 * Một đơn ứng tuyển kèm đầy đủ quan hệ: các buổi phỏng vấn (mỗi buổi kèm ghi chú riêng) và ghi chú gắn trực tiếp vào đơn.
 */
type ApplicationWithRelations = Application & {
  interviews: (Interview & { notes: Note[] })[];
  notes: Note[];
};

/**
 * Lấy chữ viết tắt từ tên công ty để hiển thị trong huy hiệu tròn khi không có logo.
 *
 * @param name Tên công ty.
 * @returns Một hoặc hai chữ cái viết hoa; `"?"` nếu tên rỗng.
 */
function getInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  const initials = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0];
  return initials.toUpperCase();
}

/**
 * Trang chi tiết một đơn ứng tuyển: thông tin chính, dòng thời gian các vòng phỏng vấn gần đây,
 * ghi chú gần đây và các số liệu tổng quan nhanh.
 * `?from=dashboard` trên URL quyết định đường quay lại (Dashboard hay danh sách Đơn ứng tuyển).
 */
export function ApplicationDetail({ application }: { application: ApplicationWithRelations }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromDashboard = searchParams.get("from") === "dashboard";
  const backHref = fromDashboard ? "/dashboard" : "/applications";
  const { push } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /** Xóa đơn ứng tuyển hiện tại rồi điều hướng về danh sách hoặc Dashboard tùy nguồn mở trang. */
  async function handleDelete() {
    setIsDeleting(true);
    const res = await fetch(`/api/applications/${application.id}`, { method: "DELETE" });
    setIsDeleting(false);
    if (!res.ok) {
      push("Không thể xóa đơn ứng tuyển này.", "error");
      return;
    }
    push("Đã xóa đơn ứng tuyển");
    router.push(backHref);
  }

  const allNotes = [
    ...application.notes.map((note) => ({ note, interviewTitle: null as string | null })),
    ...application.interviews.flatMap((interview) =>
      interview.notes.map((note) => ({ note, interviewTitle: interview.title }))
    ),
  ].sort((a, b) => new Date(b.note.createdAt).getTime() - new Date(a.note.createdAt).getTime());

  const recentInterviews = [...application.interviews]
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    .slice(0, 3);
  const recentNotes = allNotes.slice(0, 3);
  return (
    <div className="mx-auto w-full max-w-7xl pb-12">
      <nav className="mb-5 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
        <button onClick={() => router.push(backHref)} className="transition-colors hover:text-slate-900 dark:hover:text-white">
          {fromDashboard ? "Quay về" : "Quay về Đơn ứng tuyển"}
        </button>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate font-medium text-slate-900 dark:text-white">{application.company}</span>
      </nav>

      <section className="relative overflow-hidden rounded-2xl border border-slate-200 border-l-4 border-l-brand-500 bg-white shadow-sm dark:border-white/10 dark:border-l-brand-400 dark:bg-slate-900">
        <div className="relative flex flex-col gap-6 px-5 py-6 sm:px-7 sm:py-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-base font-bold uppercase tracking-wide text-brand-700 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/20">
              {getInitials(application.company)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-2xl">{application.position}</h1>
                <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">·</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">{application.company}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge status={application.status} />
                <PriorityBadge priority={application.priority} />
                {application.location && <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"><MapPin className="h-3.5 w-3.5" />{application.location}</span>}
              </div>
            </div>
          </div>

          <div className="flex gap-2 sm:shrink-0">
            <Button
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={() => router.push(`/applications/${application.id}/edit`)}
            >
              <Pencil className="h-4 w-4" /> Chỉnh sửa
            </Button>
            <Button variant="danger" className="flex-1 sm:flex-none" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" /> Xóa
            </Button>
          </div>
        </div>
      </section>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]">
        <main className="space-y-6">
          <Card className="p-5 sm:p-6"><div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="text-base font-semibold text-slate-900 dark:text-white">Tiến trình hồ sơ</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Các hoạt động gần đây của đơn ứng tuyển</p></div><button onClick={() => router.push(`/interviews/new?applicationId=${application.id}`)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-300"><Plus className="h-4 w-4" /> Thêm vòng</button></div><div className="relative space-y-5 pl-8"><div className="absolute bottom-2 left-3 top-2 w-px bg-slate-200 dark:bg-white/10" /><div className="relative"><div className="absolute -left-8 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ring-4 ring-white dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-slate-900"><CheckCircle2 className="h-4 w-4" /></div><p className="text-sm font-semibold text-slate-900 dark:text-white">Đã ứng tuyển</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDate(application.appliedDate)}</p></div>{recentInterviews.length > 0 ? recentInterviews.map((interview) => <button key={interview.id} onClick={() => router.push(`/interviews/${interview.id}`)} className="group relative block w-full text-left"><div className="absolute -left-8 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-600 ring-4 ring-white dark:bg-amber-500/15 dark:text-amber-400 dark:ring-slate-900"><CalendarClock className="h-3.5 w-3.5" /></div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-slate-900 group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-300">{interview.title}</p><TypeBadge type={interview.type} /><ResultBadge result={interview.result} /></div><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatRelativeSchedule(interview.scheduledAt)}</p></button>) : <div className="relative"><div className="absolute -left-8 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 ring-4 ring-white dark:bg-white/10 dark:ring-slate-900"><Circle className="h-3.5 w-3.5" /></div><p className="text-sm text-slate-500 dark:text-slate-400">Chưa có vòng phỏng vấn nào</p></div>}</div></Card>

          <Card className="p-5 sm:p-6"><div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="text-base font-semibold text-slate-900 dark:text-white">Ghi chú gần đây</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Thông tin chuẩn bị và điều cần nhớ</p></div><button onClick={() => router.push(`/notes/new?applicationId=${application.id}`)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-300"><Plus className="h-4 w-4" /> Thêm ghi chú</button></div>{recentNotes.length > 0 ? <div className="divide-y divide-slate-100 dark:divide-white/10">{recentNotes.map(({ note, interviewTitle }) => <button key={note.id} onClick={() => router.push(`/notes/${note.id}/edit`)} className="group block w-full py-3 text-left first:pt-0 last:pb-0"><div className="flex items-center gap-2"><NotebookPen className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" /><p className="truncate text-sm font-semibold text-slate-900 group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-300">{note.title}</p></div><p className="mt-1 line-clamp-2 pl-6 text-sm text-slate-500 dark:text-slate-400">{note.content}</p>{interviewTitle && <p className="mt-1 pl-6 text-xs text-slate-400 dark:text-slate-500">Gắn với: {interviewTitle}</p>}</button>)}</div> : <p className="text-sm text-slate-500 dark:text-slate-400">Chưa có ghi chú nào cho hồ sơ này.</p>}</Card>

          {application.experience && <Card className="p-5 sm:p-6"><div className="mb-4 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"><TrendingUp className="h-4 w-4" /></div><div><h2 className="text-base font-semibold text-slate-900 dark:text-white">Kinh nghiệm rút ra</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Điều cần ghi nhớ từ hồ sơ này</p></div></div><p className="whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{application.experience}</p></Card>}
        </main>

        <aside className="space-y-6 lg:sticky lg:top-5"><Card className="p-5"><div className="mb-4 flex items-center gap-3"><BriefcaseBusiness className="h-4 w-4 text-brand-600 dark:text-brand-400" /><h2 className="text-base font-semibold text-slate-900 dark:text-white">Thông tin công việc</h2></div><dl className="space-y-4"><div><dt className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Ngày ứng tuyển</dt><dd className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">{formatDate(application.appliedDate)}</dd></div><div><dt className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Địa điểm</dt><dd className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">{application.location || "Chưa cập nhật"}</dd></div><div><dt className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Mức lương</dt><dd className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">{application.salary || "Chưa cập nhật"}</dd></div><div><dt className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Hạn chót</dt><dd className={cn("mt-1 text-sm font-medium", application.deadline && isOverdue(application.deadline) ? "text-red-600 dark:text-red-400" : "text-slate-800 dark:text-slate-200")}>{application.deadline ? formatDate(application.deadline) : "Chưa đặt"}</dd></div></dl>{application.jobUrl && <a href={application.jobUrl} target="_blank" rel="noreferrer" className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/[0.04]"><ExternalLink className="h-4 w-4" /> Mở tin tuyển dụng</a>}</Card><Card className="p-0"><div className="border-b border-slate-100 px-5 py-4 dark:border-white/10"><p className="text-sm font-semibold text-slate-900 dark:text-white">Tổng quan nhanh</p></div><div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-white/10"><button onClick={() => router.push(`/interviews?applicationId=${application.id}`)} className="px-2 py-4 text-center transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.04]"><p className="text-lg font-semibold text-slate-900 dark:text-white">{application.interviews.length}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Phỏng vấn</p></button><button onClick={() => router.push(`/notes?applicationId=${application.id}`)} className="px-2 py-4 text-center transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.04]"><p className="text-lg font-semibold text-slate-900 dark:text-white">{allNotes.length}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Ghi chú</p></button><div className="px-2 py-4 text-center"><p className="text-lg font-semibold text-slate-900 dark:text-white">{application.experience ? "Có" : "-"}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Kinh nghiệm</p></div></div></Card></aside>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Xóa đơn ứng tuyển"
        description="Thao tác này sẽ xóa vĩnh viễn đơn ứng tuyển này cùng toàn bộ lịch phỏng vấn và ghi chú liên quan."
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
}
