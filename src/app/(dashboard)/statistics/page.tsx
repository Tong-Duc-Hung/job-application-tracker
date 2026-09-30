"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { addDays, format, startOfMonth, subMonths } from "date-fns";
import { ArrowRight, Briefcase, CalendarClock, CalendarRange } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { ApplicationChart } from "@/features/statistics/components/ApplicationChart";
import { InterviewChart } from "@/features/statistics/components/InterviewChart";
import type * as statisticsService from "@/features/statistics/statistics.service";

/** Loại báo cáo đang xem: đơn ứng tuyển hoặc phỏng vấn. */
type Tab = "applications" | "interviews";
/** Các khoảng thời gian dựng sẵn, cộng thêm "custom" khi người dùng tự chỉnh ngày bắt đầu/kết thúc. */
type RangePreset = "7d" | "30d" | "3m" | "6m" | "12m" | "all" | "custom";
/**
 * Kiểu dữ liệu thống kê đơn ứng tuyển, suy ra trực tiếp từ kiểu trả về của `getApplicationStatistics` để luôn khớp với server.
 */
type ApplicationStats = Awaited<ReturnType<typeof statisticsService.getApplicationStatistics>>;
/** Kiểu dữ liệu thống kê phỏng vấn, suy ra trực tiếp từ kiểu trả về của `getInterviewStatistics`. */
type InterviewStats = Awaited<ReturnType<typeof statisticsService.getInterviewStatistics>>;

/** Các lựa chọn khoảng thời gian hiển thị trong `SegmentedControl`. */
const RANGE_PRESETS: { value: Exclude<RangePreset, "custom">; label: string }[] = [
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
  { value: "3m", label: "3 tháng" },
  { value: "6m", label: "6 tháng" },
  { value: "12m", label: "12 tháng" },
  { value: "all", label: "Toàn bộ" },
];

/** Hai tab loại báo cáo hiển thị trong `SegmentedControl`. */
const CONTENT_TABS: { value: Tab; label: string; icon: typeof Briefcase }[] = [
  { value: "applications", label: "Đơn ứng tuyển", icon: Briefcase },
  { value: "interviews", label: "Phỏng vấn", icon: CalendarClock },
];

/**
 * Tính khoảng ngày `from`/`to` (dạng `yyyy-MM-dd`) tương ứng với một khoảng thời gian dựng sẵn.
 *
 * @param preset Khoảng thời gian dựng sẵn (không gồm "custom", vì "custom" không tự tính được).
 * @returns Ngày bắt đầu, ngày kết thúc và nhãn hiển thị tương ứng.
 */
function presetRange(preset: Exclude<RangePreset, "custom">) {
  const today = new Date();
  const to = format(today, "yyyy-MM-dd");
  if (preset === "all") return { from: "", to: "", label: "Toàn bộ dữ liệu" };
  if (preset === "7d") return { from: format(addDays(today, -6), "yyyy-MM-dd"), to, label: "7 ngày gần nhất" };
  if (preset === "30d") return { from: format(addDays(today, -29), "yyyy-MM-dd"), to, label: "30 ngày gần nhất" };
  const months = preset === "3m" ? 3 : preset === "6m" ? 6 : 12;
  return {
    from: format(startOfMonth(subMonths(today, months - 1)), "yyyy-MM-dd"),
    to,
    label: `${months} tháng gần nhất`,
  };
}

/**
 * Trang Thống kê: chọn khoảng thời gian (dựng sẵn hoặc tự chỉnh), chọn loại báo cáo (đơn ứng tuyển
 * hoặc phỏng vấn), rồi hiển thị biểu đồ tương ứng.
 * Dữ liệu của tab đang xem được giữ lại (`hasCurrentData`) trong lúc tải dữ liệu mới, để chuyển tab
 * hoặc đổi khoảng thời gian không làm biểu đồ nhấp nháy về trạng thái trống.
 */
