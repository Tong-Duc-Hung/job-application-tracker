"use client";

import { useCallback, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/shared/utils/cn";

type ErrorAlertProps = {
  title: string;
  message: string;
  onClose: () => void;
};

/**
 * Thời lượng hiệu ứng biến mất (ms); phải khớp với animation `animate-toast-out` khai báo trong globals.css.
 */
const EXIT_DURATION_MS = 220;

/**
 * Thông báo lỗi nổi ở góc trên bên phải màn hình (dùng cho lỗi form đăng nhập/đăng ký).
 * Khác với `Toast` (tự động biến mất), `ErrorAlert` chỉ đóng khi người dùng bấm nút đóng.
 */
export function ErrorAlert({ title, message, onClose }: ErrorAlertProps) {
  const [leaving, setLeaving] = useState(false);

  /**
   * Bắt đầu hiệu ứng biến mất rồi mới gọi `onClose` thật sự sau `EXIT_DURATION_MS`, để hiệu ứng kịp chạy hết trước khi phần tử bị gỡ khỏi DOM.
   */
  const handleClose = useCallback(() => {
    setLeaving((already) => {
      if (already) return already;
      setTimeout(onClose, EXIT_DURATION_MS);
      return true;
    });
  }, [onClose]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "fixed right-5 top-5 z-50 flex w-[min(420px,calc(100vw-2.5rem))] items-center gap-3 overflow-hidden rounded-xl border border-rose-300/25 bg-slate-900/95 px-4 py-4 pl-5 text-sm text-rose-100 shadow-2xl shadow-slate-950/40 ring-1 ring-white/10 backdrop-blur-md",
        leaving ? "animate-toast-out" : "animate-toast-in"
      )}
    >
      <span className="absolute left-0 top-3 bottom-3 w-1">
        <span className="absolute inset-0 rounded-full bg-rose-400 opacity-60 blur-sm" />
        <span className="absolute inset-0 rounded-full bg-gradient-to-b from-rose-300/0 via-rose-400 to-rose-300/0" />
      </span>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-400/15 text-rose-300 ring-1 ring-inset ring-rose-300/20">
        <AlertTriangle className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold tracking-[-0.01em] text-white">{title}</p>
        <p className="mt-1 leading-relaxed text-slate-300">{message}</p>
      </div>
      <button
        type="button"
        aria-label="Đóng thông báo"
        title="Đóng thông báo"
        onClick={handleClose}
        className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/60"
      >
        <X className="h-[18px] w-[18px]" />
      </button>
    </div>
  );
}
