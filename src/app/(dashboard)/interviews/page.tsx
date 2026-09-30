"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  List as ListIcon,
  Calendar as CalendarIcon,
  Loader2,
  CalendarClock,
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  Check,
} from "lucide-react";
import { startOfMonth, endOfMonth } from "date-fns";
import type { ApplicationStatus, Interview } from "@prisma/client";
import { Button } from "@/shared/ui/Button";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { EmptyState } from "@/shared/ui/EmptyState";
import { useToast } from "@/shared/ui/Toast";
import { cn } from "@/shared/utils/cn";
import { InterviewCalendar } from "@/features/interviews/components/InterviewCalendar";
import { InterviewCard } from "@/features/interviews/components/InterviewCard";
import { InterviewFilter, type InterviewFilterValue } from "@/features/interviews/components/InterviewFilter";
import { StatusBadge } from "@/shared/ui/Badge";

/** Một buổi phỏng vấn kèm thông tin rút gọn (gồm cả trạng thái) của đơn ứng tuyển liên quan. */
type InterviewRow = Interview & {
  application: { id: string; company: string; position: string; status: ApplicationStatus };
};
type ApplicationOption = { id: string; company: string; position: string; status: ApplicationStatus };

/** Hai chế độ xem của trang: danh sách theo đơn ứng tuyển, hoặc lịch theo tháng. */
type Tab = "list" | "calendar";

/** Trạng thái bộ lọc mặc định của chế độ Danh sách. */
const DEFAULT_FILTER: InterviewFilterValue = { search: "", type: "", result: "", applicationId: "", sortDir: "asc" };

/**
 * Trang Phỏng vấn với hai chế độ xem: "Danh sách" (nhóm theo đơn ứng tuyển, có bộ lọc và tìm kiếm)
 * và "Lịch" (xem theo tháng). Mỗi chế độ tự tải dữ liệu theo cách phù hợp: danh sách áp dụng bộ lọc
 * và giới hạn 100 bản ghi, lịch tải theo khoảng thời gian của tháng đang xem và giới hạn 200 bản ghi.
 * Bọc trong `<Suspense>` (ở `InterviewsPage` bên dưới) vì `useSearchParams()` yêu cầu điều đó trong
 * App Router của Next.js.
 */
function InterviewsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>("list");
  const [items, setItems] = useState<InterviewRow[]>([]);
  // Deep link từ trang chi tiết đơn: /interviews?applicationId=<id> mở sẵn bộ lọc theo đơn đó.
  const [filter, setFilter] = useState<InterviewFilterValue>(() => ({
    ...DEFAULT_FILTER,
    applicationId: searchParams.get("applicationId") ?? "",
  }));
  const [total, setTotal] = useState(0);
  // Danh sách đơn cho bộ lọc phải độc lập với `items` đang hiển thị, nếu không sau khi
  // chọn một đơn thì dropdown chỉ còn đúng đơn đó.
  const [allApplications, setAllApplications] = useState<ApplicationOption[]>([]);
  const [isLoadingApplications, setIsLoadingApplications] = useState(true);
  const [month, setMonth] = useState(() => new Date());
  const [isLoading, setIsLoading] = useState(true);

  const [deleting, setDeleting] = useState<Interview | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(
    () => searchParams.get("applicationId")
  );

  // Keep shareable filters in the URL, matching the deep-link behavior of the Applications page.
  useEffect(() => {
    const params = new URLSearchParams();
    if (filter.search) params.set("search", filter.search);
    if (filter.type) params.set("type", filter.type);
    if (filter.result) params.set("result", filter.result);
    if (filter.applicationId) params.set("applicationId", filter.applicationId);
    const query = params.toString();
    router.replace(query ? `/interviews?${query}` : "/interviews", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.search, filter.type, filter.result, filter.applicationId]);

  /** Gọi `GET /api/interviews` với bộ lọc và cách sắp xếp hiện tại (chế độ Danh sách), tối đa 100 bản ghi. */
  const fetchList = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.search) params.set("search", filter.search);
      if (filter.type) params.set("type", filter.type);
      if (filter.result) params.set("result", filter.result);
      if (filter.applicationId) params.set("applicationId", filter.applicationId);
      params.set("sortDir", filter.sortDir);
      params.set("pageSize", "100");
      const res = await fetch(`/api/interviews?${params.toString()}`);
      if (!res.ok) throw new Error("Could not load interviews");
      const data = await res.json();
      setItems(data.items);
      setTotal(typeof data.total === "number" ? data.total : data.items.length);
    } catch {
      push("Không thể tải danh sách lịch phỏng vấn.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [filter, push]);

  /** Gọi `GET /api/interviews` với khoảng thời gian của tháng đang xem (chế độ Lịch), tối đa 200 bản ghi. */
  const fetchCalendar = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("from", startOfMonth(month).toISOString());
      params.set("to", endOfMonth(month).toISOString());
      params.set("sortDir", "asc");
      params.set("pageSize", "200");
      const res = await fetch(`/api/interviews?${params.toString()}`);
      if (!res.ok) throw new Error("Could not load calendar");
      const data = await res.json();
      setItems(data.items);
      setTotal(typeof data.total === "number" ? data.total : data.items.length);
    } catch {
      push("Không thể tải lịch phỏng vấn.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [month, push]);

  // Tải lại dữ liệu mỗi khi đổi tab, đổi bộ lọc (debounce 300ms khi tìm kiếm) hoặc đổi tháng.
  useEffect(() => {
    if (tab === "list") {
      const timeout = setTimeout(fetchList, filter.search ? 300 : 0);
      return () => clearTimeout(timeout);
    }
    const timeout = setTimeout(fetchCalendar, 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, fetchList, fetchCalendar]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/applications?pageSize=100&sortBy=createdAt&sortDir=desc");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setAllApplications(
          data.items.map((a: ApplicationOption) => ({
            id: a.id,
            company: a.company,
            position: a.position,
            status: a.status,
          }))
        );
      } catch {
        // Không tải được thì bộ lọc dùng tạm các đơn có trong danh sách đang hiển thị.
      } finally {
        if (!cancelled) setIsLoadingApplications(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (filter.applicationId) setSelectedApplicationId(filter.applicationId);
  }, [filter.applicationId]);

  // `scheduledAt` đi qua JSON nên là chuỗi ISO chứ không phải Date; so sánh trực tiếp
  // chuỗi với Date luôn cho kết quả false.
  const now = new Date();
  const upcomingCount = items.filter(
    (interview) => interview.result === "PENDING" && new Date(interview.scheduledAt) > now
  ).length;
  // Giữ mọi đơn ứng tuyển trong cột bên trái; chỉ các lịch khớp bộ lọc được gắn vào từng đơn.
  const interviewsByApplication = new Map<string, InterviewRow[]>();
  for (const interview of items) {
    const applicationInterviews = interviewsByApplication.get(interview.application.id) ?? [];
    applicationInterviews.push(interview);
    interviewsByApplication.set(interview.application.id, applicationInterviews);
  }
  const applications = allApplications.map((application) => ({
    ...application,
    interviews: interviewsByApplication.get(application.id) ?? [],
  }));

  // Tự chọn đơn ứng tuyển đầu tiên khi danh sách vừa tải xong hoặc khi đơn đang chọn không còn trong danh sách (ví dụ sau khi đổi bộ lọc).
  useEffect(() => {
    if (tab !== "list" || isLoading || isLoadingApplications) return;
    if (selectedApplicationId && applications.some((application) => application.id === selectedApplicationId)) return;
    setSelectedApplicationId(applications[0]?.id ?? null);
  }, [applications, isLoading, isLoadingApplications, selectedApplicationId, tab]);

  /** Điều hướng tới trang tạo phỏng vấn mới. */
  function openCreateScreen() {
    router.push("/interviews/new");
  }

  /** Điều hướng tới trang sửa một buổi phỏng vấn. */
  function openEditScreen(interview: Interview) {
    router.push(`/interviews/${interview.id}/edit`);
  }


  /**
   * Xóa buổi phỏng vấn đang chờ xác nhận, rồi tải lại dữ liệu theo đúng chế độ xem hiện tại (danh sách hoặc lịch).
   */
  async function handleDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    const res = await fetch(`/api/interviews/${deleting.id}`, { method: "DELETE" });
    setIsDeleting(false);
    if (!res.ok) {
      push("Không thể xóa lịch phỏng vấn này.", "error");
      return;
    }
    setDeleting(null);
    push("Đã xóa lịch phỏng vấn");
    if (tab === "list") fetchList();
    else fetchCalendar();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Phỏng vấn</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{total} lịch đang theo dõi</p>
        </div>
        <Button onClick={openCreateScreen} className="w-full sm:w-auto" disabled={allApplications.length === 0}>
          <Plus className="h-4 w-4" /> Thêm lịch phỏng vấn
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 dark:border-white/10">
        <div className="inline-flex items-center gap-1">
          <TabButton active={tab === "list"} onClick={() => setTab("list")} icon={<ListIcon className="h-3.5 w-3.5" />}>
            Danh sách
          </TabButton>
          <TabButton
            active={tab === "calendar"}
            onClick={() => setTab("calendar")}
            icon={<CalendarIcon className="h-3.5 w-3.5" />}
          >
            Lịch
          </TabButton>
        </div>
        <div className="mb-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 sm:mb-0">
          <span>{items.length} lịch hiển thị</span>
          <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
          <span>{upcomingCount} sắp tới</span>
        </div>
      </div>

      {tab === "list" && (
        <InterviewFilter
          value={filter}
          onChange={setFilter}
          applicationOptions={
            allApplications.length > 0
              ? allApplications.map((application) => ({
                  value: application.id,
                  label: `${application.company} — ${application.position}`,
                }))
              : Array.from(
                  new Map(items.map((item) => [item.application.id, `${item.application.company} — ${item.application.position}`])).entries()
                ).map(([value, label]) => ({ value, label }))
          }
        />
      )}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-14 text-sm text-slate-400 dark:border-white/10 dark:bg-slate-900 dark:text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải lịch phỏng vấn…
        </div>
      ) : tab === "list" ? (
        <div className="flex h-[680px] min-h-0 w-full max-w-7xl flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm shadow-slate-200/20 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/10 lg:flex-row">
          <div className="flex h-64 min-h-0 w-full shrink-0 flex-col border-b border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-slate-950/30 lg:h-auto lg:w-80 lg:border-b-0 lg:border-r">
            <div className="border-b border-slate-200 px-4 py-4 dark:border-white/10">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Đơn ứng tuyển</p>
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500 shadow-sm dark:bg-white/10 dark:text-slate-300">{applications.length}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Chọn một đơn để xem các vòng phỏng vấn</p>
            </div>
            {applications.length === 0 ? (
              <div className="p-4"><EmptyState icon={<BriefcaseBusiness className="h-8 w-8" />} title="Chưa có đơn ứng tuyển" description="Thêm đơn ứng tuyển trước để bắt đầu theo dõi lịch phỏng vấn." /></div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {applications.map((application) => (
                  <button key={application.id} onClick={() => setSelectedApplicationId(application.id)} aria-pressed={selectedApplicationId === application.id} className={cn("group mb-1 flex w-full flex-col gap-2 rounded-xl border border-slate-200 border-l-2 bg-white px-3 py-3.5 text-left shadow-sm transition-all last:mb-0 dark:border-white/10 dark:bg-slate-900", selectedApplicationId === application.id ? "border-brand-300 border-l-4 border-l-brand-600 bg-brand-50/70 shadow-md ring-1 ring-brand-200/70 dark:border-brand-500/30 dark:border-l-brand-400 dark:bg-brand-500/10 dark:ring-brand-500/20" : "border-l-slate-200 hover:border-brand-200 hover:bg-slate-50 dark:border-l-white/10 dark:hover:border-brand-500/30 dark:hover:bg-white/5")}>
                    <span className="flex items-center gap-2">
                      <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border shadow-inner", selectedApplicationId === application.id ? "border-brand-200 bg-gradient-to-br from-brand-100 to-sky-100 text-brand-700 dark:border-brand-400/30 dark:from-brand-500/25 dark:to-sky-500/15 dark:text-brand-300" : "border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200/70 text-slate-500 dark:border-white/10 dark:from-white/10 dark:to-white/5 dark:text-slate-400")}><Building2 className="h-3.5 w-3.5" strokeWidth={1.8} /></span>
                      <span className={cn("min-w-0 flex-1 truncate text-sm font-semibold", selectedApplicationId === application.id ? "text-brand-700 dark:text-brand-300" : "text-slate-800 dark:text-slate-100")}>{application.company}</span>
                      {selectedApplicationId === application.id ? <Check className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" strokeWidth={2.5} /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" />}
                    </span>
                    <span className="ml-8 flex flex-col gap-2 border-l border-slate-200/80 pl-2 dark:border-white/10">
                      <span className="truncate text-xs text-slate-500 dark:text-slate-400">{application.position}</span>
                      <span className="flex items-center justify-between gap-2">
                        <StatusBadge status={application.status} />
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-500 dark:bg-white/10 dark:text-slate-300">
                          {application.interviews.length} vòng
                        </span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-slate-50/60 dark:bg-slate-950/40">
            {applications.find((application) => application.id === selectedApplicationId) ? (
              <div className="p-4 sm:p-5">
                <div className="mb-4 border-b border-slate-200/80 pb-4 dark:border-white/10">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">Lộ trình phỏng vấn</p>
                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-sm font-medium tabular-nums text-slate-500 shadow-sm dark:bg-white/10 dark:text-slate-300">
                    {applications.find((application) => application.id === selectedApplicationId)!.interviews.length} vòng phỏng vấn
                  </span>
                  </div>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{applications.find((application) => application.id === selectedApplicationId)!.company}</h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Các vòng tuyển dụng theo thời gian</p>
                </div>
                {applications.find((application) => application.id === selectedApplicationId)!.interviews.length > 0 ? (
                  <div className="grid w-full gap-4">
                    {applications.find((application) => application.id === selectedApplicationId)!.interviews.map((interview) => (
                      <InterviewCard key={interview.id} interview={interview} onEdit={openEditScreen} onDelete={setDeleting} />
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-[260px] items-center justify-center p-6">
                    <EmptyState
                      icon={<CalendarClock className="h-8 w-8" />}
                      title="Không có lịch phỏng vấn phù hợp"
                      description="Không có lịch nào khớp với bộ lọc hiện tại. Đơn ứng tuyển vẫn được giữ trong danh sách."
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex min-h-[260px] items-center justify-center p-6"><EmptyState icon={<BriefcaseBusiness className="h-8 w-8" />} title="Chọn một đơn ứng tuyển" description="Chọn một đơn ở bên trái để xem các vòng phỏng vấn liên kết." /></div>
            )}
          </div>
        </div>
      ) : (
        <InterviewCalendar month={month} onMonthChange={setMonth} interviews={items} />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Xóa lịch phỏng vấn"
        description={
          <>
            Bạn có chắc muốn xóa "
            <span title={deleting?.title ?? ""} className="inline-block max-w-full truncate align-bottom">
              {deleting?.title ?? ""}
            </span>
            "?
          </>
        }
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

/** Nút chuyển tab dạng gạch chân, dùng cho hai chế độ xem Danh sách/Lịch. */
function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      role="tab"
      aria-selected={active}
      className={cn(
        "flex items-center gap-1.5 border-b-2 px-3 pb-2.5 pt-2 text-sm font-medium transition-colors",
        active
          ? "border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-400"
          : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/**
 * Điểm vào của route `/interviews`; chỉ bọc `InterviewsPageContent` trong `<Suspense>` để dùng được `useSearchParams()`.
 */
export default function InterviewsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center gap-2 py-14 text-sm text-slate-400 dark:text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
        </div>
      }
    >
      <InterviewsPageContent />
    </Suspense>
  );
}
