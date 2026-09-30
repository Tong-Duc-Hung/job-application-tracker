"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Loader2, Search, Briefcase, CalendarClock, FileText, ArrowUpDown, Pencil, Trash2, Building2, ChevronRight, Check, NotebookPen } from "lucide-react";
import type { Note } from "@prisma/client";
import { Button } from "@/shared/ui/Button";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { useToast } from "@/shared/ui/Toast";
import { EmptyState } from "@/shared/ui/EmptyState";
import { StatusBadge, PriorityBadge, ResultBadge, TypeBadge } from "@/shared/ui/Badge";
import { cn } from "@/shared/utils/cn";

/** Một ghi chú kèm thông tin rút gọn của đơn ứng tuyển hoặc buổi phỏng vấn mà nó gắn vào. */
type NoteRow = Note & {
  application: { id: string; company: string; position: string } | null;
  interview: { id: string; title: string; application: { company: string; position: string } } | null;
};

/** Dữ liệu rút gọn của một đơn ứng tuyển, hiển thị trong danh sách chọn ở cột bên trái. */
type ApplicationRow = { id: string; company: string; position: string; status: Parameters<typeof StatusBadge>[0]["status"]; priority: Parameters<typeof PriorityBadge>[0]["priority"]; _count: { notes: number; interviews: number } };
/** Dữ liệu rút gọn của một buổi phỏng vấn, hiển thị trong danh sách chọn ở cột bên trái. */
type InterviewRow = { id: string; title: string; type: Parameters<typeof TypeBadge>[0]["type"]; result: Parameters<typeof ResultBadge>[0]["result"]; scheduledAt: string; application: { id: string; company: string; position: string }; _count: { notes: number } };
/** Hai chế độ xem của trang: ghi chú nhóm theo đơn ứng tuyển, hoặc theo buổi phỏng vấn. */
type NotesTab = "applications" | "interviews";

/**
 * Trang Ghi chú: một danh sách chọn (đơn ứng tuyển hoặc buổi phỏng vấn, tùy tab) ở bên trái, và ghi chú
 * của mục đang chọn ở bên phải. `?applicationId=` hoặc `?interviewId=` trên URL quyết định tab và mục
 * được chọn sẵn khi vào trang (đến từ nút "Thêm ghi chú" ở trang chi tiết đơn/phỏng vấn).
 * Bọc trong `<Suspense>` (ở `NotesPage` bên dưới) vì `useSearchParams()` yêu cầu điều đó trong
 * App Router của Next.js.
 */
