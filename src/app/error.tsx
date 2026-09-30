"use client";

import { useEffect } from "react";
import { Button } from "@/shared/ui/Button";

/**
 * Màn hình lỗi toàn cục của Next.js, hiện khi một Server Component hoặc Client Component ném lỗi
 * chưa được xử lý trong quá trình render. Ghi lỗi ra console để debug; `reset()` do Next.js cung cấp,
 * thử render lại cây component mà không cần tải lại toàn bộ trang.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center dark:bg-slate-950">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Đã có lỗi xảy ra</h2>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        Có lỗi không mong muốn xảy ra. Bạn có thể thử lại, nếu vẫn lỗi hãy tải lại trang.
      </p>
      <Button onClick={() => reset()}>Thử lại</Button>
    </div>
  );
}
