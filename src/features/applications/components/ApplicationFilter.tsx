"use client";

import { Search, SlidersHorizontal, ArrowUpDown, Check } from "lucide-react";
import { Select } from "@/shared/ui/Input";
import { applicationStatusValues, priorityValues } from "../application.schema";
import { statusLabel, priorityLabel } from "@/shared/ui/Badge";
import { cn } from "@/shared/utils/cn";
import { usePopover } from "@/shared/hooks/usePopover";

/**
 * Trạng thái bộ lọc/sắp xếp của trang danh sách đơn ứng tuyển, đồng bộ hai chiều với query string trên URL.
 */
export interface ApplicationFilterValue {
  search: string;
  status: string;
  priority: string;
  sortBy: string;
  sortDir: string;
}

/** Tùy chọn lọc theo trạng thái, kèm mục "Tất cả" ở đầu danh sách. */
const statusOptions = [
  { label: "Tất cả trạng thái", value: "" },
  ...applicationStatusValues.map((value) => ({ value, label: statusLabel[value] })),
];

/** Tùy chọn lọc theo độ ưu tiên, kèm mục "Tất cả" ở đầu danh sách. */
const priorityOptions = [
  { label: "Tất cả độ ưu tiên", value: "" },
  ...priorityValues.map((value) => ({ value, label: priorityLabel[value] })),
];

/**
 * Các cách sắp xếp được hỗ trợ, mỗi mục gộp `sortBy` và `sortDir` thành một giá trị duy nhất (`field:direction`) để hiển thị trong một dropdown.
 */
const sortOptions = [
  { label: "Mới nhất", value: "createdAt:desc" },
  { label: "Cũ nhất", value: "createdAt:asc" },
  { label: "Tên công ty (A–Z)", value: "company:asc" },
  { label: "Tên công ty (Z–A)", value: "company:desc" },
  { label: "Ngày ứng tuyển (mới nhất)", value: "appliedDate:desc" },
  { label: "Ngày ứng tuyển (cũ nhất)", value: "appliedDate:asc" },
  { label: "Hạn chót (gần nhất)", value: "deadline:asc" },
];

/** Thanh tìm kiếm, sắp xếp và bộ lọc (trạng thái, độ ưu tiên) ở đầu trang danh sách đơn ứng tuyển. */
export function ApplicationFilter({
  value,
  onChange,
}: {
  value: ApplicationFilterValue;
  onChange: (value: ApplicationFilterValue) => void;
}) {
  const { open: filterOpen, setOpen: setFilterOpen, ref: filterRef } = usePopover<HTMLDivElement>();
  const { open: sortOpen, setOpen: setSortOpen, ref: sortRef } = usePopover<HTMLDivElement>();

  const activeCount = [value.status, value.priority].filter(Boolean).length;
  const currentSortLabel =
    sortOptions.find((o) => o.value === `${value.sortBy}:${value.sortDir}`)?.label ?? "Sắp xếp";

  /** Xóa các điều kiện lọc (trạng thái, độ ưu tiên), giữ nguyên từ khóa tìm kiếm và cách sắp xếp. */
  function clearFilters() {
    onChange({ ...value, status: "", priority: "" });
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          placeholder="Tìm theo tên công ty hoặc vị trí…"
          className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-400"
        />
      </div>

      <div className="relative shrink-0" ref={sortRef}>
        <button
          onClick={() => setSortOpen((v) => !v)}
          aria-expanded={sortOpen}
          aria-label="Sắp xếp"
          title="Sắp xếp"
          className={cn(
            "flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors",
            sortOpen
              ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300"
              : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          )}
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{currentSortLabel}</span>
        </button>

        {sortOpen && (
          <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-white/10 dark:bg-slate-900">
            {sortOptions.map((opt) => {
              const active = `${value.sortBy}:${value.sortDir}` === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    const [sortBy, sortDir] = opt.value.split(":");
                    onChange({ ...value, sortBy, sortDir });
                    setSortOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm",
                    active
                      ? "font-medium text-brand-700 dark:text-brand-300"
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
          onClick={() => setFilterOpen((v) => !v)}
          aria-expanded={filterOpen}
          aria-label="Bộ lọc"
          title="Bộ lọc"
          className={cn(
            "relative flex h-10 w-10 items-center justify-center rounded-lg border transition-colors",
            filterOpen || activeCount > 0
              ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300"
              : "border-slate-300 bg-white text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
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
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>

            <div className="mt-3 flex flex-col gap-3">
              <Select
                label="Trạng thái"
                options={statusOptions}
                value={value.status}
                onChange={(e) => onChange({ ...value, status: e.target.value })}
              />
              <Select
                label="Độ ưu tiên"
                options={priorityOptions}
                value={value.priority}
                onChange={(e) => onChange({ ...value, priority: e.target.value })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