function NotesPageContent() {
  const router = useRouter();
  const { push } = useToast();
  const searchParams = useSearchParams();
  const applicationId = searchParams.get("applicationId");
  const interviewId = searchParams.get("interviewId");
  const noteId = searchParams.get("noteId");
  const [tab, setTab] = useState<NotesTab>(interviewId ? "interviews" : "applications");
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [interviews, setInterviews] = useState<InterviewRow[]>([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(applicationId);
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(interviewId);
  const [items, setItems] = useState<NoteRow[]>([]);
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);

  const [deleting, setDeleting] = useState<Note | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /** Tải danh sách chọn ở cột bên trái (đơn ứng tuyển hoặc phỏng vấn, tùy tab), tối đa 100 bản ghi. */
  const fetchContext = useCallback(async () => {
    setIsLoading(true);
    const endpoint = tab === "applications" ? "/api/applications?pageSize=100&sortBy=createdAt&sortDir=desc" : "/api/interviews?pageSize=100&sortDir=asc";
    const res = await fetch(endpoint);
    if (res.ok) {
      const data = await res.json();
      if (tab === "applications") setApplications(data.items);
      else setInterviews(data.items);
    }
    setIsLoading(false);
  }, [tab]);

  /** Tải ghi chú của mục đang được chọn; trả về danh sách rỗng ngay nếu chưa chọn mục nào (không gọi API). */
  const fetchNotes = useCallback(async () => {
    const selectedId = tab === "applications" ? selectedApplicationId : selectedInterviewId;
    if (!selectedId) { setItems([]); return; }
    setIsLoadingNotes(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set(tab === "applications" ? "applicationId" : "interviewId", selectedId);
    params.set("sortDir", sortDir);
    params.set("pageSize", "100");

    const res = await fetch(`/api/notes?${params.toString()}`);
    if (res.ok) setItems((await res.json()).items);
    setIsLoadingNotes(false);
  }, [tab, selectedApplicationId, selectedInterviewId, search, sortDir]);

  // Tải lại danh sách chọn mỗi khi đổi tab.
  useEffect(() => {
    const timeout = setTimeout(fetchContext, 0);
    return () => clearTimeout(timeout);
  }, [fetchContext]);

  // Tự chọn mục đầu tiên khi danh sách chọn vừa tải xong hoặc khi mục đang chọn không còn trong danh sách (ví dụ sau khi đổi tab).
  useEffect(() => {
    if (isLoading) return;
    const list = tab === "applications" ? applications : interviews;
    const currentId = tab === "applications" ? selectedApplicationId : selectedInterviewId;
    if (!currentId || !list.some((item) => item.id === currentId)) {
      const nextId = list[0]?.id ?? null;
      if (tab === "applications") setSelectedApplicationId(nextId);
      else setSelectedInterviewId(nextId);
    }
  }, [tab, applications, interviews, selectedApplicationId, selectedInterviewId, isLoading]);

  // Tải lại ghi chú mỗi khi đổi mục đang chọn hoặc từ khóa tìm kiếm (debounce 300ms khi tìm kiếm).
  useEffect(() => {
    const timeout = setTimeout(fetchNotes, search ? 300 : 0);
    return () => clearTimeout(timeout);
  }, [fetchNotes, search]);

  useEffect(() => {
    if (!noteId || isLoadingNotes) return;
    document.getElementById(`note-${noteId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [items, isLoadingNotes, noteId]);

  /** Điều hướng tới trang sửa một ghi chú. */
  function openEditScreen(note: Note) {
    router.push(`/notes/${note.id}/edit`);
  }

  /** Xóa ghi chú đang chờ xác nhận, rồi tải lại danh sách ghi chú của mục đang chọn. */
  async function handleDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    const res = await fetch(`/api/notes/${deleting.id}`, { method: "DELETE" });
    setIsDeleting(false);
    if (!res.ok) {
      push("Không thể xóa ghi chú này.", "error");
      return;
    }
    setDeleting(null);
    push("Đã xóa ghi chú");
    fetchNotes();
  }

  const selectedApplication = applications.find((item) => item.id === selectedApplicationId) ?? null;
  const selectedInterview = interviews.find((item) => item.id === selectedInterviewId) ?? null;
  const selectedLabel = tab === "applications" ? selectedApplication?.company ?? "đơn ứng tuyển" : selectedInterview?.title ?? "buổi phỏng vấn";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Ghi chú</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ghi chú được sắp xếp theo đơn ứng tuyển hoặc buổi phỏng vấn
          </p>
        </div>
        <Button onClick={() => router.push(`/notes/new?${tab === "applications" ? `applicationId=${selectedApplicationId ?? ""}` : `interviewId=${selectedInterviewId ?? ""}`}`)} className="w-full sm:w-auto" disabled={!selectedApplicationId && !selectedInterviewId}>
          <Plus className="h-4 w-4" /> Thêm ghi chú
        </Button>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10">
        <TabButton active={tab === "applications"} onClick={() => setTab("applications")} icon={<Briefcase className="h-4 w-4" />}>Đơn ứng tuyển</TabButton>
        <TabButton active={tab === "interviews"} onClick={() => setTab("interviews")} icon={<CalendarClock className="h-4 w-4" />}>Phỏng vấn</TabButton>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm trong ghi chú đang chọn…" className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-white/10 dark:bg-white/5 dark:text-slate-100" /></div>
        <button onClick={() => setSortDir((value) => value === "desc" ? "asc" : "desc")} className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"><ArrowUpDown className="h-4 w-4" /> {sortDir === "desc" ? "Mới nhất" : "Cũ nhất"}</button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-14 text-sm text-slate-400 dark:border-white/10 dark:bg-slate-900 dark:text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải danh sách…
        </div>
      ) : (
        <div className="notes-link-layout flex min-w-0 min-h-[520px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/10 lg:h-[680px] lg:min-h-0 lg:flex-row">
          <ApplicationNotesPicker
            tab={tab}
            applications={applications}
            interviews={interviews}
            selectedApplicationId={selectedApplicationId}
            selectedInterviewId={selectedInterviewId}
            onSelectApplication={setSelectedApplicationId}
            onSelectInterview={setSelectedInterviewId}
          />
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-slate-50/60 p-4 dark:bg-slate-950/40 sm:p-6"><div className="mb-4 flex min-w-0 items-start justify-between gap-3 border-b border-slate-200/80 pb-4 dark:border-white/10"><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">{tab === "applications" ? "Ghi chú của đơn ứng tuyển" : "Ghi chú của lịch phỏng vấn"}</p><h2 className="mt-1 line-clamp-2 break-words text-lg font-semibold text-slate-900 dark:text-white">{selectedLabel}</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Các ghi chú theo thời gian</p></div><span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-sm font-medium tabular-nums text-slate-500 shadow-sm dark:bg-white/10 dark:text-slate-300">{items.length} ghi chú</span></div>{isLoadingNotes ? <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải ghi chú…</div> : items.length === 0 ? <EmptyState icon={<FileText className="h-9 w-9" />} title="Chưa có ghi chú" description={`Thêm ghi chú cho ${selectedLabel}.`} /> : <div className="grid min-w-0 gap-3">{items.map((note) => <NoteCard key={note.id} note={note} expanded={note.id === noteId} onEdit={openEditScreen} onDelete={setDeleting} />)}</div>}</div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Xóa ghi chú"
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

/**
 * Cột bên trái: danh sách đơn ứng tuyển hoặc buổi phỏng vấn (tùy `tab`) để chọn xem ghi chú, kèm số ghi chú của từng mục.
 */
function ApplicationNotesPicker({
  tab,
  applications,
  interviews,
  selectedApplicationId,
  selectedInterviewId,
  onSelectApplication,
  onSelectInterview,
}: {
  tab: NotesTab;
  applications: ApplicationRow[];
  interviews: InterviewRow[];
  selectedApplicationId: string | null;
  selectedInterviewId: string | null;
  onSelectApplication: (id: string) => void;
  onSelectInterview: (id: string) => void;
}) {
  const isApplicationTab = tab === "applications";
  const selectedId = isApplicationTab ? selectedApplicationId : selectedInterviewId;
  const count = isApplicationTab ? applications.length : interviews.length;

  return (
    <div className="flex w-full min-h-0 shrink-0 flex-col border-b border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-slate-950/30 lg:h-full lg:w-80 lg:border-b-0 lg:border-r">
      <div className="border-b border-slate-200 px-4 py-4 dark:border-white/10">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            {isApplicationTab ? "Đơn ứng tuyển" : "Lịch phỏng vấn"}
          </p>
          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500 shadow-sm dark:bg-white/10 dark:text-slate-300">
            {count}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Chọn một {isApplicationTab ? "đơn" : "buổi phỏng vấn"} để xem ghi chú
        </p>
      </div>

      {count === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={isApplicationTab ? <Briefcase className="h-8 w-8" /> : <CalendarClock className="h-8 w-8" />}
            title={isApplicationTab ? "Chưa có đơn ứng tuyển" : "Chưa có lịch phỏng vấn"}
            description="Thêm dữ liệu để bắt đầu ghi chú."
          />
        </div>
      ) : (
        <div className="min-h-0 max-h-64 overflow-y-auto p-2 lg:max-h-none lg:flex-1">
          {isApplicationTab
            ? applications.map((application) => (
                <button
                  key={application.id}
                  type="button"
                  onClick={() => onSelectApplication(application.id)}
                  aria-pressed={selectedId === application.id}
                  className={cn(
                    "group mb-1 flex w-full flex-col gap-2 rounded-xl border border-slate-200 border-l-2 bg-white px-3 py-3.5 text-left shadow-sm transition-all last:mb-0 dark:border-white/10 dark:bg-slate-900",
                    selectedId === application.id
                      ? "border-brand-300 border-l-4 border-l-brand-600 bg-brand-50/70 shadow-md ring-1 ring-brand-200/70 dark:border-brand-500/30 dark:border-l-brand-400 dark:bg-brand-500/10 dark:ring-brand-500/20"
                      : "border-l-slate-200 hover:border-brand-200 hover:bg-slate-50 dark:border-l-white/10 dark:hover:border-brand-500/30 dark:hover:bg-white/5",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border shadow-inner", selectedId === application.id ? "border-brand-200 bg-gradient-to-br from-brand-100 to-sky-100 text-brand-700 dark:border-brand-400/30 dark:from-brand-500/25 dark:to-sky-500/15 dark:text-brand-300" : "border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200/70 text-slate-500 dark:border-white/10 dark:from-white/10 dark:to-white/5 dark:text-slate-400")}>
                      <Building2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </span>
                    <span className={cn("min-w-0 flex-1 truncate text-sm font-semibold", selectedId === application.id ? "text-brand-700 dark:text-brand-300" : "text-slate-800 dark:text-slate-100")}>
                      {application.company}
                    </span>
                    {selectedId === application.id ? <Check className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" strokeWidth={2.5} /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" />}
                  </span>
                  <span className="ml-8 flex flex-col gap-2 border-l border-slate-200/80 pl-2 dark:border-white/10">
                    <span className="truncate text-xs text-slate-500 dark:text-slate-400">{application.position}</span>
                    <span className="flex items-center justify-between gap-2">
                      <StatusBadge status={application.status} />
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-500 dark:bg-white/10 dark:text-slate-300">
                        {application._count.notes} ghi chú
                      </span>
                    </span>
                  </span>
                </button>
              ))
            : interviews.map((interview) => (
                <button
                  key={interview.id}
                  type="button"
                  onClick={() => onSelectInterview(interview.id)}
                  aria-pressed={selectedId === interview.id}
                  className={cn(
                    "group mb-1 flex w-full flex-col gap-2 rounded-xl border border-slate-200 border-l-2 bg-white px-3 py-3.5 text-left shadow-sm transition-all last:mb-0 dark:border-white/10 dark:bg-slate-900",
                    selectedId === interview.id
                      ? "border-brand-300 border-l-4 border-l-brand-600 bg-brand-50/70 shadow-md ring-1 ring-brand-200/70 dark:border-brand-500/30 dark:border-l-brand-400 dark:bg-brand-500/10 dark:ring-brand-500/20"
                      : "border-l-slate-200 hover:border-brand-200 hover:bg-slate-50 dark:border-l-white/10 dark:hover:border-brand-500/30 dark:hover:bg-white/5",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border shadow-inner", selectedId === interview.id ? "border-brand-200 bg-gradient-to-br from-brand-100 to-sky-100 text-brand-700 dark:border-brand-400/30 dark:from-brand-500/25 dark:to-sky-500/15 dark:text-brand-300" : "border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200/70 text-slate-500 dark:border-white/10 dark:from-white/10 dark:to-white/5 dark:text-slate-400")}>
                      <CalendarClock className="h-3.5 w-3.5" />
                    </span>
                    <span className={cn("min-w-0 flex-1 truncate text-sm font-semibold", selectedId === interview.id ? "text-brand-700 dark:text-brand-300" : "text-slate-800 dark:text-slate-100")}>
                      {interview.title}
                    </span>
                    {selectedId === interview.id ? <Check className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" strokeWidth={2.5} /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" />}
                  </span>
                  <span className="ml-8 flex flex-col gap-2 border-l border-slate-200/80 pl-2 dark:border-white/10">
                    <span className="truncate text-xs text-slate-500 dark:text-slate-400">{interview.application.company} · {interview.application.position}</span>
                    <span className="flex items-center justify-between gap-2">
                      <ResultBadge result={interview.result} />
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-500 dark:bg-white/10 dark:text-slate-300">
                        {interview._count.notes} ghi chú
                      </span>
                    </span>
                  </span>
                </button>
              ))}
        </div>
      )}
    </div>
  );
}

/** Thẻ hiển thị một ghi chú trong danh sách: tiêu đề, nội dung rút gọn và các nút thao tác nhanh. */
function NoteCard({ note, expanded = false, onEdit, onDelete }: { note: NoteRow; expanded?: boolean; onEdit: (note: Note) => void; onDelete: (note: Note) => void }) {
  return (
    <article id={`note-${note.id}`} className={cn("group flex min-w-0 w-full items-start gap-3 overflow-hidden rounded-xl border border-l-4 border-slate-200/70 border-l-brand-500 bg-white p-3 shadow-sm shadow-slate-200/20 transition-all hover:border-slate-300 hover:border-l-brand-600 hover:shadow-md dark:border-white/[0.08] dark:border-l-brand-400 dark:bg-slate-900 dark:shadow-black/10 dark:hover:border-white/15 dark:hover:border-l-brand-300 sm:gap-4 sm:p-3.5", expanded && "border-brand-300 bg-brand-50/50 ring-1 ring-brand-200 dark:border-brand-500/40 dark:bg-brand-500/5 dark:ring-brand-500/20")}>
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <NotebookPen className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
        <div className="min-w-0 max-w-full overflow-hidden">
          <h3 className="truncate break-words text-sm font-semibold text-slate-900 transition-colors group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-300">
            {note.title}
          </h3>
          <p className={cn("mt-1.5 break-words text-sm leading-5 text-slate-600 dark:text-slate-300", expanded ? "whitespace-pre-wrap [overflow-wrap:anywhere]" : "line-clamp-2")}>
            {note.content}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 self-center gap-0.5">
        <button onClick={() => onEdit(note)} type="button" aria-label="Sửa" title="Sửa" className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"><Pencil className="h-4 w-4" /></button>
        <button onClick={() => onDelete(note)} type="button" aria-label="Xóa" title="Xóa" className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
      </div>
    </article>
  );
}

/** Nút chuyển tab dạng gạch chân, dùng cho hai chế độ xem Đơn ứng tuyển/Phỏng vấn. */
function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return <button onClick={onClick} className={cn("flex items-center gap-1.5 border-b-2 px-1 pb-2.5 text-sm font-medium transition-colors", active ? "border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200")}>{icon}{children}</button>;
}

/**
 * Điểm vào của route `/notes`; chỉ bọc `NotesPageContent` trong `<Suspense>` để dùng được `useSearchParams()`.
 */
export default function NotesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center gap-2 py-14 text-sm text-slate-400 dark:text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
        </div>
      }
    >
      <NotesPageContent />
    </Suspense>
  );
}
