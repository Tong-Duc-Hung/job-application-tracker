import { Loader2 } from "lucide-react";

/** Màn hình chờ mặc định của Next.js, tự động hiển thị trong lúc một Server Component đang tải dữ liệu. */
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
    </div>
  );
}
