"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  format,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarClock } from "lucide-react";
import type { Interview } from "@prisma/client";
import { cn } from "@/shared/utils/cn";
import { ResultBadge } from "@/shared/ui/Badge";
import { EmptyState } from "@/shared/ui/EmptyState";

type InterviewRow = Interview & {
  application: { id: string; company: string; position: string };
};

interface InterviewCalendarProps {
  month: Date;
  onMonthChange: (month: Date) => void;
  interviews: InterviewRow[];
}

const weekdayLabels = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"];

/** Màu theo trạng thái của vòng phỏng vấn. */
function getStatusStyle(result: string) {
  switch (result) {
    case "PASSED":
      return {
        dot: "bg-emerald-500",
        accent: "bg-emerald-500",
      };
    case "FAILED":
      return {
        dot: "bg-rose-500",
        accent: "bg-rose-500",
      };
    case "PENDING":
      return {
        dot: "bg-amber-500",
        accent: "bg-amber-500",
      };
    case "CANCELLED":
      return {
        dot: "bg-slate-400",
        accent: "bg-slate-400",
      };
    case "NO_SHOW":
      return {
        dot: "bg-orange-500",
        accent: "bg-orange-500",
      };
    default:
      return {
        dot: "bg-sky-500",
        accent: "bg-sky-500",
      };
  }
}

