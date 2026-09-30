import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import { ProfileForm } from "@/features/settings/components/ProfileForm";
import { PasswordForm } from "@/features/settings/components/PasswordForm";
import { AppearanceForm } from "@/features/settings/components/AppearanceForm";
import { ExportData } from "@/features/settings/components/ExportData";
import { DangerZone } from "@/features/settings/components/DangerZone";
import { AccountSummary } from "@/features/settings/components/AccountSummary";
import * as settingsService from "@/features/settings/settings.service";

/**
 * Trang Cài đặt: tải sẵn dữ liệu người dùng và số liệu tổng quan tài khoản ở server, sau đó truyền xuống các form con (hồ sơ, mật khẩu, giao diện, xuất dữ liệu, xóa tài khoản).
 */
export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?expired=1");

  const overview = await settingsService.getAccountOverview(user.id);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Cài đặt</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Quản lý tài khoản và tùy chọn ứng dụng</p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
          <ProfileForm user={user} />
          <PasswordForm />
          <AppearanceForm initialTheme={user.theme} />
          <ExportData userName={user.name} />
          <DangerZone />
        </div>

        <div className="w-full lg:sticky lg:top-6 lg:w-80 lg:shrink-0">
          <AccountSummary user={user} overview={overview} />
        </div>
      </div>
    </div>
  );
}