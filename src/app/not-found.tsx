import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/shared/ui/Button";

/** Trang 404 mặc định của Next.js, hiện khi không khớp route nào hoặc khi gọi `notFound()`. */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center dark:bg-slate-950">
      <FileQuestion className="h-10 w-10 text-slate-300" />
      <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Không tìm thấy trang</h1>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        Trang bạn tìm không tồn tại, hoặc bạn không có quyền truy cập.
      </p>
      <Link href="/dashboard">
        <Button variant="outline">Về trang Tổng quan</Button>
      </Link>
    </div>
  );
}
