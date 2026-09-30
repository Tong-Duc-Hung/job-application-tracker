"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Camera, Loader2, Lock, Pencil, Check, X } from "lucide-react";
import { profileSchema, type ProfileInput } from "../settings.schema";
import { Card, CardHeader } from "@/shared/ui/Card";
import { Avatar } from "@/shared/ui/Avatar";
import { useToast } from "@/shared/ui/Toast";
import { resizeImageToDataUrl } from "@/shared/utils/resizeImage";

/** Kích thước tối đa của ảnh đại diện được phép tải lên (8 MB), kiểm tra trước khi nén ảnh ở client. */
const MAX_FILE_SIZE = 8 * 1024 * 1024;

interface ProfileFormProps {
  user: { name: string; email: string; avatarUrl: string | null };
}

/**
 * Thẻ "Hồ sơ cá nhân" ở trang Cài đặt: đổi ảnh đại diện và tên hiển thị.
 * Đổi ảnh và đổi tên là hai luồng lưu độc lập: đổi ảnh tự lưu ngay sau khi xử lý xong, còn đổi tên
 * cần bấm nút xác nhận (chế độ chỉnh sửa tại chỗ).
 */
export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const { push } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      avatarUrl: user.avatarUrl ?? "",
    },
  });

  const liveName = watch("name") || user.name;
  const liveAvatarUrl = watch("avatarUrl");

  /**
   * Gửi `PUT /api/settings/profile` với tên và ảnh đại diện hiện tại.
   *
   * @returns `true` nếu lưu thành công.
   */
  async function saveProfile(values: ProfileInput) {
    const res = await fetch("/api/settings/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      push("Không thể cập nhật hồ sơ.", "error");
      return false;
    }
    push("Đã cập nhật hồ sơ");
    router.refresh();
    return true;
  }

  /**
   * Xử lý khi người dùng chọn ảnh đại diện mới: kiểm tra dung lượng, nén ảnh thành data URL
   * (`resizeImageToDataUrl`) rồi lưu ngay, không cần chờ người dùng bấm nút riêng.
   */
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      push("Ảnh quá lớn (tối đa 8MB). Vui lòng chọn ảnh khác.", "error");
      return;
    }

    setIsProcessingImage(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setValue("avatarUrl", dataUrl, { shouldDirty: true, shouldValidate: true });
      await saveProfile({ name: liveName, avatarUrl: dataUrl });
    } catch (err) {
      push(err instanceof Error ? err.message : "Không thể xử lý ảnh này.", "error");
    } finally {
      setIsProcessingImage(false);
    }
  }

  /** Lưu tên mới; thành công thì thoát chế độ chỉnh sửa. */
  async function onSaveName(values: ProfileInput) {
    const ok = await saveProfile(values);
    if (ok) setIsEditingName(false);
  }

  /** Hủy chỉnh sửa tên, khôi phục lại giá trị ban đầu. */
  function cancelEditName() {
    reset({ name: user.name, avatarUrl: liveAvatarUrl });
    setIsEditingName(false);
  }

  return (
    <section id="profile" className="scroll-mt-6">
      <Card>
        <CardHeader
          icon={<User className="h-4 w-4" />}
          title="Hồ sơ cá nhân"
          description="Ảnh đại diện, tên và email của bạn"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_3fr] sm:items-center">
          <div className="relative flex items-center justify-center py-4">
            <div className="pointer-events-none absolute h-52 w-52 rounded-full bg-gradient-to-br from-brand-400/15 to-brand-600/5 blur-2xl dark:from-brand-400/10 dark:to-brand-600/10" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingImage}
              aria-label="Đổi ảnh đại diện"
              title="Đổi ảnh đại diện"
              className="group relative z-10 shrink-0 scale-[2] rounded-full disabled:cursor-wait"
            >
              <Avatar name={liveName} avatarUrl={liveAvatarUrl} size="lg" />
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-white opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                <Camera className="h-5 w-5" />
              </span>
              <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-700 text-white shadow-sm transition-colors group-hover:bg-slate-900 dark:border-slate-900 dark:bg-slate-600 dark:group-hover:bg-slate-500">
                {isProcessingImage ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <form
              onSubmit={handleSubmit(onSaveName)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-white/10"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-400 dark:text-slate-500">Họ và tên</p>
                {isEditingName ? (
                  <input
                    autoFocus
                    className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none dark:text-white"
                    {...register("name")}
                  />
                ) : (
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{liveName}</p>
                )}
              </div>
              {isEditingName ? (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    aria-label="Lưu"
                    title="Lưu"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditName}
                    disabled={isSubmitting}
                    aria-label="Hủy"
                    title="Hủy"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  aria-label="Chỉnh sửa tên"
                  title="Chỉnh sửa tên"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-white/5 dark:hover:text-brand-400"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </form>
            {errors.name?.message && (
              <p className="px-1 text-xs text-red-500 dark:text-red-400">{errors.name.message}</p>
            )}

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 dark:border-white/10 dark:bg-white/[0.02]">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-400 dark:text-slate-500">Email</p>
                <p className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">{user.email}</p>
              </div>
              <span
                title="Email không thể thay đổi"
                className="flex h-7 w-7 shrink-0 items-center justify-center text-slate-300 dark:text-slate-600"
              >
                <Lock className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}
