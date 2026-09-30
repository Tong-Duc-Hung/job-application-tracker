import { notFound } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import * as interviewService from "@/features/interviews/interview.service";
import { InterviewDetail } from "@/features/interviews/components/InterviewDetail";

/**
 * Điểm vào của route `/interviews/:id`; tải sẵn dữ liệu ở server rồi giao cho `InterviewDetail` hiển thị. Trả 404 nếu chưa đăng nhập hoặc buổi phỏng vấn không tồn tại/không thuộc về người dùng.
 */
export default async function InterviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return notFound();

  const interview = await interviewService.getInterview(user.id, id);
  if (!interview) return notFound();

  return <InterviewDetail interview={interview} />;
}