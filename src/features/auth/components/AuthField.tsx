import { InputHTMLAttributes, forwardRef, useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/shared/utils/cn";

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

/**
 * Ô nhập dùng riêng cho trang đăng nhập/đăng ký (giao diện nền tối). Với `type="password"`, tự thêm nút hiện/ẩn ký tự.
 */
export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(
  ({ label, error, className, id, name, ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(false);
    const isPassword = props.type === "password";
    const generatedId = useId();
    const inputId = id ?? name ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-slate-300"
        >
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            name={name}
            {...props}
            type={isPassword && isVisible ? "text" : props.type}
            className={cn(
              "h-12 w-full rounded-xl border bg-[#102a3c] px-3.5 pr-11 text-[15px] text-slate-100 shadow-sm shadow-black/10 placeholder:text-slate-400",
              "transition-all focus:outline-none focus:ring-4 focus:ring-sky-300/15",
              error
                ? "border-red-500/60 focus:border-red-500"
                : "border-white/10 focus:border-sky-400",
              className
            )}
          />
          {isPassword && (
            <button
              type="button"
              aria-label={isVisible ? "Ẩn ký tự" : "Hiện ký tự"}
              title={isVisible ? "Ẩn ký tự" : "Hiện ký tự"}
              onClick={() => setIsVisible((visible) => !visible)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition-colors hover:text-sky-300"
            >
              {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);
AuthField.displayName = "AuthField";
