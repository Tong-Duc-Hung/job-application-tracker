"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X, type LucideIcon } from "lucide-react";
import { cn } from "@/shared/utils/cn";

/**
 * Bốn sắc thái thông báo. `warning` và `info` được định nghĩa sẵn nhưng hiện chưa nơi nào trong ứng dụng gọi `push` với hai giá trị này.
 */
type ToastVariant = "success" | "error" | "warning" | "info";

/**
 * Trạng thái nội bộ của một thông báo đang hiển thị (bao gồm cả trạng thái đang biến mất và đang bị tạm dừng đếm giờ).
 */
type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
  duration: number;
  leaving: boolean;
  paused: boolean;
};

/** Giá trị context mà `useToast()` trả về. */
type ToastContextValue = {
  push: (message: string, variant?: ToastVariant, duration?: number) => void;
};

/** Context giữ hàm `push` để hiển thị thông báo. */
const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Thời lượng hiệu ứng thu gọn khi một thông báo biến mất (ms); phải khớp với `duration-[320ms]` trong className bên dưới.
 */
const REFLOW_DURATION_MS = 320;
/** Thời gian một thông báo tự động biến mất nếu không truyền `duration` riêng. */
const DEFAULT_DURATION_MS = 4000;

/** Icon và bảng màu (viền, chấm nhấn, nền icon…) cho từng sắc thái thông báo. */
const VARIANT_STYLES: Record<
  ToastVariant,
  {
    icon: LucideIcon;
    border: string;
    accent: string;
    accentGradient: string;
    iconBg: string;
    iconText: string;
    iconRing: string;
    role: "alert" | "status";
  }
> = {
  success: {
    icon: CheckCircle2,
    border: "border-emerald-300/25",
    accent: "bg-emerald-400",
    accentGradient: "from-emerald-300/0 via-emerald-400 to-emerald-300/0",
    iconBg: "bg-emerald-400/15",
    iconText: "text-emerald-300",
    iconRing: "ring-emerald-300/20",
    role: "status",
  },
  error: {
    icon: XCircle,
    border: "border-rose-300/25",
    accent: "bg-rose-400",
    accentGradient: "from-rose-300/0 via-rose-400 to-rose-300/0",
    iconBg: "bg-rose-400/15",
    iconText: "text-rose-300",
    iconRing: "ring-rose-300/20",
    role: "alert",
  },
  warning: {
    icon: AlertTriangle,
    border: "border-amber-300/25",
    accent: "bg-amber-400",
    accentGradient: "from-amber-300/0 via-amber-400 to-amber-300/0",
    iconBg: "bg-amber-400/15",
    iconText: "text-amber-300",
    iconRing: "ring-amber-300/20",
    role: "alert",
  },
  info: {
    icon: Info,
    border: "border-sky-300/25",
    accent: "bg-sky-400",
    accentGradient: "from-sky-300/0 via-sky-400 to-sky-300/0",
    iconBg: "bg-sky-400/15",
    iconText: "text-sky-300",
    iconRing: "ring-sky-300/20",
    role: "status",
  },
};

