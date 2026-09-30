import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { AuthHero } from "@/features/auth/components/AuthHero";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

/** Tiêu đề tab trình duyệt riêng cho trang đăng ký. */
export const metadata: Metadata = { title: "Đăng ký · Job Application Tracker" };

/** Trang đăng ký (`/register`). */
export default function RegisterPage() {
  return (
    <AuthShell
      hero={
        <AuthHero
          title="Bắt đầu hành trình tìm việc của bạn."
          description="Tạo không gian riêng để sắp xếp cơ hội, chuẩn bị cho phỏng vấn và tiến gần hơn đến công việc mong muốn."
        />
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
