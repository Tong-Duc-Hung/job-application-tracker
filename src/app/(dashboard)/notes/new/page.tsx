"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, NotebookPen } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { NoteForm } from "@/features/notes/components/NoteForm";
import type { NoteFormInput } from "@/features/notes/note.schema";
import { Button } from "@/shared/ui/Button";
import { useToast } from "@/shared/ui/Toast";

/** Dữ liệu rút gọn của đơn ứng tuyển được khóa sẵn (khi tạo ghi chú từ trang chi tiết đơn). */
type ApplicationOption = { id: string; company: string; position: string };
/** Dữ liệu rút gọn của buổi phỏng vấn được khóa sẵn (khi tạo ghi chú từ trang chi tiết phỏng vấn). */
type InterviewOption = {
  id: string;
  title: string;
  scheduledAt: string;
  application: ApplicationOption;
};

/**
 * Trang tạo mới một ghi chú.
 * `?applicationId=` hoặc `?interviewId=` trên URL (đến từ nút "Thêm ghi chú" ở trang chi tiết đơn/phỏng vấn)
 * khóa sẵn đối tượng liên kết tương ứng: trang tự tải thông tin rồi truyền xuống `NoteForm`.
 * Không truyền tham số nào thì `NoteForm` cho phép chọn tự do (mặc định chế độ "đơn ứng tuyển").
 */
export default function NewNotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { push } = useToast();
  const applicationId = searchParams.get("applicationId");
  const interviewId = searchParams.get("interviewId");
  const [application, setApplication] = useState<ApplicationOption>();
  const [interview, setInterview] = useState<InterviewOption>();

  useEffect(() => {
    const id = applicationId ?? interviewId;
    if (!id) return;
    const endpoint = applicationId ? `/api/applications/${id}` : `/api/interviews/${id}`;
    fetch(endpoint)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (applicationId) setApplication(data?.application);
        else setInterview(data?.interview);
      })
      .catch(() => undefined);
  }, [applicationId, interviewId]);

  /** Gửi dữ liệu form tạo ghi chú lên server. */
  async function handleSubmit(values: NoteFormInput) {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      push("Không thể lưu ghi chú này. Vui lòng kiểm tra lại form.", "error");
      return;
    }
    push("Đã lưu ghi chú");
    router.push("/notes");
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <Button variant="ghost" onClick={() => router.push("/notes")} className="-ml-2 w-fit px-2">
        <ArrowLeft className="h-4 w-4" /> Quay lại Ghi chú
      </Button>
      <div className="relative overflow-hidden rounded-xl border border-slate-200 border-l-4 border-l-amber-500 bg-white px-5 py-4 shadow-sm dark:border-white/10 dark:border-l-amber-400 dark:bg-slate-900 sm:px-6">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_68%)]" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20">
            <NotebookPen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Không gian ghi nhớ</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Thêm ghi chú</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Lưu lại thông tin cần nhớ cho quá trình ứng tuyển.</p>
          </div>
        </div>
      </div>
      <div className="w-full">
        <NoteForm
          lockedApplication={application}
          lockedInterview={interview}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/notes")}
        />
      </div>
    </div>
  );
}