/**
 * Provider hiển thị danh sách thông báo dạng toast ở góc trên bên phải màn hình.
 * Mỗi toast tự đếm ngược để biến mất; việc đếm giờ được tạm dừng khi con trỏ chuột đang hover lên toast đó
 * (xem `pause`/`resume`), để người dùng có đủ thời gian đọc.
 * Đặt bao ngoài toàn bộ layout dashboard/xác thực; component con gọi `useToast().push(...)` để hiển thị.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idCounter = useRef(0);
  const timers = useRef(
    new Map<number, { timeoutId: ReturnType<typeof setTimeout>; remaining: number; start: number }>()
  );

  /** Bắt đầu hiệu ứng biến mất của một toast, rồi thực sự gỡ nó khỏi danh sách sau khi hiệu ứng kết thúc. */
  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timers.current.delete(id);
    }, REFLOW_DURATION_MS);
  }, []);

  /**
   * Đặt hẹn giờ tự động gỡ một toast sau `ms` mili giây, đồng thời lưu lại thời điểm bắt đầu để `pause`/`resume` tính được thời gian còn lại.
   */
  const schedule = useCallback(
    (id: number, ms: number) => {
      const timeoutId = setTimeout(() => remove(id), ms);
      timers.current.set(id, { timeoutId, remaining: ms, start: Date.now() });
    },
    [remove]
  );

  /**
   * Hiển thị một thông báo mới.
   *
   * @param message Nội dung hiển thị.
   * @param variant Sắc thái (mặc định "success").
   * @param duration Thời gian tồn tại tính bằng mili giây (mặc định `DEFAULT_DURATION_MS`).
   */
  const push = useCallback(
    (message: string, variant: ToastVariant = "success", duration = DEFAULT_DURATION_MS) => {
      const id = ++idCounter.current;
      setToasts((prev) => [...prev, { id, message, variant, duration, leaving: false, paused: false }]);
      schedule(id, duration);
    },
    [schedule]
  );

  /**
   * Tạm dừng đồng hồ đếm ngược của một toast (khi con trỏ chuột đang hover lên) và ghi lại thời gian còn lại.
   */
  const pause = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer.timeoutId);
      timer.remaining = Math.max(timer.remaining - (Date.now() - timer.start), 0);
    }
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, paused: true } : t)));
  }, []);

  /** Tiếp tục đếm ngược từ thời gian còn lại đã lưu khi `pause`. */
  const resume = useCallback(
    (id: number) => {
      const timer = timers.current.get(id);
      if (timer) {
        timer.start = Date.now();
        timer.timeoutId = setTimeout(() => remove(id), timer.remaining);
      }
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, paused: false } : t)));
    },
    [remove]
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-5 top-5 z-[100] flex w-[min(400px,calc(100vw-2.5rem))] flex-col">
        {[...toasts].reverse().map((t) => {
          const styles = VARIANT_STYLES[t.variant];
          const Icon = styles.icon;
          return (
            <div
              key={t.id}
              className={cn(
                "grid overflow-hidden transition-[grid-template-rows,margin-bottom] duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                t.leaving ? "grid-rows-[0fr] mb-0" : "grid-rows-[1fr] mb-2.5"
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div
                  role={styles.role}
                  aria-live={styles.role === "alert" ? "assertive" : "polite"}
                  onMouseEnter={() => pause(t.id)}
                  onMouseLeave={() => resume(t.id)}
                  className={cn(
                    "pointer-events-auto relative flex items-center gap-3 overflow-hidden rounded-xl border bg-slate-900/95 px-4 py-3.5 pl-5 text-sm shadow-2xl shadow-slate-950/40 ring-1 ring-white/10 backdrop-blur-md",
                    styles.border,
                    t.leaving ? "animate-toast-out" : "animate-toast-in"
                  )}
                >
                  <span className="absolute left-0 top-3 bottom-3 w-1">
                    <span className={cn("absolute inset-0 rounded-full opacity-60 blur-sm", styles.accent)} />
                    <span className={cn("absolute inset-0 rounded-full bg-gradient-to-b", styles.accentGradient)} />
                  </span>
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
                      styles.iconBg,
                      styles.iconText,
                      styles.iconRing
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1 leading-relaxed text-slate-100">{t.message}</span>
                  <button
                    type="button"
                    aria-label="Đóng thông báo"
                    title="Đóng thông báo"
                    onClick={() => remove(t.id)}
                    className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60"
                  >
                    <X className="h-[18px] w-[18px]" />
                  </button>
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-[3px] bg-white/10"
                  >
                    <span
                      className={cn("block h-full origin-left", styles.accent)}
                      style={{
                        animation: `toast-progress ${t.duration}ms linear forwards`,
                        animationPlayState: t.paused ? "paused" : "running",
                      }}
                    />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Hook lấy hàm `push` để hiển thị thông báo từ bất kỳ component con nào của `ToastProvider`.
 *
 * @throws Error nếu gọi ngoài `ToastProvider`.
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
