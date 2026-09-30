import Link from "next/link";
import { addDays } from "date-fns";
import { AlertTriangle, CalendarClock, Briefcase, ArrowRight, Sparkles, NotebookPen, Layers3 } from "lucide-react";
import { getCurrentUser } from "@/shared/auth/session";
import * as applicationService from "@/features/applications/application.service";
import * as interviewService from "@/features/interviews/interview.service";
import * as noteService from "@/features/notes/note.service";
import { Card, CardHeader } from "@/shared/ui/Card";
import { StatusBadge } from "@/shared/ui/Badge";
import { EmptyState } from "@/shared/ui/EmptyState";
import { formatRelativeSchedule, formatDate, isOverdue } from "@/shared/utils/formatDate";
import { cn } from "@/shared/utils/cn";

/**
 * Số bản ghi hiển thị cho mỗi khối "gần đây" trên Dashboard (phỏng vấn sắp tới, hạn chót, đơn ứng tuyển mới nhất).
 */
const RECENT_COUNT = 4;

/**
 * Trang Tổng quan: 4 thẻ số liệu nhanh (tổng đơn, lịch phỏng vấn, ghi chú và đơn có kinh nghiệm),
 * danh sách phỏng vấn sắp tới, cảnh báo hạn chót và các đơn ứng tuyển gần đây nhất.
 * Toàn bộ dữ liệu được tải song song ở server (`Promise.all`) để giảm thời gian phản hồi.
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [applicationCount, interviewCount, noteCount, experienceCount, recentInterviews, deadlineAlerts, recent] = await Promise.all([
    applicationService.countApplications(user.id),
    interviewService.countInterviews(user.id),
    noteService.countNotes(user.id),
    applicationService.countApplicationsWithExperience(user.id),
    interviewService.recentInterviews(user.id, RECENT_COUNT),
    applicationService.listUrgentDeadlines(user.id, undefined, RECENT_COUNT),
    applicationService.listApplications(user.id, {
      sortBy: "createdAt",
      sortDir: "desc",
      page: 1,
      pageSize: RECENT_COUNT,
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-2xl border border-brand-200/80 bg-gradient-to-br from-brand-700 via-brand-600 to-cyan-600 px-5 py-6 text-white shadow-lg shadow-brand-600/15 sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border-[28px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-24 right-20 h-40 w-40 rounded-full border-[18px] border-cyan-300/10" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-cyan-100">
              <Sparkles className="h-4 w-4" /> Bảng điều khiển cá nhân
            </div>
            <h1 className="max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl">
              Chào {user.name.split(" ").pop()}, tiếp tục tiến về phía trước.
            </h1>
            <p className="mt-2 max-w-lg text-sm text-brand-100">Một góc nhìn nhanh về hành trình tìm việc và việc cần ưu tiên hôm nay.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<Briefcase className="h-4 w-4" />} label="Đơn ứng tuyển" value={applicationCount} detail="đơn" color="brand" />
        <MetricCard icon={<CalendarClock className="h-4 w-4" />} label="Lịch phỏng vấn" value={interviewCount} detail="lịch" color="amber" />
        <MetricCard icon={<NotebookPen className="h-4 w-4" />} label="Ghi chú" value={noteCount} detail="ghi chú" color="red" />
        <MetricCard icon={<Layers3 className="h-4 w-4" />} label="Số đơn có kinh nghiệm" value={experienceCount} detail="đơn" color="emerald" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Lịch phỏng vấn gần đây"
            action={
              <Link
                href="/interviews"
                className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
              >
                Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {recentInterviews.length === 0 ? (
            <EmptyState icon={<CalendarClock className="h-8 w-8" />} title="Chưa có lịch phỏng vấn nào" />
          ) : (
            <ul className="flex flex-col gap-2">
              {recentInterviews.map((interview) => {
                const soon = interview.scheduledAt <= addDays(new Date(), 1);
                return (
                  <li key={interview.id} className="rounded-xl">
                    <Link
                      href={`/interviews/${interview.id}?from=dashboard`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 border-l-4 border-l-brand-500 bg-slate-50/60 px-4 py-3 transition-colors hover:border-brand-300 hover:bg-brand-50/50 dark:border-white/10 dark:border-l-brand-400 dark:bg-white/[0.03] dark:hover:border-brand-500/40 dark:hover:bg-brand-500/5"
                    >
                      <div className="min-w-0">
                        <p className="line-clamp-2 break-words text-sm font-medium text-slate-800 dark:text-slate-100">
                          {interview.application.company} — {interview.title}
                        </p>
                        <p className="line-clamp-2 break-words text-xs text-slate-500 dark:text-slate-400">{interview.application.position}</p>
                      </div>
                      <span
                        className={`shrink-0 text-xs font-medium ${
                          soon ? "text-brand-600 dark:text-brand-400" : "text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {formatRelativeSchedule(interview.scheduledAt)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Cảnh báo" description="Hạn chót cần chú ý" />
          {deadlineAlerts.length === 0 ? (
            <EmptyState icon={<AlertTriangle className="h-8 w-8" />} title="Không có hạn chót gấp nào" />
          ) : (
            <ul className="flex flex-col gap-2">
              {deadlineAlerts.map((app) => (
                <li key={app.id} className="rounded-xl">
                  <Link
                    href={`/applications/${app.id}?from=dashboard`}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl border border-slate-200 border-l-4 bg-slate-50/60 px-4 py-3 transition-colors dark:border-white/10 dark:bg-white/[0.03]",
                      isOverdue(app.deadline!)
                        ? "border-l-red-500 hover:border-red-300 hover:bg-red-50/50 dark:border-l-red-400 dark:hover:border-red-500/40 dark:hover:bg-red-500/5"
                        : "border-l-amber-500 hover:border-amber-300 hover:bg-amber-50/50 dark:border-l-amber-400 dark:hover:border-amber-500/40 dark:hover:bg-amber-500/5"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="line-clamp-2 break-words text-sm font-medium text-slate-800 dark:text-slate-100">
                        {app.company} — {app.position}
                      </p>
                      <p
                        className={`text-xs ${
                          isOverdue(app.deadline!)
                            ? "font-medium text-red-600 dark:text-red-400"
                            : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {isOverdue(app.deadline!) ? "Đã quá hạn" : "Hạn chót"} {formatDate(app.deadline!)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Đơn ứng tuyển gần đây"
          description="Những cơ hội mới nhất trong hồ sơ của bạn"
          action={
            <Link
              href="/applications"
              className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        {recent.items.length === 0 ? (
          <EmptyState
            icon={<Briefcase className="h-8 w-8" />}
            title="Chưa có đơn ứng tuyển nào"
            description="Sang tab “Đơn ứng tuyển” để thêm đơn đầu tiên."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {recent.items.map((app) => (
              <li key={app.id} className="rounded-xl">
                <Link
                  href={`/applications/${app.id}?from=dashboard`}
                  className="grid min-h-[72px] grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-slate-200 border-l-4 border-l-brand-500 bg-slate-50/60 px-3.5 py-3 transition-colors hover:border-brand-300 hover:bg-brand-50/50 dark:border-white/10 dark:border-l-brand-400 dark:bg-white/[0.03] dark:hover:border-brand-500/40 dark:hover:bg-brand-500/5 sm:px-4"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                    {app.company.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{app.company}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{app.position}</p>
                  </div>
                  <span className="shrink-0"><StatusBadge status={app.status} /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/** Thẻ số liệu nhanh trên Dashboard: icon, nhãn, giá trị lớn và mô tả phụ. */
function MetricCard({
  icon,
  label,
  value,
  detail,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  detail: string;
  color: "brand" | "amber" | "red" | "emerald";
}) {
  const colors = {
    brand: "bg-brand-100 text-brand-700 ring-brand-200 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-400/20",
    amber: "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/20",
    red: "bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-400/20",
    emerald: "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/20",
  };

  return (
    <Card className="group rounded-xl border-slate-200/80 p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 sm:p-3.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset transition-transform duration-200 group-hover:scale-105", colors[color])}>{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 break-words text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</p>
          <div className="mt-0.5 flex min-w-0 items-baseline gap-2">
            <span className="shrink-0 text-xl font-bold leading-none tracking-tight tabular-nums text-slate-900 dark:text-white">{value}</span>
            <p className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">{detail}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
