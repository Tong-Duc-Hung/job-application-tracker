import { useEffect, useRef, useState } from "react";

/**
 * Hook dùng chung cho các popover dạng dropdown: quản lý trạng thái mở/đóng, đóng khi bấm ra ngoài
 * và khi nhấn phím Escape. Các listener chỉ được gắn khi popover đang mở.
 *
 * @typeParam T Kiểu phần tử gốc của popover (mặc định `HTMLDivElement`).
 * @returns `open`, `setOpen` và `ref` cần gắn vào phần tử gốc để nhận biết thao tác bấm ra ngoài.
 */
export function usePopover<T extends HTMLElement = HTMLDivElement>() {
  const [open, setOpen] = useState(false);
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!open) return;
    /** Đóng popover khi người dùng bấm chuột ra ngoài phần tử gốc. */
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    /** Đóng popover khi nhấn phím Escape. */
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return { open, setOpen, ref };
}
