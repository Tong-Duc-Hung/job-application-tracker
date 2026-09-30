import { notFound } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import * as applicationService from "@/features/applications/application.service";
import { ApplicationDetail } from "@/features/applications/components/ApplicationDetail";

/**
 * Điểm vào của route `/applications/:id`; tải sẵn dữ liệu ở server rồi giao cho `ApplicationDetail` hiển thị. Trả 404 nếu chưa đăng nhập hoặc đơn không tồn tại/không thuộc về người dùng.
 */
export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return notFound();

  const application = await applicationService.getApplication(user.id, id);
  if (!application) return notFound();

  return <ApplicationDetail application={application} />;
}
