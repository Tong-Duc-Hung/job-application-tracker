"use client";

import type { ApplicationStatus, Priority } from "@prisma/client";
import { Card, CardHeader } from "@/shared/ui/Card";
import { priorityLabel, statusLabel } from "@/shared/ui/Badge";
import {
  Kpi,
  PieBreakdownChart,
  RingKpi,
  SectionLabel,
  TimeSeriesChart,
  percent,
} from "./StatChartPrimitives";

/** Dữ liệu thống kê đơn ứng tuyển, khớp với kết quả trả về của `getApplicationStatistics`. */
type ApplicationStatsData = {
  total: number;
  byStatus: { status: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  monthly: { month: string; count: number }[];
  daily: { month: string; count: number }[];
  active: number;
  interviewing: number;
  responded: number;
  offers: number;
  withInterviews: number;
};

/** Màu biểu đồ cho từng trạng thái đơn ứng tuyển. */
const STATUS_COLORS: Record<string, string> = {
  APPLIED: "#2f9bf0",
  REVIEWING: "#8b5cf6",
  INTERVIEWING: "#f59e0b",
  AWAITING_RESULT: "#06b6d4",
  OFFER: "#4ade80",
  ACCEPTED: "#16a34a",
  REJECTED: "#f2545b",
  WITHDRAWN: "#475569",
  EXPIRED: "#e11d48",
};

/** Màu biểu đồ cho từng mức độ ưu tiên. */
const PRIORITY_COLORS: Record<string, string> = {
  HIGH: "#f2545b",
  MEDIUM: "#2f9bf0",
  LOW: "#3ddc84",
};

/**
 * Toàn bộ khối biểu đồ thống kê đơn ứng tuyển: 4 thẻ KPI, hai biểu đồ tròn (trạng thái, độ ưu tiên)
 * và một biểu đồ theo thời gian.
 *
 * @param periodLabel Nhãn khoảng thời gian đang xem, hiển thị cạnh tiêu đề (ví dụ "30 ngày qua").
 */
export function ApplicationChart({ data, periodLabel }: { data: ApplicationStatsData; periodLabel: string }) {
  const timeMode = data.monthly.length <= 7 ? "bar" : "line";

  const statusTotal = data.byStatus.reduce((sum, item) => sum + item.count, 0);
  const priorityTotal = data.byPriority.reduce((sum, item) => sum + item.count, 0);

  const statusData = data.byStatus
    .filter((item) => item.count > 0)
    .map((item) => ({
      name: statusLabel[item.status as ApplicationStatus] ?? item.status,
      value: item.count,
      key: item.status,
    }))
    // Sắp xếp giảm dần để nhóm lớn nhất luôn đọc trước tiên — cả trong biểu đồ tròn
    // (múi lớn nhất bắt đầu từ vị trí 12 giờ, đi theo chiều kim đồng hồ) lẫn trong
    // danh sách chi tiết bên dưới nó.
    .sort((a, b) => b.value - a.value);

  const priorityData = data.byPriority
    .filter((item) => item.count > 0)
    .map((item) => ({
      name: priorityLabel[item.priority as Priority] ?? item.priority,
      value: item.count,
      key: item.priority,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="flex flex-col gap-4">
      <SectionLabel meta={periodLabel}>Toàn cảnh hồ sơ</SectionLabel>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Tổng số đơn" value={data.total} note="Tất cả trạng thái" accent="#2f9bf0" />
        <Kpi label="Số đơn còn lại" value={data.active} note={`/ ${data.total} tổng số đơn`} accent="#0ea5e9" />
        <Kpi label="Số đơn có phỏng vấn" value={data.withInterviews} note={`/ ${data.total} đơn`} accent="#f59e0b" />
        <RingKpi
          label="Tỷ lệ nhận offer"
          value={data.offers}
          note={`/ ${data.total} đơn`}
          pct={percent(data.offers, data.total)}
          color="#10b981"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Theo trạng thái" description="Phân bổ toàn bộ quy trình tuyển dụng" />
          <PieBreakdownChart
            data={statusData}
            total={statusTotal}
            getColor={(key) => STATUS_COLORS[key] ?? "#0284c7"}
            unitLabel="đơn ứng tuyển"
          />
        </Card>
        <Card>
          <CardHeader title="Theo độ ưu tiên" description="Mức độ cần tập trung" />
          <PieBreakdownChart
            data={priorityData}
            total={priorityTotal}
            getColor={(key) => PRIORITY_COLORS[key] ?? "#94a3b8"}
            unitLabel="đơn ứng tuyển"
          />
        </Card>
      </div>

      <Card>
        <CardHeader title="Số đơn theo thời gian" description="Theo dõi nhịp ứng tuyển" />
        <TimeSeriesChart mode={timeMode} monthly={data.monthly} daily={data.daily} label="Đơn ứng tuyển" color="#0284c7" />
      </Card>
    </div>
  );
}