"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import type { Application } from "@prisma/client";
import { Button } from "@/shared/ui/Button";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { Modal } from "@/shared/ui/Modal";
import { useToast } from "@/shared/ui/Toast";
import { ApplicationTable } from "@/features/applications/components/ApplicationTable";
import {
  ApplicationFilter,
  type ApplicationFilterValue,
} from "@/features/applications/components/ApplicationFilter";
import { ExperienceQuickEditForm } from "@/features/applications/components/ExperienceQuickEditForm";

/** Một dòng dữ liệu đơn ứng tuyển kèm số lượng phỏng vấn/ghi chú (nếu API trả về). */
type ApplicationRow = Application & { _count?: { interviews: number; notes: number } };

/** Trạng thái bộ lọc mặc định khi vào trang lần đầu và không có tham số nào trên URL. */
const DEFAULT_FILTER: ApplicationFilterValue = {
  search: "",
  status: "",
  priority: "",
  sortBy: "createdAt",
  sortDir: "desc",
};

/**
 * Trang danh sách đơn ứng tuyển: tìm kiếm/lọc/sắp xếp/phân trang, cùng các modal sửa nhanh kinh nghiệm
 * và xác nhận xóa. `search`, `status`, `priority` được đồng bộ hai chiều với query string để có thể
 * chia sẻ hoặc bookmark một bộ lọc cụ thể; `sortBy`/`sortDir` và trang hiện tại thì không.
 * Bọc trong `<Suspense>` (ở `ApplicationsPage` bên dưới) vì `useSearchParams()` yêu cầu điều đó trong
 * App Router của Next.js.
 */
function ApplicationsPageContent() {
  const { push } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<ApplicationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [filter, setFilter] = useState<ApplicationFilterValue>(() => ({
    ...DEFAULT_FILTER,
    status: searchParams.get("status") ?? "",
    priority: searchParams.get("priority") ?? "",
    search: searchParams.get("search") ?? "",
  }));
  const [isLoading, setIsLoading] = useState(true);

  const [deleting, setDeleting] = useState<Application | null>(null);
  const [editingExperienceFor, setEditingExperienceFor] = useState<Application | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Gọi `GET /api/applications` với bộ lọc, cách sắp xếp và trang hiện tại; cập nhật danh sách và tổng số bản ghi.
   */
  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (filter.search) params.set("search", filter.search);
    if (filter.status) params.set("status", filter.status);
    if (filter.priority) params.set("priority", filter.priority);
    params.set("sortBy", filter.sortBy);
    params.set("sortDir", filter.sortDir);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    const res = await fetch(`/api/applications?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
    }
    setIsLoading(false);
  }, [filter, page]);

  useEffect(() => {
    // Chờ 300ms sau lần gõ cuối trước khi gọi API khi tìm kiếm (debounce), để không gọi API liên tục theo từng phím bấm; các thay đổi bộ lọc khác (trạng thái, độ ưu tiên, trang) gọi ngay lập tức.
    const timeout = setTimeout(fetchApplications, filter.search ? 300 : 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchApplications]);

  // Tự đưa về trang 1 mỗi khi bộ lọc hoặc cách sắp xếp thay đổi, so sánh bằng một khóa gộp thay vì liệt kê từng trường trong dependency array của effect, để tránh vòng lặp cập nhật không cần thiết.
  const filterKey = `${filter.search}|${filter.status}|${filter.priority}|${filter.sortBy}|${filter.sortDir}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  // Đồng bộ bộ lọc lên query string của URL (không thêm vào lịch sử điều hướng, không cuộn lại đầu trang), để URL luôn phản ánh đúng bộ lọc đang xem.
  useEffect(() => {
    const params = new URLSearchParams();
    if (filter.search) params.set("search", filter.search);
    if (filter.status) params.set("status", filter.status);
    if (filter.priority) params.set("priority", filter.priority);
    const query = params.toString();
    router.replace(query ? `/applications?${query}` : "/applications", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.search, filter.status, filter.priority]);

  /** Điều hướng tới trang tạo đơn ứng tuyển mới. */
  function openCreateScreen() {
    router.push("/applications/new");
  }

  /** Điều hướng tới trang sửa một đơn ứng tuyển. */
  function openEditScreen(application: Application) {
    router.push(`/applications/${application.id}/edit`);
  }

  /** Xóa đơn ứng tuyển đang chờ xác nhận, rồi tải lại danh sách hiện tại. */
  async function handleDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    const res = await fetch(`/api/applications/${deleting.id}`, { method: "DELETE" });
    setIsDeleting(false);
    if (!res.ok) {
      push("Không thể xóa đơn ứng tuyển này.", "error");
      return;
    }
    setDeleting(null);
    push("Đã xóa đơn ứng tuyển");
    fetchApplications();
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Đơn ứng tuyển</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{total} đơn đang theo dõi</p>
        </div>
        <Button onClick={openCreateScreen} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Thêm đơn ứng tuyển
        </Button>
      </div>

      <ApplicationFilter value={filter} onChange={setFilter} />

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-14 text-sm text-slate-400 dark:border-white/10 dark:bg-slate-900 dark:text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải danh sách…
        </div>
      ) : (
        <>
          <ApplicationTable
            items={items}
            onEdit={openEditScreen}
            onEditExperience={setEditingExperienceFor}
            onDelete={setDeleting}
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>
                Trang {page} / {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Xóa đơn ứng tuyển"
        description={
          <>
            Bạn có chắc muốn xóa đơn ứng tuyển{" "}
            <span title={deleting?.position ?? ""} className="inline-block max-w-full truncate align-bottom">
              {deleting?.position ?? ""}
            </span>{" "}
            tại{" "}
            <span title={deleting?.company ?? ""} className="inline-block max-w-full truncate align-bottom">
              {deleting?.company ?? ""}
            </span>
            ? Thao tác này sẽ xóa luôn các lịch phỏng vấn và ghi chú liên quan.
          </>
        }
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />

      <Modal
        open={Boolean(editingExperienceFor)}
        onClose={() => setEditingExperienceFor(null)}
        title="Sửa kinh nghiệm"
        size="md"
      >
        {editingExperienceFor && (
          <ExperienceQuickEditForm
            application={editingExperienceFor}
            onSaved={() => {
              setEditingExperienceFor(null);
              fetchApplications();
            }}
            onCancel={() => setEditingExperienceFor(null)}
          />
        )}
      </Modal>
    </div>
  );
}

/**
 * Điểm vào của route `/applications`; chỉ bọc `ApplicationsPageContent` trong `<Suspense>` để dùng được `useSearchParams()`.
 */
export default function ApplicationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center gap-2 py-14 text-sm text-slate-400 dark:text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
        </div>
      }
    >
      <ApplicationsPageContent />
    </Suspense>
  );
}
