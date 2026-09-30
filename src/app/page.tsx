import { redirect } from "next/navigation";
import { getSession } from "@/shared/auth/session";

/**
 * Trang gốc (`/`): không hiển thị gì, chỉ điều hướng tới `/dashboard` nếu đã đăng nhập hoặc `/login` nếu chưa.
 */
export default async function RootPage() {
  const session = await getSession();
  redirect(session ? "/dashboard" : "/login");
}
