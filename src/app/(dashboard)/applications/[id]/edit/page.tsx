"use client";

import { useEffect, useState } from "react";
import { BriefcaseBusiness, ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import type { Application } from "@prisma/client";
import { ApplicationForm } from "@/features/applications/components/ApplicationForm";
import type { ApplicationFormInput } from "@/features/applications/application.schema";
import { Button } from "@/shared/ui/Button";
import { PriorityBadge, StatusBadge } from "@/shared/ui/Badge";
import { useToast } from "@/shared/ui/Toast";
import { formatDate } from "@/shared/utils/formatDate";

/** Lấy chữ viết tắt từ tên công ty để hiển thị trong huy hiệu tròn ở thanh bên. */
function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Trang sửa một đơn ứng tuyển. Khác với trang chi tiết (Server Component tải sẵn dữ liệu), trang này là
 * Client Component và tự gọi API để tải đơn cần sửa — cần thiết vì `ApplicationForm` phải chạy ở client
 * (react-hook-form) và trang muốn hiển thị trạng thái tải/lỗi riêng thay vì để Next.js hiện `notFound()`.
 */
export default function EditApplicationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { push } = useToast();
  const [application, setApplication] = useState<Application | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "not-found" | "error" | "ready">("loading");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!params.id) {
      setLoadState("not-found");
      return;
    }

    const controller = new AbortController();
    setLoadState("loading");
    setApplication(null);
    fetch(`/api/applications/${params.id}`, { signal: controller.signal })
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
        if (!data.application) {
          setLoadState("not-found");
          return;
        }
        setApplication(data.application);
        setLoadState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setLoadState("error");
      });

    return () => controller.abort();
  }, [params.id, retryKey]);

  /** Gửi `PUT /api/applications/:id`; thành công thì điều hướng tới trang chi tiết của đơn vừa cập nhật. */
  async function handleSubmit(values: ApplicationFormInput) {
    const res = await fetch(`/api/applications/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      push("Không thể cập nhật đơn ứng tuyển này.", "error");
      return;
    }

    const { application: updated } = await res.json().catch(() => ({ application: null }));
    push("Đã cập nhật đơn ứng tuyển");
    router.push(updated ? `/applications/${updated.id}` : "/applications");
  }

  if (loadState === "loading") {
    return (
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-10 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải thông tin đơn ứng tuyển…
      </div>
    );
  }

  if (loadState !== "ready" || !application) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
        {loadState === "not-found" && <p role="status" className="text-sm text-slate-500 dark:text-slate-400">Không tìm thấy đơn ứng tuyển này.</p>}
        {loadState === "error" && <p role="alert" className="text-sm text-slate-500 dark:text-slate-400">Không thể tải đơn ứng tuyển. Vui lòng thử lại.</p>}
        {loadState === "error" && <Button variant="outline" onClick={() => setRetryKey((key) => key + 1)}>Thử tải lại</Button>}
        <Button variant="outline" onClick={() => router.push("/applications")}>Về danh sách đơn ứng tuyển</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <nav className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
        <button onClick={() => router.push("/applications")} className="hover:text-slate-900 dark:hover:text-white">
          Đơn ứng tuyển
        </button>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <button
          onClick={() => router.push(`/applications/${application.id}`)}
          className="truncate hover:text-slate-900 dark:hover:text-white"
        >
          {application.company}
        </button>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="font-medium text-slate-900 dark:text-white">Chỉnh sửa</span>
      </nav>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/20 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/10">
          <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3.5 dark:border-white/10 dark:bg-white/[0.03] sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">Cập nhật hồ sơ</p>
            <h1 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">Thông tin đơn ứng tuyển</h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Chỉnh sửa các trường cần thiết rồi lưu thay đổi.</p>
          </div>
          <div className="p-4 sm:p-5">
            <ApplicationForm initialData={application} layout="wide" onSubmit={handleSubmit} onCancel={() => router.push(`/applications/${application.id}`)} />
          </div>
        </section>

        <aside className="rounded-xl border border-slate-200 border-t-4 border-t-brand-500 bg-white p-4 shadow-sm shadow-slate-200/20 dark:border-white/10 dark:border-t-brand-400 dark:bg-slate-900 dark:shadow-black/10 lg:sticky lg:top-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-bold text-brand-700 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/20">{getInitials(application.company)}</div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">Hồ sơ ứng tuyển</p>
              <h2 className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">{application.position}</h2>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{application.company}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <StatusBadge status={application.status} />
            <PriorityBadge priority={application.priority} />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-slate-100 pt-4 dark:border-white/10">
            <div>
              <dt className="text-[11px] text-slate-500 dark:text-slate-400">Ngày ứng tuyển</dt>
              <dd className="mt-1 text-xs font-semibold text-slate-900 dark:text-white">{formatDate(application.appliedDate)}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-slate-500 dark:text-slate-400">Hạn chót</dt>
              <dd className="mt-1 text-xs font-semibold text-slate-900 dark:text-white">{application.deadline ? formatDate(application.deadline) : "Chưa đặt"}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-slate-500 dark:text-slate-400">Địa điểm</dt>
              <dd className="mt-1 truncate text-xs font-semibold text-slate-900 dark:text-white">{application.location || "Chưa cập nhật"}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-slate-500 dark:text-slate-400">Mức lương</dt>
              <dd className="mt-1 truncate text-xs font-semibold text-slate-900 dark:text-white">{application.salary || "Chưa cập nhật"}</dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 dark:border-white/10">
            {application.jobUrl && <a href={application.jobUrl} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-white/10 dark:text-slate-200 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"><ExternalLink className="h-3.5 w-3.5" /> Mở tin tuyển dụng</a>}
            <button type="button" onClick={() => router.push(`/applications/${application.id}`)} className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-500/10"><BriefcaseBusiness className="h-3.5 w-3.5" /> Xem hồ sơ chi tiết</button>
          </div>
        </aside>
      </div>
    </div>
  );
}
