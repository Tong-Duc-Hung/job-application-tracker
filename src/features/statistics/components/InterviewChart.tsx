"use client";

import type { InterviewType } from "@prisma/client";
import { Card, CardHeader } from "@/shared/ui/Card";
import { typeLabel } from "@/shared/ui/Badge";
import {
  Kpi,
  PieBreakdownChart,
  RingKpi,
  SectionLabel,
  TimeSeriesChart,
} from "./StatChartPrimitives";

/** Dữ liệu thống kê phỏng vấn, khớp với kết quả trả về của `getInterviewStatistics`. */
type InterviewStatsData = {
  total: number;
  applicationTotal: number;
  applicationsWithInterviews: number;
  upcoming: number;
  passed: number;
  failed: number;
  cancelled: number;
  noShow: number;
  successRate: number;
  byType: { type: string; count: number }[];
  monthly: { month: string; count: number }[];
  daily: { month: string; count: number }[];
};

/** Màu biểu đồ dùng chung cho cả kết quả phỏng vấn và loại phỏng vấn. */
const COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  PASSED: "#10b981",
  FAILED: "#ef4444",
  CANCELLED: "#475569",
  NO_SHOW: "#be123c",
  HR: "#8b5cf6",
  ONLINE_ASSESSMENT: "#06b6d4",
  TECHNICAL: "#2f9bf0",
  MANAGER: "#f59e0b",
  FINAL: "#f43f5e",
  OTHER: "#475569",
};

/**
 * Toàn bộ khối biểu đồ thống kê phỏng vấn: 3 thẻ KPI, hai biểu đồ tròn (kết quả, loại phỏng vấn)
 * và một biểu đồ theo thời gian.
 *
 * @param periodLabel Nhãn khoảng thời gian đang xem, hiển thị cạnh tiêu đề.
 */
export function InterviewChart({ data, periodLabel }: { data: InterviewStatsData; periodLabel: string }) {
  const timeMode = data.monthly.length <= 7 ? "bar" : "line";

  const outcomes = [
    { name: "Sắp diễn ra", value: data.upcoming, key: "PENDING" },
    { name: "Đạt", value: data.passed, key: "PASSED" },
    { name: "Không đạt", value: data.failed, key: "FAILED" },
    { name: "Đã hủy", value: data.cancelled, key: "CANCELLED" },
    { name: "Vắng mặt", value: data.noShow, key: "NO_SHOW" },
  ];

  const typeData = data.byType
    .filter((item) => item.count > 0)
    .map((item) => ({
      name: typeLabel[item.type as InterviewType] ?? item.type,
      value: item.count,
      key: item.type,
    }))
    // Sắp xếp giảm dần — cùng quy tắc với "Theo trạng thái" ở tab Đơn ứng tuyển.
    .sort((a, b) => b.value - a.value);
  const typeTotal = typeData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex flex-col gap-4">
      <SectionLabel meta={periodLabel}>Toàn cảnh phỏng vấn</SectionLabel>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Kpi label="Tổng số" value={data.total} note="Tất cả lịch phỏng vấn" accent="#d97706" />
        <RingKpi
          label="Tỷ lệ đơn có phỏng vấn"
          value={data.applicationsWithInterviews}
          note={`/ ${data.applicationTotal} đơn`}
          pct={data.applicationTotal > 0 ? Math.round((data.applicationsWithInterviews / data.applicationTotal) * 100) : 0}
          color="#f59e0b"
        />
        <RingKpi
          label="Tỷ lệ đạt"
          value={data.passed}
          note={`/ ${data.passed + data.failed} có kết quả`}
          pct={data.successRate}
          color="#10b981"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Theo kết quả" description="Tình trạng của các lịch phỏng vấn" />
          <PieBreakdownChart
            data={outcomes}
            total={data.total}
            getColor={(key) => COLORS[key] ?? "#0284c7"}
            unitLabel="lịch phỏng vấn"
          />
        </Card>
        <Card>
          <CardHeader title="Theo loại phỏng vấn" description="Phân bổ các vòng trong quy trình tuyển dụng" />
          <PieBreakdownChart
            data={typeData}
            total={typeTotal}
            getColor={(key) => COLORS[key] ?? "#0284c7"}
            unitLabel="lịch phỏng vấn"
          />
        </Card>
      </div>

      <Card>
        <CardHeader title="Số lịch phỏng vấn theo thời gian" description="Theo dõi nhịp các vòng tuyển dụng" />
        <TimeSeriesChart mode={timeMode} monthly={data.monthly} daily={data.daily} label="Phỏng vấn" color="#d97706" />
      </Card>
    </div>
  );
}
