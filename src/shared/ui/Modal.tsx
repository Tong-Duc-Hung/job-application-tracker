"use client";

import { Fragment, ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/shared/utils/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

/** Độ rộng tối đa cho từng cỡ modal. */
const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
};

/**
 * Modal dùng chung, render qua React Portal vào `document.body`.
 * Tự đóng khi nhấn Escape và khóa cuộn trang nền trong lúc mở.
 */
export function Modal({ open, onClose, title, description, children, size = "md" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <Fragment>
      <div
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className={cn(
            "w-full rounded-2xl bg-white shadow-xl ring-1 ring-black/5 animate-[modal-in_150ms_ease-out] dark:bg-slate-900 dark:ring-white/10",
            sizeClasses[size]
          )}
        >
          <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4 dark:border-white/10">
            <div className="min-w-0">
              <h2 id="modal-title" className="break-words text-lg font-semibold text-slate-900 [overflow-wrap:anywhere] dark:text-white">
                {title}
              </h2>
              {description && (
                <p className="mt-0.5 break-words text-sm text-slate-500 [overflow-wrap:anywhere] dark:text-slate-400">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              title="Đóng"
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="min-w-0 px-6 py-5">{children}</div>
        </div>
      </div>
    </Fragment>,
    document.body
  );
}
