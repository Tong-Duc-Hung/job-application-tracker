"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Monitor, Sun, Moon, Palette } from "lucide-react";
import type { Theme } from "@prisma/client";
import { Card, CardHeader } from "@/shared/ui/Card";
import { useToast } from "@/shared/ui/Toast";
import { cn } from "@/shared/utils/cn";

/** Ba lựa chọn giao diện hiển thị dưới dạng nút bấm, kèm icon tương ứng. */
const options: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "LIGHT", label: "Sáng", icon: Sun },
  { value: "DARK", label: "Tối", icon: Moon },
  { value: "SYSTEM", label: "Hệ thống", icon: Monitor },
];

/**
 * Thẻ "Giao diện" ở trang Cài đặt.
 * Áp dụng giao diện ngay lập tức ở client qua `next-themes` (`setLiveTheme`) để người dùng thấy hiệu ứng
 * tức thì, song song với việc lưu lựa chọn lên server để đồng bộ giữa các thiết bị.
 * `mounted` dùng để tránh hiển thị sai trạng thái "đang chọn" trong lần render đầu tiên ở server
 * (server không biết theme thực tế do trình duyệt/hệ điều hành quyết định với lựa chọn SYSTEM).
 */
export function AppearanceForm({ initialTheme }: { initialTheme: Theme }) {
  const router = useRouter();
  const { push } = useToast();
  const { setTheme: setLiveTheme } = useTheme();
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  /** Chọn một giao diện: cập nhật ngay ở client rồi lưu lên server qua `PUT /api/settings/theme`. */
  async function handleSelect(value: Theme) {
    setTheme(value);
    setLiveTheme(value.toLowerCase());
    setIsSaving(true);
    const res = await fetch("/api/settings/theme", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: value }),
    });
    setIsSaving(false);
    if (!res.ok) {
      push("Không thể lưu giao diện. Vui lòng thử lại.", "error");
      return;
    }
    push("Đã cập nhật giao diện");
    router.refresh();
  }

  return (
    <section id="appearance" className="scroll-mt-6">
      <Card>
        <CardHeader
          icon={<Palette className="h-4 w-4" />}
          iconColor="amber"
          title="Giao diện"
          description="Chọn cách hiển thị của ứng dụng trên thiết bị này"
        />
        <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 dark:border-white/10 sm:gap-3">
        {options.map((opt) => {
          const Icon = opt.icon;
          const active = mounted && theme === opt.value;
          return (
            <button
              key={opt.value}
              disabled={isSaving}
              onClick={() => handleSelect(opt.value)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border px-2 py-3 text-sm font-medium transition-colors sm:py-3.5",
                active
                  ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-500/10 dark:text-brand-300"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
              )}
            >
              <Icon className="h-5 w-5" />
              {opt.label}
            </button>
          );
        })}
        </div>
      </Card>
    </section>
  );
}
