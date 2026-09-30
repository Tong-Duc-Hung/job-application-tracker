"use client";

// Nút bấm dùng chung toàn ứng dụng: 5 kiểu màu (`variant`) và 3 cỡ (`size`), kèm trạng thái đang tải.
import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/shared/utils/cn";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

/** Lớp CSS cho từng kiểu màu của nút. */
const variantClasses: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline-brand-600 disabled:bg-brand-300 dark:bg-brand-600 dark:hover:bg-brand-500 dark:disabled:bg-brand-800",
  secondary:
    "bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:outline-slate-400 dark:bg-white/10 dark:text-white dark:hover:bg-white/15",
  outline:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-slate-400 dark:border-white/15 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5",
  ghost: "text-slate-600 hover:bg-slate-100 focus-visible:outline-slate-400 dark:text-slate-300 dark:hover:bg-white/5",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600 disabled:bg-red-300 dark:bg-red-600 dark:hover:bg-red-500",
};

/** Lớp CSS cho từng cỡ nút. */
const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-base gap-2",
};

/**
 * Nút bấm dùng chung. Khi `isLoading`, nút tự động bị vô hiệu (cộng với `disabled` nếu có) và hiện icon xoay.
 *
 * @property variant Kiểu màu (mặc định "primary").
 * @property size Cỡ nút (mặc định "md").
 * @property isLoading Hiện icon xoay và vô hiệu nút khi đang xử lý.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", isLoading, disabled, children, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-medium transition-colors",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-70",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