export default function StatisticsPage() {
  const [tab, setTab] = useState<Tab>("applications");
  const [preset, setPreset] = useState<RangePreset>("6m");
  const initialRange = presetRange("6m");
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [applicationsData, setApplicationsData] = useState<ApplicationStats | null>(null);
  const [interviewsData, setInterviewsData] = useState<InterviewStats | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  // Ngày bắt đầu sau ngày kết thúc là không hợp lệ; hai ngày bằng nhau vẫn hợp lệ (lọc đúng một ngày).
  const invalidRange = Boolean(from && to && from > to);
  const hasCurrentData = tab === "applications" ? applicationsData !== null : interviewsData !== null;
  const showStaleNotice = invalidRange && hasCurrentData;

  // Tải lại số liệu mỗi khi đổi tab hoặc đổi khoảng thời gian. Bỏ qua việc gọi API khi khoảng thời gian không hợp lệ, giữ nguyên dữ liệu cũ (nếu có) để `showStaleNotice` có thể hiển thị cùng lúc với thông báo lỗi.
  useEffect(() => {
    let cancelled = false;
    setIsFetching(true);

    if (invalidRange) {
      setIsFetching(false);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      const params = new URLSearchParams({ tab });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      try {
        const res = await fetch(`/api/statistics?${params.toString()}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (tab === "applications") setApplicationsData(data.applications);
          else setInterviewsData(data.interviews);
        }
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tab, from, to, invalidRange]);

  const rangeLabel = preset === "custom" ? "Khoảng tùy chỉnh" : presetRange(preset).label;

  /** Chọn một khoảng thời gian dựng sẵn, tính lại `from`/`to` tương ứng. */
  function selectPreset(nextPreset: Exclude<RangePreset, "custom">) {
    const nextRange = presetRange(nextPreset);
    setPreset(nextPreset);
    setFrom(nextRange.from);
    setTo(nextRange.to);
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Thống kê</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Theo dõi kết quả ứng tuyển và lịch phỏng vấn theo thời gian.</p>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">Đang xem {rangeLabel.toLowerCase()}</p>
      </header>

      <section className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-sm shadow-slate-200/40 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/10">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-2.5 px-1">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <CalendarRange className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Khoảng thời gian</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Lọc toàn bộ số liệu báo cáo</p>
            </div>
          </div>

          <SegmentedControl
            ariaLabel="Chọn khoảng thời gian"
            size="sm"
            value={preset}
            onChange={selectPreset}
            options={RANGE_PRESETS}
          />

          {preset !== "all" && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                <span className="sr-only">Từ ngày</span>
                <input
                  type="date"
                  value={from}
                  onChange={(event) => {
                    setPreset("custom");
                    setFrom(event.target.value);
                  }}
                  aria-label="Từ ngày"
                  className={cn(
                    "h-9 rounded-lg border bg-white px-2.5 text-xs font-normal text-slate-900 outline-none transition-colors focus:ring-2 dark:bg-white/5 dark:text-slate-100",
                    invalidRange
                      ? "border-red-400 focus:border-red-500 focus:ring-red-500/30 dark:border-red-500/60"
                      : "border-slate-300 focus:border-brand-500 focus:ring-brand-500/30 dark:border-white/10"
                  )}
                />
              </label>
              <span className="hidden text-xs text-slate-400 sm:block">đến</span>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                <span className="sr-only">Đến ngày</span>
                <input
                  type="date"
                  value={to}
                  onChange={(event) => {
                    setPreset("custom");
                    setTo(event.target.value);
                  }}
                  aria-label="Đến ngày"
                  className={cn(
                    "h-9 rounded-lg border bg-white px-2.5 text-xs font-normal text-slate-900 outline-none transition-colors focus:ring-2 dark:bg-white/5 dark:text-slate-100",
                    invalidRange
                      ? "border-red-400 focus:border-red-500 focus:ring-red-500/30 dark:border-red-500/60"
                      : "border-slate-300 focus:border-brand-500 focus:ring-brand-500/30 dark:border-white/10"
                  )}
                />
              </label>
              <ArrowRight className="hidden h-4 w-4 text-slate-400 sm:block" />
            </div>
          )}
        </div>
        {invalidRange && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">Ngày bắt đầu phải trước ngày kết thúc.</p>
        )}
      </section>

      <SegmentedControl
        ariaLabel="Chọn loại báo cáo"
        value={tab}
        onChange={setTab}
        className="w-fit"
        options={CONTENT_TABS.map(({ value, label, icon: Icon }) => ({
          value,
          label: (
            <span className="inline-flex items-center gap-1.5">
              <Icon className="h-4 w-4" />
              {label}
            </span>
          ),
        }))}
      />

      <div className="relative">
        {isFetching && hasCurrentData && (
          <div className="pointer-events-none absolute -top-2 left-0 right-0 h-0.5 overflow-hidden rounded-full bg-brand-100 dark:bg-brand-500/20">
            <div className="stats-loading-bar h-full w-1/3 rounded-full bg-brand-500" />
          </div>
        )}

        {showStaleNotice && (
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            Đang hiển thị số liệu của khoảng thời gian trước đó — sửa lại ngày ở trên để cập nhật.
          </p>
        )}

        <div
          key={`${tab}-${hasCurrentData}`}
          className={cn("stats-fade-in", showStaleNotice && "pointer-events-none opacity-40")}
        >
          {!hasCurrentData ? (
            invalidRange ? null : isFetching ? (
              <StatisticsSkeleton />
            ) : (
              <EmptyState />
            )
          ) : tab === "applications" && applicationsData ? (
            <ApplicationChart data={applicationsData} periodLabel={rangeLabel} />
          ) : tab === "interviews" && interviewsData ? (
            <InterviewChart data={interviewsData} periodLabel={rangeLabel} />
          ) : null}
        </div>
      </div>

      <style>{`
        @keyframes statsFadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes statsLoadingBarSlide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .stats-fade-in { animation: statsFadeSlideIn 280ms ease-out; }
        .stats-loading-bar { animation: statsLoadingBarSlide 1.1s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .stats-fade-in, .stats-loading-bar { animation: none; }
        }
      `}</style>
    </div>
  );
}

/**
 * Bộ chọn dạng nhóm nút với thanh chỉ báo (indicator) trượt mượt tới vị trí nút đang được chọn.
 * Vị trí thanh chỉ báo được đo lại từ kích thước DOM thực tế của nút đang chọn (`useLayoutEffect`,
 * chạy trước khi trình duyệt vẽ khung hình, tránh hiện tượng giật hình khi vị trí thay đổi) và đo lại
 * khi cửa sổ đổi kích thước.
 *
 * @typeParam T Kiểu giá trị của các lựa chọn.
 * @property size Cỡ nút, ảnh hưởng padding và cỡ chữ (mặc định "md").
 */
function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = "md",
  className,
}: {
  options: { value: T; label: React.ReactNode }[];
  value: string;
  onChange: (value: T) => void;
  ariaLabel?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const activeButton = buttonRefs.current[value];
      if (!activeButton) {
        setIndicator(null);
        return;
      }
      setIndicator({ left: activeButton.offsetLeft, width: activeButton.offsetWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, options.length]);

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label={ariaLabel}
      className={cn("relative flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/5", className)}
    >
      {indicator && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-1 rounded-lg bg-white shadow-sm shadow-slate-900/5 transition-[left,width] duration-300 ease-out dark:bg-slate-800"
          style={{ left: indicator.left, width: indicator.width }}
        />
      )}
      {options.map((option) => (
        <button
          key={option.value}
          ref={(el) => {
            buttonRefs.current[option.value] = el;
          }}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "relative z-10 whitespace-nowrap rounded-lg font-medium transition-colors duration-200",
            size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm",
            value === option.value
              ? "text-brand-700 dark:text-brand-300"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Khung xương (skeleton) hiển thị trong lúc tải số liệu lần đầu, mô phỏng hình dạng các khối KPI và biểu đồ sắp hiện ra.
 */
function StatisticsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[0, 1].map((row) => (
        <div key={row} className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[102px] animate-pulse rounded-2xl border border-slate-200/90 bg-slate-100 dark:border-white/10 dark:bg-white/5"
            />
          ))}
        </div>
      ))}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-8">
        <div className="h-[280px] animate-pulse rounded-2xl border border-slate-200/90 bg-slate-100 dark:border-white/10 dark:bg-white/5 xl:col-span-5" />
        <div className="h-[280px] animate-pulse rounded-2xl border border-slate-200/90 bg-slate-100 dark:border-white/10 dark:bg-white/5 xl:col-span-3" />
      </div>
      <div className="h-[300px] animate-pulse rounded-2xl border border-slate-200/90 bg-slate-100 dark:border-white/10 dark:bg-white/5" />
    </div>
  );
}

/**
 * Trạng thái hiển thị khi không tải được số liệu (khác với `shared/ui/EmptyState` dùng cho danh sách rỗng — ở đây là lỗi tải dữ liệu).
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white py-14 text-center dark:border-white/10 dark:bg-slate-900">
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Không tải được dữ liệu</p>
      <p className="text-xs text-slate-400 dark:text-slate-500">Vui lòng thử lại hoặc chọn khoảng thời gian khác.</p>
    </div>
  );
}
