"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { useToast } from "@/shared/ui/Toast";
import { Input } from "@/shared/ui/Input";

/**
 * Khối "Vùng nguy hiểm" ở trang Cài đặt: xóa tài khoản, yêu cầu xác nhận qua hộp thoại và nhập lại mật khẩu.
 */
export function DangerZone() {
  const router = useRouter();
  const { push } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [password, setPassword] = useState("");

  /** Gửi `DELETE /api/settings/account` kèm mật khẩu xác nhận; thành công thì chuyển về trang đăng nhập. */
  async function handleDeleteAccount() {
    setIsDeleting(true);
    const res = await fetch("/api/settings/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setIsDeleting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      push(data.error || "Không thể xóa tài khoản.", "error");
      return;
    }
    setPassword("");
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-red-200/80 bg-red-50/60 p-5 shadow-sm shadow-red-100/40 dark:border-red-500/20 dark:bg-red-500/[0.05] dark:shadow-black/10">
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-red-500" />
        <h3 className="text-base font-semibold text-red-700 dark:text-red-400">Vùng nguy hiểm</h3>
      </div>

      <div className="flex flex-col justify-between gap-3 border-t border-red-200/70 pt-4 sm:flex-row sm:items-center dark:border-red-500/15">
        <div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Xóa tài khoản</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Xóa vĩnh viễn tài khoản, toàn bộ đơn ứng tuyển và lịch phỏng vấn. Không thể hoàn tác.
          </p>
        </div>
        <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)} className="shrink-0">
          <Trash2 className="h-4 w-4" /> Xóa tài khoản
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Xóa tài khoản"
        description="Thao tác này sẽ xóa vĩnh viễn tài khoản, toàn bộ đơn ứng tuyển, lịch phỏng vấn và ghi chú của bạn. Không thể hoàn tác."
        confirmLabel="Xóa tài khoản"
        isLoading={isDeleting}
        onConfirm={handleDeleteAccount}
        onClose={() => {
          setConfirmOpen(false);
          setPassword("");
        }}
      >
        <div className="mt-4">
          <Input
            label="Nhập mật khẩu để xác nhận"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mật khẩu hiện tại"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
