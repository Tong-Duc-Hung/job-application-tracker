"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Shield, KeyRound } from "lucide-react";
import { passwordSchema, type PasswordInput } from "../settings.schema";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader } from "@/shared/ui/Card";
import { Modal } from "@/shared/ui/Modal";
import { useToast } from "@/shared/ui/Toast";
import { cn } from "@/shared/utils/cn";

/**
 * Ước lượng độ mạnh của mật khẩu mới để hiển thị thanh chỉ báo trực quan cho người dùng.
 * Chỉ mang tính gợi ý ở client; quy tắc bắt buộc thực sự nằm ở `passwordSchema`.
 *
 * @param password Mật khẩu đang gõ.
 * @returns Nhãn, màu sắc và số vạch hiển thị, hoặc `null` nếu ô nhập còn trống.
 */
function getPasswordStrength(password: string) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { label: "Yếu", color: "bg-red-500", textColor: "text-red-600 dark:text-red-400", bars: 1 };
  if (score <= 3)
    return { label: "Trung bình", color: "bg-amber-500", textColor: "text-amber-600 dark:text-amber-400", bars: 2 };
  return { label: "Mạnh", color: "bg-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400", bars: 3 };
}

/** Thẻ "Bảo mật" ở trang Cài đặt: mở modal đổi mật khẩu. */
export function PasswordForm() {
  const router = useRouter();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PasswordInput>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmNewPassword: "" },
  });

  const strength = getPasswordStrength(watch("newPassword"));

  /** Đóng modal đổi mật khẩu và xóa dữ liệu form đã nhập. */
  function closeModal() {
    setOpen(false);
    reset();
  }

  /**
   * Gửi `PUT /api/settings/password`.
   * Đổi mật khẩu thành công sẽ vô hiệu phiên đăng nhập hiện tại (server đã xóa cookie), nên sau khi đóng
   * modal, người dùng được chuyển tới `/login?expired=1` để đăng nhập lại.
   */
  async function onSubmit(values: PasswordInput) {
    const res = await fetch("/api/settings/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError("currentPassword", { message: data.error || "Không thể đổi mật khẩu" });
      return;
    }

    push("Đã đổi mật khẩu");
    closeModal();
    router.push("/login?expired=1");
  }

  return (
    <section id="security" className="scroll-mt-6">
      <Card>
        <CardHeader
          icon={<Shield className="h-4 w-4" />}
          iconColor="violet"
          title="Bảo mật"
          description="Mật khẩu đăng nhập của bạn"
        />
        <div className="flex flex-col justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center dark:border-white/10">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Mật khẩu</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">••••••••</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="shrink-0">
            <KeyRound className="h-4 w-4" /> Đổi mật khẩu
          </Button>
        </div>
      </Card>

      <Modal open={open} onClose={closeModal} title="Đổi mật khẩu" size="sm">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="Mật khẩu hiện tại"
            type="password"
            required
            autoFocus
            error={errors.currentPassword?.message}
            {...register("currentPassword")}
          />
          <div>
            <Input
              label="Mật khẩu mới"
              type="password"
              required
              error={errors.newPassword?.message}
              {...register("newPassword")}
            />
            {strength && (
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex flex-1 gap-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1 flex-1 rounded-full",
                        i <= strength.bars ? strength.color : "bg-slate-200 dark:bg-white/10"
                      )}
                    />
                  ))}
                </div>
                <span className={cn("text-xs font-medium", strength.textColor)}>{strength.label}</span>
              </div>
            )}
          </div>
          <Input
            label="Xác nhận mật khẩu mới"
            type="password"
            required
            error={errors.confirmNewPassword?.message}
            {...register("confirmNewPassword")}
          />
          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={closeModal} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Cập nhật mật khẩu
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
