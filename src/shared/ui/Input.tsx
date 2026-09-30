"use client";

import { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, forwardRef, useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/shared/utils/cn";

/** Props chung cho phần khung của một trường form: nhãn, lỗi, gợi ý, bắt buộc và class bọc ngoài. */
interface FieldWrapperProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  containerClassName?: string;
}

/**
 * Khung dùng chung cho `Input`, `Textarea` và `Select`: hiển thị nhãn, nội dung điều khiển và dòng lỗi/gợi ý bên dưới.
 */
function FieldChrome({
  label,
  error,
  hint,
  required,
  containerClassName,
  htmlFor,
  children,
}: FieldWrapperProps & { htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1.5", containerClassName)}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
          {required && <span aria-hidden="true" className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Lớp CSS nền tảng dùng chung cho ô nhập và nút giả lập của `Select`, để giao diện đồng nhất giữa các loại trường.
 */
const fieldBase =
  "h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500";

interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FieldWrapperProps {}

/**
 * Ô nhập văn bản chuẩn, bọc `FieldChrome`. Tự sinh `id` từ `name` (hoặc `useId()`) nếu không truyền `id` tường minh, để `label` luôn liên kết đúng.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, required, containerClassName, id, name, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? name ?? generatedId;
    return (
      <FieldChrome label={label} error={error} hint={hint} required={required} containerClassName={containerClassName} htmlFor={inputId}>
        <input
          ref={ref}
          id={inputId}
          name={name}
          className={cn(
            fieldBase,
            error
              ? "border-red-300 focus:ring-red-500/30 dark:border-red-500/50"
              : "border-slate-300 focus:border-brand-500 dark:border-white/10 dark:focus:border-brand-400",
            className
          )}
          {...props}
        />
      </FieldChrome>
    );
  }
);
Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldWrapperProps {}

/** Ô nhập nhiều dòng, cùng cơ chế sinh `id` như `Input`. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, required, containerClassName, id, name, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? name ?? generatedId;
    return (
      <FieldChrome label={label} error={error} hint={hint} required={required} containerClassName={containerClassName} htmlFor={inputId}>
        <textarea
          ref={ref}
          id={inputId}
          name={name}
          className={cn(
            "min-h-[80px] w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40",
            "dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500",
            error
              ? "border-red-300 focus:ring-red-500/30 dark:border-red-500/50"
              : "border-slate-300 focus:border-brand-500 dark:border-white/10 dark:focus:border-brand-400",
            className
          )}
          {...props}
        />
      </FieldChrome>
    );
  }
);
Textarea.displayName = "Textarea";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, FieldWrapperProps {
  options: { label: string; value: string; colorClassName?: string }[];
  placeholder?: string;
}

/**
 * Dropdown chọn một giá trị, tự dựng giao diện (không dùng `<select>` mặc định của trình duyệt để có thể
 * hiển thị chấm màu cho từng lựa chọn — xem `colorClassName`).
 * Vẫn giữ một `<select>` thật ẩn đi (`sr-only`) để tương thích với `react-hook-form` (`register()`) và trình
 * đọc màn hình; `<select>` ẩn này được đồng bộ hai chiều với phần giao diện hiển thị.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, required, containerClassName, id, name, options, placeholder, disabled, value, defaultValue, onChange, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? name ?? generatedId;
    const [open, setOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState(String(value ?? defaultValue ?? options[0]?.value ?? ""));
    const wrapperRef = useRef<HTMLDivElement>(null);
    const selectRef = useRef<HTMLSelectElement>(null);
    const selectedOption = options.find((option) => option.value === selectedValue);

    useEffect(() => {
      /** Đóng danh sách lựa chọn khi bấm chuột ra ngoài. */
      function closeOnOutsideClick(event: MouseEvent) {
        if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setOpen(false);
      }
      document.addEventListener("mousedown", closeOnOutsideClick);
      return () => document.removeEventListener("mousedown", closeOnOutsideClick);
    }, []);

    useEffect(() => {
      if (selectRef.current?.value) setSelectedValue(selectRef.current.value);
    }, []);

    /** Gán cả ref nội bộ (để đọc/ghi giá trị `<select>` ẩn) lẫn ref được forward từ `react-hook-form`. */
    function setForwardedRef(element: HTMLSelectElement | null) {
      selectRef.current = element;
      if (typeof ref === "function") ref(element);
      else if (ref) ref.current = element;
    }

    /**
     * Chọn một lựa chọn: cập nhật giao diện, đóng danh sách, đồng bộ giá trị sang `<select>` ẩn và tự bắn
     * sự kiện `change` để `react-hook-form` nhận biết giá trị đã đổi.
     */
    function chooseOption(nextValue: string) {
      setSelectedValue(nextValue);
      setOpen(false);
      if (selectRef.current) {
        selectRef.current.value = nextValue;
        selectRef.current.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    return (
      <FieldChrome label={label} error={error} hint={hint} required={required} containerClassName={containerClassName} htmlFor={inputId}>
        <div ref={wrapperRef} className="relative">
          <select ref={setForwardedRef} id={inputId} name={name} required={required} disabled={disabled} className="sr-only" tabIndex={-1} aria-hidden="true" {...props} value={selectedValue} onChange={onChange}>
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <button
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={label}
            title={label}
            onClick={() => setOpen((isOpen) => !isOpen)}
            className={cn(
              fieldBase,
              "flex items-center justify-between text-left hover:border-slate-400 dark:hover:border-slate-600",
              open && "border-brand-500 ring-2 ring-brand-500/20 dark:border-brand-400",
              error ? "border-red-300 focus:ring-red-500/30 dark:border-red-500/50" : "border-slate-300 focus:border-brand-500 dark:border-white/10 dark:focus:border-brand-400",
              disabled && "cursor-not-allowed opacity-60",
              className
            )}
          >
            <span className={cn("truncate", !selectedOption && "text-slate-400 dark:text-slate-500")}>{selectedOption?.label ?? placeholder ?? "Chọn một mục"}</span>
            <ChevronDown aria-hidden="true" className={cn("ml-3 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200", open && "rotate-180 text-brand-600 dark:text-brand-400")} />
          </button>
          {open && (
            <div role="listbox" aria-label={label} className="absolute z-30 mt-2 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              {options.map((option) => {
                const isSelected = option.value === selectedValue;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => chooseOption(option.value)}
                    className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10", isSelected && "bg-slate-100 font-medium dark:bg-white/10")}
                  >
                    {option.colorClassName && <span className={cn("h-2 w-2 shrink-0 rounded-full bg-current", option.colorClassName)} />}
                    <span className="truncate">{option.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </FieldChrome>
    );
  }
);
Select.displayName = "Select";
