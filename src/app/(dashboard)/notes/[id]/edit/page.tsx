"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, NotebookPen, PenLine } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import type { Note } from "@prisma/client";
import { NoteForm } from "@/features/notes/components/NoteForm";
import type { NoteFormInput } from "@/features/notes/note.schema";
import { Button } from "@/shared/ui/Button";
import { useToast } from "@/shared/ui/Toast";

/**
 * Một ghi chú kèm thông tin rút gọn của đơn ứng tuyển hoặc buổi phỏng vấn mà nó gắn vào (chỉ một trong hai khác `null`).
 */
type NoteWithLinks = Note & {
  application: { id: string; company: string; position: string } | null;
  interview: {
    id: string;
    title: string;
    scheduledAt: string | Date;
    application: { id: string; company: string; position: string };
  } | null;
};

/** Trang sửa một ghi chú. Tự gọi API để tải ghi chú cần sửa (cần thiết vì `NoteForm` chạy ở client). */
export default function EditNotePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { push } = useToast();
  const [note, setNote] = useState<NoteWithLinks | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "not-found" | "error" | "ready">("loading");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!params.id) {
      setLoadState("not-found");
      return;
    }
    const controller = new AbortController();
    setLoadState("loading");
    setNote(null);

    fetch(`/api/notes/${params.id}`, { signal: controller.signal })
      .then(async (res) => {
        if (res.status === 404) {
          setLoadState("not-found");
          return undefined;
        }
        if (!res.ok) throw new Error("Request failed");
        return res.json();
      })
      .then((data) => {
        if (data === undefined) return;
        if (!data.note) {
          setLoadState("not-found");
          return;
        }
        setNote(data.note);
        setLoadState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setLoadState("error");
      });

    return () => controller.abort();
  }, [params.id, retryKey]);

  /** Gửi `PUT /api/notes/:id`; thành công thì quay lại danh sách ghi chú. */
  async function handleSubmit(values: NoteFormInput) {
    const res = await fetch(`/api/notes/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      push("Không thể cập nhật ghi chú này.", "error");
      return;
    }

    push("Đã cập nhật ghi chú");
    router.push("/notes");
  }

  if (loadState !== "ready" || !note) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-4 rounded-2xl border border-amber-200 bg-white p-10 text-center text-sm text-slate-600 shadow-sm dark:border-amber-500/20 dark:bg-slate-900 dark:text-slate-300" aria-live="polite">
        {loadState === "loading" && "Đang tải ghi chú..."}
        {loadState === "not-found" && <p role="status">Không tìm thấy ghi chú này.</p>}
        {loadState === "error" && <p role="alert">Không thể tải ghi chú. Vui lòng thử lại.</p>}
        {loadState === "error" && <Button variant="outline" onClick={() => setRetryKey((key) => key + 1)}>Thử tải lại</Button>}
        {loadState !== "loading" && (
          <Button variant="outline" onClick={() => router.push("/notes")}>
            <ArrowLeft className="h-4 w-4" /> Quay lại ghi chú
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <Button variant="ghost" onClick={() => router.push("/notes")} className="-ml-2 w-fit px-2">
        <ArrowLeft className="h-4 w-4" /> Quay lại ghi chú
      </Button>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,2.18fr)]">
        <aside className="min-w-0 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-slate-800 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-slate-200">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              <NotebookPen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300">Ghi nhớ</p>
              <h1 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">Notebook</h1>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border border-amber-200 bg-white p-3 shadow-sm dark:border-amber-500/20 dark:bg-slate-800/80">
              <p className="text-[10px] uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">Tiêu đề</p>
              <p title={note.title} className="mt-2 truncate text-lg font-semibold text-slate-900 dark:text-white">{note.title}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-white p-3 shadow-sm dark:border-amber-500/20 dark:bg-slate-800/80">
              <p className="text-[10px] uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">Trạng thái</p>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">Ghi lại câu hỏi, suy nghĩ và kiến thức cần nhớ cho lần sau.</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-white p-3 shadow-sm dark:border-amber-500/20 dark:bg-slate-800/80">
              <p className="text-[10px] uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">Dùng để</p>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">Lưu ý, checklist, câu hỏi, và phản hồi nhanh.</p>
            </div>
          </div>
        </aside>

        <div className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-col gap-5 border-b border-slate-200 p-6 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">Nội dung</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Chỉnh sửa ghi chú</h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              <PenLine className="h-3.5 w-3.5" />
              Note editor
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <NoteForm
              initialData={note}
              lockedApplication={note.application ?? undefined}
              lockedInterview={note.interview ?? undefined}
              onSubmit={handleSubmit}
              onCancel={() => router.push("/notes")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
