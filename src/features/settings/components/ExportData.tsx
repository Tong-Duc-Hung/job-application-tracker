"use client";

import { useState } from "react";
import { Download, Database, FileJson, FileSpreadsheet, FileText, ChevronDown } from "lucide-react";
import { Card, CardHeader } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { usePopover } from "@/shared/hooks/usePopover";
import { useToast } from "@/shared/ui/Toast";
import { cn } from "@/shared/utils/cn";
import {
  exportAsJson,
  exportApplicationsAsCsv,
  exportApplicationsAsXlsx,
  exportApplicationsAsPdf,
  type ApplicationWithInterviews,
} from "@/shared/utils/exportFormats";

/** Các định dạng file xuất dữ liệu được hỗ trợ. */
type Format = "csv" | "xlsx" | "pdf" | "json";

/** Danh sách định dạng hiển thị trong menu xuất dữ liệu, kèm mô tả ngắn và icon. */
const FORMAT_OPTIONS: { value: Format; label: string; description: string; icon: typeof FileJson }[] = [
  { value: "csv", label: "CSV", description: "Đơn ứng tuyển (có kinh nghiệm), phỏng vấn và ghi chú", icon: FileSpreadsheet },
  { value: "xlsx", label: "Excel (.xlsx)", description: "File Excel — 3 sheet: Đơn ứng tuyển (có kinh nghiệm), Phỏng vấn & Ghi chú", icon: FileSpreadsheet },
  { value: "pdf", label: "PDF", description: "Báo cáo dạng bảng, tiện in hoặc chia sẻ", icon: FileText },
  { value: "json", label: "JSON", description: "Toàn bộ dữ liệu gốc — dùng để sao lưu đầy đủ", icon: FileJson },
];

/**
 * Thẻ "Dữ liệu" ở trang Cài đặt: cho phép tải toàn bộ dữ liệu người dùng về máy theo một trong bốn
 * định dạng. Dữ liệu gốc luôn lấy từ `/api/settings/export` (JSON); các định dạng khác được chuyển đổi
 * ngay tại trình duyệt bằng `shared/utils/exportFormats`.
 */
export function ExportData({ userName }: { userName: string }) {
  const { push } = useToast();
  const { open: popoverOpen, setOpen: setPopoverOpen, ref: popoverRef } = usePopover<HTMLDivElement>();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Tải dữ liệu gốc rồi chuyển đổi và kích hoạt tải file theo định dạng đã chọn.
   *
   * @param format Định dạng file mong muốn.
   */
  async function handleExport(format: Format) {
    setPopoverOpen(false);
    setIsLoading(true);
    try {
      const res = await fetch("/api/settings/export");
      if (!res.ok) throw new Error();
      const data = await res.json();
      const applications = data.applications as ApplicationWithInterviews[];

      if (format === "json") exportAsJson(data);
      else if (format === "csv") exportApplicationsAsCsv(applications);
      else if (format === "xlsx") await exportApplicationsAsXlsx(applications);
      else if (format === "pdf") await exportApplicationsAsPdf(applications, userName);

      push("Đã xuất dữ liệu");
    } catch {
      push("Không thể xuất dữ liệu. Vui lòng thử lại.", "error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section id="data" className="scroll-mt-6">
      <Card allowOverflow className={cn(popoverOpen && "relative z-50")}>
        <CardHeader
          icon={<Database className="h-4 w-4" />}
          iconColor="emerald"
          title="Dữ liệu"
          description="Tải toàn bộ dữ liệu của bạn về máy"
        />
        <div className="flex flex-col justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center dark:border-white/10">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Xuất dữ liệu</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">CSV, Excel, PDF hoặc JSON</p>
          </div>
          <div className="relative shrink-0" ref={popoverRef}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPopoverOpen((v) => !v)}
              isLoading={isLoading}
              disabled={isLoading}
            >
              {!isLoading && <Download className="h-4 w-4" />}
              Xuất
              {!isLoading && (
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", popoverOpen && "rotate-180")} />
              )}
            </Button>

            {popoverOpen && (
              <div className="absolute right-0 bottom-full z-30 mb-2 w-72 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-white/10 dark:bg-slate-900">
                {FORMAT_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleExport(opt.value)}
                      className="flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{opt.label}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{opt.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Card>
    </section>
  );
}