export function InterviewCalendar({
  month,
  onMonthChange,
  interviews,
}: InterviewCalendarProps) {
  const router = useRouter();

  const [selectedDay, setSelectedDay] = useState<Date>(() =>
    isSameMonth(new Date(), month) ? new Date() : startOfMonth(month)
  );

  useEffect(() => {
    setSelectedDay((current) =>
      isSameMonth(current, month) ? current : startOfMonth(month)
    );
  }, [month]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const interviewsByDay = useMemo(() => {
    const map = new Map<string, InterviewRow[]>();
    for (const interview of interviews) {
      const key = format(new Date(interview.scheduledAt), "yyyy-MM-dd");
      const list = map.get(key);
      if (list) list.push(interview);
      else map.set(key, [interview]);
    }
    map.forEach((list) =>
      list.sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      )
    );
    return map;
  }, [interviews]);

  const selectedDayInterviews =
    interviewsByDay.get(format(selectedDay, "yyyy-MM-dd")) ?? [];

  const stats = useMemo(() => {
    let passed = 0;
    let pending = 0;
    let failed = 0;
    let cancelled = 0;
    let noShow = 0;
    for (const iv of interviews) {
      const r = iv.result as unknown as string;
      if (r === "PASSED") passed++;
      else if (r === "FAILED") failed++;
      else if (r === "CANCELLED") cancelled++;
      else if (r === "NO_SHOW") noShow++;
      else pending++;
    }
    return { passed, pending, failed, cancelled, noShow };
  }, [interviews]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
      <div className="lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <div className="p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                Tháng {format(month, "M, yyyy")}
              </h2>
              <div className="mt-1 flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {stats.passed} đạt
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {stats.pending} chờ
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  {stats.failed} không đạt
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  {stats.cancelled} đã hủy
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  {stats.noShow} vắng mặt
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onMonthChange(subMonths(month, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
                aria-label="Tháng trước"
                title="Tháng trước"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => onMonthChange(new Date())}
                className="h-8 rounded-lg px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
              >
                Hôm nay
              </button>
              <button
                onClick={() => onMonthChange(addMonths(month, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
                aria-label="Tháng sau"
                title="Tháng sau"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 pb-2">
            {weekdayLabels.map((d, i) => (
              <div
                key={d}
                className={cn(
                  "text-center text-[11px] font-medium uppercase tracking-wide",
                  i >= 5
                    ? "text-slate-300 dark:text-slate-600"
                    : "text-slate-400 dark:text-slate-500"
                )}
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const list = interviewsByDay.get(key) ?? [];
              const inMonth = isSameMonth(day, month);
              const today = isToday(day);
              const selected = isSameDay(day, selectedDay);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "flex min-h-[92px] flex-col rounded-lg border p-1.5 text-left transition-colors sm:min-h-[112px]",
                    !inMonth &&
                      "cursor-default border-transparent text-slate-300 dark:text-slate-700",
                    inMonth &&
                      selected &&
                      "border-sky-500 bg-sky-50 dark:border-sky-500 dark:bg-sky-500/10",
                    inMonth &&
                      !selected &&
                      today &&
                      "border-sky-300 bg-sky-50/50 dark:border-sky-500/40 dark:bg-sky-500/[0.06]",
                    inMonth &&
                      !selected &&
                      !today &&
                      "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:hover:bg-white/5"
                  )}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums",
                        !inMonth && "text-slate-300 dark:text-slate-700",
                        inMonth &&
                          today &&
                          "bg-sky-600 text-white",
                        inMonth &&
                          !today &&
                          selected &&
                          "text-sky-700 dark:text-sky-300",
                        inMonth &&
                          !today &&
                          !selected &&
                          "text-slate-700 dark:text-slate-200"
                      )}
                    >
                      {format(day, "d")}
                    </span>

                    {inMonth && list.length > 1 && (
                      <span className="text-[10px] font-medium tabular-nums text-slate-400 dark:text-slate-500">
                        {list.length}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-1">
                    {inMonth &&
                      list.map((iv) => {
                        const s = getStatusStyle(iv.result as unknown as string);
                        return (
                          <span
                            key={iv.id}
                            className="flex min-w-0 max-w-full items-center gap-1 overflow-hidden rounded border border-slate-200/80 bg-white px-1 py-0.5 text-[10px] leading-tight dark:border-white/10 dark:bg-white/5"
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 shrink-0 rounded-full",
                                s.dot
                              )}
                            />
                            <span className="shrink-0 font-medium tabular-nums text-slate-500 dark:text-slate-400">
                              {format(new Date(iv.scheduledAt), "HH:mm")}
                            </span>
                            <span className="min-w-0 truncate break-words font-medium text-slate-700 dark:text-slate-200">
                              {iv.application.company}
                            </span>
                          </span>
                        );
                      })}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-4 dark:border-white/5">
            {[
              { dot: "bg-sky-500", label: "Sắp diễn ra" },
              { dot: "bg-emerald-500", label: "Đạt" },
              { dot: "bg-amber-500", label: "Chờ kết quả" },
              { dot: "bg-rose-500", label: "Không đạt" },
              { dot: "bg-slate-400", label: "Đã hủy" },
              { dot: "bg-orange-500", label: "Vắng mặt" },
            ].map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", item.dot)} />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className="min-w-0 overflow-hidden border-t border-slate-200 p-4 dark:border-white/10 sm:p-6 lg:border-l lg:border-t-0">
          <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Lịch trong ngày
              </p>
              <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                {format(selectedDay, "dd/MM/yyyy")}
              </h3>
              <p className="text-xs capitalize text-slate-400 dark:text-slate-500">
                {format(selectedDay, "EEEE")}
              </p>
            </div>

            {selectedDayInterviews.length > 0 && (
              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                {selectedDayInterviews.length} lịch
              </span>
            )}
          </div>

          {selectedDayInterviews.length === 0 ? (
            <EmptyState
              icon={<CalendarClock className="h-8 w-8" />}
              title="Không có lịch phỏng vấn ngày này"
            />
          ) : (
            <ul className="flex flex-col">
              {selectedDayInterviews.map((interview, index) => {
                const s = getStatusStyle(interview.result as unknown as string);
                const isLast = index === selectedDayInterviews.length - 1;

                return (
                  <li
                    key={interview.id}
                    className="grid grid-cols-[44px_16px_1fr] gap-2"
                  >
                    <div className="pt-0.5 text-right text-xs font-medium tabular-nums text-slate-500 dark:text-slate-400">
                      {format(new Date(interview.scheduledAt), "HH:mm")}
                    </div>

                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          "mt-1 h-2 w-2 shrink-0 rounded-full",
                          s.dot
                        )}
                      />
                      {!isLast && (
                        <span className="mt-1 w-px flex-1 bg-slate-200 dark:bg-white/10" />
                      )}
                    </div>

                    <div
                      onClick={() => router.push(`/interviews/${interview.id}`)}
                      className="group -ml-1 min-w-0 cursor-pointer overflow-hidden rounded-lg px-2 pb-4 pt-0.5 transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <p className="min-w-0 truncate break-words text-sm font-medium text-slate-800 group-hover:text-sky-600 dark:text-slate-100 dark:group-hover:text-sky-400">
                          {interview.application.company}
                        </p>
                        <ResultBadge result={interview.result} />
                      </div>
                      <p className="mt-0.5 truncate break-words text-xs text-slate-500 dark:text-slate-400">
                        {interview.title}
                        <span className="mx-1 text-slate-300 dark:text-slate-600">•</span>
                        {interview.application.position}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
