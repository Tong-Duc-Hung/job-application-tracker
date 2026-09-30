"use client";

import { BriefcaseBusiness, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { ApplicationForm } from "@/features/applications/components/ApplicationForm";
import type { ApplicationFormInput } from "@/features/applications/application.schema";
import { useToast } from "@/shared/ui/Toast";

/** Trang tạo mới một đơn ứng tuyển; gửi `POST /api/applications` rồi quay lại danh sách khi thành công. */
export default function NewApplicationPage() {
  const router = useRouter();
  const { push } = useToast();

  /** Gửi dữ liệu form tạo đơn ứng tuyển lên server. */
  async function handleSubmit(values: ApplicationFormInput) {
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      push("Không thể tạo đơn ứng tuyển này. Vui lòng kiểm tra lại form.", "error");
      return;
    }

    push("Đã tạo đơn ứng tuyển");
    router.push("/applications");
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <nav className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
        <button onClick={() => router.push("/applications")} className="transition-colors hover:text-slate-900 dark:hover:text-white">
          Đơn ứng tuyển
        </button>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="font-medium text-slate-900 dark:text-white">Thêm mới</span>
      </nav>

      <header className="relative overflow-hidden rounded-xl border border-slate-200 border-l-4 border-l-brand-500 bg-white px-5 py-4 shadow-sm dark:border-white/10 dark:border-l-brand-400 dark:bg-slate-900 sm:px-6 sm:py-4">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_68%)]" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:ring-brand-500/20">
            <BriefcaseBusiness className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">Cơ hội mới</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-2xl">Thêm đơn ứng tuyển</h1>
            <p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-slate-400">Lưu thông tin công việc để theo dõi trạng thái, thời hạn và các bước tiếp theo.</p>
          </div>
        </div>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/20 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/10 sm:p-5">
        <div className="mb-4 flex items-end justify-between gap-4 border-b border-slate-200 pb-3 dark:border-white/10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Thông tin hồ sơ</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">Chi tiết cơ hội việc làm</h2>
          </div>
          <span className="text-right text-xs text-slate-400 dark:text-slate-500">Các trường có dấu <span className="font-semibold text-red-500">*</span> là bắt buộc</span>
        </div>
        <ApplicationForm layout="create" onSubmit={handleSubmit} onCancel={() => router.push("/applications")} />
      </section>
    </div>
  );
}
