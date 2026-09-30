"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CalendarClock, Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import type { Interview } from "@prisma/client";
import { InterviewForm } from "@/features/interviews/components/InterviewForm";
import type { InterviewFormInput } from "@/features/interviews/interview.schema";
import { Button } from "@/shared/ui/Button";
import { useToast } from "@/shared/ui/Toast";

/** Một buổi phỏng vấn kèm thông tin rút gọn của đơn ứng tuyển liên quan. */
type InterviewWithApplication = Interview & {
  application: { id: string; company: string; position: string };
};

/**
 * Trang sửa một buổi phỏng vấn. Tương tự trang sửa đơn ứng tuyển, đây là Client Component tự gọi API
 * (cần thiết vì `InterviewForm` chạy ở client) thay vì Server Component như trang chi tiết.
 * Đơn ứng tuyển liên kết luôn bị khóa (`lockedApplication`) khi sửa — người dùng không đổi được đơn
 * ứng tuyển của một buổi phỏng vấn đã tạo qua giao diện này.
 */
export default function EditInterviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { push } = useToast();
  const [interview, setInterview] = useState<InterviewWithApplication | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "not-found" | "error" | "ready">("loading");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!params.id) {
      setLoadState("not-found");
      return;
    }

    const controller = new AbortController();
    setLoadState("loading");
    setInterview(null);
    fetch(`/api/interviews/${params.id}`, { signal: controller.signal })
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
        if (!data.interview) {
          setLoadState("not-found");
          return;
        }
        setInterview(data.interview);
        setLoadState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setLoadState("error");
      });

    return () => controller.abort();
  }, [params.id, retryKey]);

  /** Gửi `PUT /api/interviews/:id`; thành công thì quay lại danh sách phỏng vấn. */
  async function handleSubmit(values: InterviewFormInput) {
    const res = await fetch(`/api/interviews/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      push("Không thể cập nhật lịch phỏng vấn này.", "error");
      return;
    }

    push("Đã cập nhật lịch phỏng vấn");
    router.push("/interviews");
  }

  if (loadState !== "ready" || !interview) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white py-16 text-sm text-slate-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-400" aria-live="polite">
        {loadState === "loading" && <><Loader2 className="h-4 w-4 animate-spin" /> Đang tải thông tin lịch phỏng vấn…</>}
        {loadState === "not-found" && <p role="status">Không tìm thấy lịch phỏng vấn này.</p>}
        {loadState === "error" && <p role="alert">Không thể tải lịch phỏng vấn. Vui lòng thử lại.</p>}
        {loadState === "error" && <Button variant="outline" onClick={() => setRetryKey((key) => key + 1)}>Thử tải lại</Button>}
        {loadState !== "loading" && <Button variant="outline" onClick={() => router.push("/interviews")}>Quay lại danh sách phỏng vấn</Button>}
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <Button variant="ghost" onClick={() => router.push(`/interviews/${interview.id}`)} className="-ml-2 w-fit rounded-full px-2">
        <ArrowLeft className="h-4 w-4" /> Quay lại chi tiết
      </Button>

      <div className="flex items-start gap-4 border-b border-slate-200 pb-6 dark:border-white/10">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 shadow-sm dark:bg-violet-500/10 dark:text-violet-400">
          <CalendarClock className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-violet-600 dark:text-violet-400">Lịch trình</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Sửa vòng phỏng vấn</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Đang chỉnh sửa <span className="font-medium text-slate-700 dark:text-slate-300">{interview.title}</span> —{" "}
            {interview.application.company}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="p-4 sm:p-6">
          <InterviewForm
            initialData={interview}
            lockedApplication={interview.application}
            onSubmit={handleSubmit}
            onCancel={() => router.push(`/interviews/${interview.id}`)}
          />
        </div>
      </div>
    </div>
  );
}
