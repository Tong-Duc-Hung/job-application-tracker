"use client";

import { Modal } from "./Modal";
import { Button } from "./Button";
import type { ReactNode } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}

/**
 * Hộp thoại xác nhận dùng chung cho các thao tác nguy hiểm (xóa đơn, xóa tài khoản…), dựng trên `Modal`.
 *
 * @property confirmLabel Nhãn nút xác nhận (mặc định "Xóa").
 * @property children Nội dung phụ tùy chọn hiển thị dưới phần mô tả (ví dụ ô nhập mật khẩu xác nhận).
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Xóa",
  isLoading,
  onConfirm,
  onClose,
  children,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="min-w-0 break-words text-sm text-slate-600 [overflow-wrap:anywhere] dark:text-slate-300">
        {description}
      </p>
      {children}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          Hủy
        </Button>
        <Button variant="danger" onClick={onConfirm} isLoading={isLoading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
