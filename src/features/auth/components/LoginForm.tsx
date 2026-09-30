"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { loginSchema, type LoginInput, type LoginRawInput } from "../auth.schema";
import { AuthField } from "./AuthField";
import { ErrorAlert } from "@/shared/ui/ErrorAlert";

/**
 * Form đăng nhập.
 *
 * @param redirectTo Trang sẽ chuyển tới sau khi đăng nhập thành công (từ `?from=`, đã được lọc an toàn
 * bởi `getSafeRedirectPath` ở trang cha); mặc định `/dashboard`.
 * @param sessionExpired `true` khi được điều hướng tới đây kèm `?expired=1` (phiên cũ đã bị vô hiệu,
 * ví dụ do vừa đổi mật khẩu) — hiển thị thêm một dòng thông báo giải thích lý do.
 */
export function LoginForm({
  redirectTo = "/dashboard",
  sessionExpired = false,
}: {
  redirectTo?: string;
  sessionExpired?: boolean;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginRawInput, unknown, LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  /**
   * Gửi `POST /api/auth/login`; thành công thì điều hướng tới `redirectTo` và làm mới dữ liệu Server Component (`router.refresh()`).
   */
  async function onSubmit(values: LoginInput) {
    setFormError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFormError(data.error || "Đăng nhập thất bại. Vui lòng thử lại.");
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setFormError("Không thể kết nối. Vui lòng kiểm tra mạng và thử lại.");
    }
  }

  return (
    <>
      {formError && (
        <ErrorAlert title="Thông tin chưa chính xác" message={formError} onClose={() => setFormError(null)} />
      )}
      <div className="animate-fade-up mx-auto mb-9 max-w-lg border-b border-white/10 pb-7 text-center">
        <h2 className="font-sans text-3xl font-semibold tracking-tight text-white">Chào mừng trở lại</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">Đăng nhập để tiếp tục quản lý hành trình tìm việc của bạn.</p>
        {sessionExpired && (
          <p role="status" className="mt-4 rounded-lg border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
            Phiên đăng nhập đã hết hạn hoặc mật khẩu đã được thay đổi. Vui lòng đăng nhập lại.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="animate-fade-up mx-auto flex max-w-lg flex-col gap-5 [animation-delay:80ms]">
        <AuthField
          label="Email"
          type="email"
          placeholder="Nhập email của bạn"
          autoComplete="email"
          required
          error={errors.email?.message}
          {...register("email")}
        />

        <AuthField
          label="Mật khẩu"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
          error={errors.password?.message}
          {...register("password")}
        />

        <div className="flex items-center justify-between px-0.5 text-sm">
          <label className="flex items-center gap-2 text-slate-400">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-white/20 accent-brand-600"
              {...register("rememberMe")}
            />
            Ghi nhớ đăng nhập
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-400 text-sm font-semibold text-sky-950 shadow-lg shadow-sky-400/20 transition-all hover:-translate-y-0.5 hover:bg-sky-300 hover:shadow-xl hover:shadow-sky-400/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Đang đăng nhập…" : "Đăng nhập"}
          {!isSubmitting && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
        </button>

        <p className="text-center text-sm text-slate-400">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="font-medium text-sky-300 underline-offset-4 hover:text-sky-200 hover:underline">
            Đăng ký
          </Link>
        </p>
      </form>
    </>
  );
}
