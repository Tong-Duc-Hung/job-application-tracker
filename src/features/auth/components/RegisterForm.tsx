"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { registerSchema, type RegisterInput } from "../auth.schema";
import { AuthField } from "./AuthField";
import { ErrorAlert } from "@/shared/ui/ErrorAlert";

/**
 * Form đăng ký tài khoản mới.
 * Sau khi tạo thành công, hiển thị màn hình xác nhận trong khoảnh khắc rồi tự chuyển sang trang đăng nhập.
 */
export function RegisterForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  /**
   * Gửi `POST /api/auth/register`; thành công thì chuyển sang trạng thái `success` và tự điều hướng tới `/login` sau 1.2 giây.
   */
  async function onSubmit(values: RegisterInput) {
    setFormError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFormError(data.error || "Đăng ký thất bại. Vui lòng thử lại.");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 1200);
    } catch {
      setFormError("Không thể kết nối. Vui lòng kiểm tra mạng và thử lại.");
    }
  }

  if (success) {
    return (
      <div className="animate-fade-up">
        <h2 className="font-sans text-2xl font-semibold tracking-tight text-white">Xong rồi!</h2>
        <div role="status" className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-3 text-sm text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Tạo tài khoản thành công</p>
            <p className="mt-0.5 leading-relaxed">Đang chuyển bạn đến trang đăng nhập…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {formError && (
        <ErrorAlert title="Thông tin chưa chính xác" message={formError} onClose={() => setFormError(null)} />
      )}
      <div className="animate-fade-up mb-8 border-b border-white/10 pb-6">
          <h2 className="font-sans text-3xl font-semibold tracking-tight text-white">Tạo tài khoản</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">Thiết lập không gian riêng để theo dõi từng cơ hội nghề nghiệp.</p>
        </div>

      <form onSubmit={handleSubmit(onSubmit)} className="animate-fade-up flex flex-col gap-5 [animation-delay:80ms]">
        <AuthField label="Họ và tên" placeholder="Nguyễn Văn A" required error={errors.name?.message} {...register("name")} />

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
          placeholder="Ít nhất 8 ký tự"
          autoComplete="new-password"
          required
          error={errors.password?.message}
          {...register("password")}
        />

        <AuthField
          label="Xác nhận mật khẩu"
          type="password"
          placeholder="Nhập lại mật khẩu"
          autoComplete="new-password"
          required
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-400 text-sm font-semibold text-sky-950 shadow-lg shadow-sky-400/20 transition-all hover:-translate-y-0.5 hover:bg-sky-300 hover:shadow-xl hover:shadow-sky-400/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Đang tạo tài khoản…" : "Đăng ký"}
          {!isSubmitting && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
        </button>

        <p className="text-center text-sm text-slate-400">
          Đã có tài khoản?{" "}
          <Link href="/login" className="font-medium text-sky-300 underline-offset-4 hover:text-sky-200 hover:underline">
            Đăng nhập
          </Link>
        </p>
      </form>
    </>
  );
}
