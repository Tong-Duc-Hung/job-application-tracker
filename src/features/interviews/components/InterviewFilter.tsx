"use client";

import { Search, SlidersHorizontal, ArrowUpDown, Check } from "lucide-react";
import { Select } from "@/shared/ui/Input";
import { interviewTypeValues, interviewResultValues } from "../interview.schema";
import { typeLabel, resultLabel } from "@/shared/ui/Badge";
import { cn } from "@/shared/utils/cn";
import { usePopover } from "@/shared/hooks/usePopover";

/** Trạng thái bộ lọc/sắp xếp của trang danh sách phỏng vấn, đồng bộ hai chiều với query string trên URL. */
export interface InterviewFilterValue {
  search: string;
  type: string;
  result: string;
  applicationId: string;
  sortDir: "asc" | "desc";
}

/** Tùy chọn lọc theo loại phỏng vấn, kèm mục "Tất cả" ở đầu danh sách. */
const typeOptions = [
  { label: "Tất cả loại phỏng vấn", value: "" },
  ...interviewTypeValues.map((value) => ({ value, label: typeLabel[value] })),
];

/** Tùy chọn lọc theo kết quả phỏng vấn, kèm mục "Tất cả" ở đầu danh sách. */
const resultOptions = [
  { label: "Tất cả kết quả", value: "" },
  ...interviewResultValues.map((value) => ({ value, label: resultLabel[value] })),
];

/** Hai chiều sắp xếp theo thời gian diễn ra. */
const sortOptions: { label: string; value: "asc" | "desc" }[] = [
  { label: "Sắp diễn ra trước", value: "asc" },
  { label: "Xa nhất trước", value: "desc" },
];

/**
 * Thanh tìm kiếm, sắp xếp và bộ lọc (đơn ứng tuyển, loại, kết quả) ở đầu trang danh sách phỏng vấn.
 *
 * @property applicationOptions Danh sách đơn ứng tuyển để đổ vào bộ lọc "Đơn ứng tuyển"; trang cha chịu
 * trách nhiệm tải danh sách này độc lập với dữ liệu đang hiển thị, để dropdown không tự co lại sau khi lọc.
 */
export function InterviewFilter({
  value,
  onChange,
  applicationOptions,
}: {
  value: InterviewFilterValue;
  onChange: (value: InterviewFilterValue) => void;
  applicationOptions: { label: string; value: string }[];
}) {
  const { open: filterOpen, setOpen: setFilterOpen, ref: filterRef } = usePopover<HTMLDivElement>();
  const { open: sortOpen, setOpen: setSortOpen, ref: sortRef } = usePopover<HTMLDivElement>();

  const activeCount = [value.type, value.result, value.applicationId].filter(Boolean).length;
  const currentSortLabel = sortOptions.find((o) => o.value === value.sortDir)?.label ?? "Sắp xếp";

  /** Xóa các điều kiện lọc (loại, kết quả, đơn ứng tuyển), giữ nguyên từ khóa tìm kiếm và cách sắp xếp. */
  function clearFilters() {
    onChange({ ...value, type: "", result: "", applicationId: "" });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          placeholder="Tìm theo tên công ty hoặc tiêu đề…"
          className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/80 pl-10 pr-3 text-sm placeholder:text-slate-400 transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-400 dark:focus:bg-white/10"
        />
      </div>

      <div className="relative shrink-0" ref={sortRef}>
        <button
          type="button"
          onClick={() => setSortOpen((v) => !v)}
          aria-expanded={sortOpen}
          aria-label="Sắp xếp"
          title="Sắp xếp"
          className={cn(
            "flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors",
            sortOpen
              ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300"
              : "border-slate-200 bg-slate-50/80 text-slate-600 hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          )}
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{currentSortLabel}</span>
        </button>

        {sortOpen && (
          <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-white/10 dark:bg-slate-900">
            {sortOptions.map((opt) => {
              const active = value.sortDir === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange({ ...value, sortDir: opt.value });
                    setSortOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    active
                      ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"
                  )}
                >
                  {opt.label}
                  {active && <Check className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="relative shrink-0" ref={filterRef}>
        <button
          type="button"
          onClick={() => setFilterOpen((v) => !v)}
          aria-expanded={filterOpen}
          aria-label="Bộ lọc"
          title="Bộ lọc"
          className={cn(
            "relative flex h-10 w-10 items-center justify-center rounded-lg border transition-colors",
            filterOpen || activeCount > 0
              ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300"
              : "border-slate-200 bg-slate-50/80 text-slate-500 hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-medium text-white">
              {activeCount}
            </span>
          )}
        </button>

        {filterOpen && (
          <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-lg dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-900 dark:text-white">Bộ lọc</p>
              {activeCount > 0 && (
                <button
                  onClick={clearFilters}
                  type="button"
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>

            <div className="mt-3 flex flex-col gap-3">
              <Select
                label="Đơn ứng tuyển"
                options={[{ label: "Tất cả đơn ứng tuyển", value: "" }, ...applicationOptions]}
                value={value.applicationId}
                onChange={(e) => onChange({ ...value, applicationId: e.target.value })}
              />
              <Select
                label="Loại phỏng vấn"
                options={typeOptions}
                value={value.type}
                onChange={(e) => onChange({ ...value, type: e.target.value })}
              />
              <Select
                label="Kết quả"
                options={resultOptions}
                value={value.result}
                onChange={(e) => onChange({ ...value, result: e.target.value })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
