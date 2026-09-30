"use client";

import { useEffect, useState } from "react";
import { CalendarClock, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { InterviewForm } from "@/features/interviews/components/InterviewForm";
import type { InterviewFormInput } from "@/features/interviews/interview.schema";
import { useToast } from "@/shared/ui/Toast";

/** Dữ liệu rút gọn của đơn ứng tuyển được khóa sẵn (khi tạo phỏng vấn từ trang chi tiết đơn). */
type ApplicationOption = { id: string; company: string; position: string };

/**
 * Trang tạo mới một buổi phỏng vấn.
 * `?applicationId=` trên URL (đến từ nút "Thêm vòng" ở trang chi tiết đơn) khóa sẵn đơn ứng tuyển:
 * trang tự tải thông tin đơn đó rồi truyền xuống `InterviewForm` qua `lockedApplication`.
 */
export default function NewInterviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { push } = useToast();
  const applicationId = searchParams.get("applicationId");
  const [application, setApplication] = useState<ApplicationOption>();
  const [loadingApplication, setLoadingApplication] = useState(Boolean(applicationId));

  useEffect(() => {
    if (!applicationId) return;
    setLoadingApplication(true);
    fetch(`/api/applications/${applicationId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setApplication(data?.application))
      .catch(() => undefined)
      .finally(() => setLoadingApplication(false));
  }, [applicationId]);

  /** Gửi dữ liệu form tạo phỏng vấn lên server. */
  async function handleSubmit(values: InterviewFormInput) {
    const res = await fetch("/api/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      push("Không thể tạo lịch phỏng vấn này. Vui lòng kiểm tra lại form.", "error");
      return;
    }
    push("Đã tạo lịch phỏng vấn");
    router.push("/interviews");
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <nav className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
        <button onClick={() => router.push("/interviews")} className="transition-colors hover:text-slate-900 dark:hover:text-white">Phỏng vấn</button>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="font-medium text-slate-900 dark:text-white">Thêm mới</span>
      </nav>

      <header className="relative overflow-hidden rounded-xl border border-slate-200 border-l-4 border-l-violet-500 bg-white px-5 py-4 shadow-sm dark:border-white/10 dark:border-l-violet-400 dark:bg-slate-900 sm:px-6">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_68%)]" />
        <div className="relative flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/20">
            <CalendarClock className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-400">Lịch phỏng vấn</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-2xl">Thêm lịch phỏng vấn</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {applicationId && loadingApplication ? "Đang tải thông tin đơn ứng tuyển…" : "Ghi lại thời gian và thông tin cho vòng phỏng vấn."}
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/20 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/10 sm:p-5">
        <InterviewForm
          lockedApplication={application}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/interviews")}
        />
      </section>
    </div>
  );
}