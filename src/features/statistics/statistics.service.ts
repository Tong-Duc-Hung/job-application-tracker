import "server-only";
import type { InterviewResult } from "@prisma/client";
import { refreshOverdueApplications } from "@/features/applications/application.repository";
import { prisma } from "@/shared/db/prisma";
import {
  addDays,
  addMonths,
  addYears,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  format,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";

/** Khoảng thời gian lọc thống kê; bỏ trống một hoặc cả hai đầu nghĩa là không giới hạn phía đó. */
export type StatisticsDateRange = {
  from?: Date;
  to?: Date;
};

/**
 * Thứ tự cố định để hiển thị biểu đồ trạng thái đơn, đảm bảo mọi trạng thái đều xuất hiện kể cả khi đếm được 0.
 */
const APPLICATION_STATUSES = ["APPLIED", "REVIEWING", "INTERVIEWING", "AWAITING_RESULT", "OFFER", "WITHDRAWN", "REJECTED", "ACCEPTED", "EXPIRED"];
/** Thứ tự cố định để hiển thị biểu đồ loại phỏng vấn, đảm bảo mọi loại đều xuất hiện kể cả khi đếm được 0. */
const INTERVIEW_TYPES = ["TECHNICAL", "HR", "ONLINE_ASSESSMENT", "MANAGER", "FINAL", "OTHER"];

/**
 * Chuyển `StatisticsDateRange` thành điều kiện Prisma dạng `{ gte, lt }`.
 *
 * @returns `undefined` nếu không lọc theo ngày (Prisma bỏ qua điều kiện `undefined`).
 */
function dateFilter(range: StatisticsDateRange) {
  if (!range.from && !range.to) return undefined;
  return { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lt: range.to } : {}) };
}

/**
 * Tổng hợp số liệu thống kê đơn ứng tuyển cho trang Thống kê: tổng số, phân bố theo trạng thái/độ ưu tiên,
 * biểu đồ theo tháng/ngày, số đơn đang xử lý, số đơn đang ở vòng phỏng vấn, số đơn đã có phản hồi và số lời mời.
 *
 * LƯU Ý: trường `daily` được tính (tốn thêm một truy vấn DB) nhưng hiện `TimeSeriesChart` ở client chỉ đọc `monthly`;
 * cân nhắc bỏ `daily` nếu không có kế hoạch dùng đến, để giảm một lượt truy vấn mỗi lần tải trang.
 *
 * @param range Khoảng thời gian lọc theo `appliedDate` (bỏ trống nghĩa là toàn bộ).
 */
export async function getApplicationStatistics(userId: string, range: StatisticsDateRange = {}) {
  await refreshOverdueApplications(userId);
  const appliedDate = dateFilter(range);
  const applicationWhere = { userId, ...(appliedDate ? { appliedDate } : {}) };
  const [total, byStatus, byPriority, monthly, daily, active, interviewing, withInterviews] = await Promise.all([
    prisma.application.count({ where: applicationWhere }),
    prisma.application.groupBy({
      by: ["status"],
      where: applicationWhere,
      _count: { _all: true },
    }),
    prisma.application.groupBy({
      by: ["priority"],
      where: applicationWhere,
      _count: { _all: true },
    }),
    getMonthlyCounts(userId, "application", range),
    getDailyCounts(userId, "application", range),
    prisma.application.count({
      where: {
        ...applicationWhere,
        status: { notIn: ["ACCEPTED", "REJECTED", "WITHDRAWN", "EXPIRED"] },
      },
    }),
    prisma.application.count({ where: { ...applicationWhere, status: "INTERVIEWING" } }),
    prisma.application.count({
      where: {
        ...applicationWhere,
        interviews: { some: {} },
      },
    }),
  ]);

  const statusCounts = Object.fromEntries(byStatus.map((status) => [status.status, status._count._all]));
  const responded = total - (statusCounts.APPLIED ?? 0) - (statusCounts.EXPIRED ?? 0);
  const offers = (statusCounts.OFFER ?? 0) + (statusCounts.ACCEPTED ?? 0);

  return {
    total,
    byStatus: APPLICATION_STATUSES.map((status) => ({ status, count: statusCounts[status] ?? 0 })),
    byPriority: byPriority.map((p) => ({ priority: p.priority, count: p._count._all })),
    monthly,
    daily,
    active,
    interviewing,
    responded,
    offers,
    withInterviews,
  };
}

/**
 * Gộp số lượng bản ghi (đơn ứng tuyển hoặc phỏng vấn) theo từng khoảng thời gian, tự chọn đơn vị gộp
 * để biểu đồ luôn có số điểm dữ liệu hợp lý: theo ngày nếu khoảng thời gian ≤ 31 ngày, theo tháng nếu
 * ≤ 12 tháng, còn lại gộp theo năm.
 * Nếu không truyền khoảng thời gian, biên được suy ra từ chính dữ liệu (sớm nhất/muộn nhất tìm thấy),
 * mặc định lùi về 6 tháng gần nhất khi chưa có dữ liệu nào.
 *
 * @param entity Loại bản ghi cần gộp.
 * @param range Khoảng thời gian lọc.
 */
async function getMonthlyCounts(userId: string, entity: "application" | "interview", range: StatisticsDateRange) {
  const fieldFilter = dateFilter(range);
  const dates =
    entity === "application"
      ? (await prisma.application.findMany({ where: { userId, ...(fieldFilter ? { appliedDate: fieldFilter } : {}) }, select: { appliedDate: true } })).map(
          (a) => a.appliedDate
        )
      : (
          await prisma.interview.findMany({
            where: { application: { userId }, ...(fieldFilter ? { scheduledAt: fieldFilter } : {}) },
            select: { scheduledAt: true },
          })
        ).map((i) => i.scheduledAt);

  const fallbackStart = startOfMonth(subMonths(new Date(), 5));
  const start = startOfDay(range.from ?? dates.reduce((earliest, date) => (date < earliest ? date : earliest), dates[0] ?? fallbackStart));
  const end = range.to ? startOfDay(addDays(range.to, -1)) : startOfDay(dates.reduce((latest, date) => (date > latest ? date : latest), dates[0] ?? new Date()));
  const daySpan = differenceInCalendarDays(end, start);
  const monthSpan = differenceInCalendarMonths(end, start) + 1;
  const bucketUnit = daySpan <= 31 ? "day" : monthSpan <= 12 ? "month" : "year";
  const buckets: Record<string, number> = {};

  if (bucketUnit === "day") {
    for (let date = start; date <= end; date = addDays(date, 1)) buckets[format(date, "dd/MM/yyyy")] = 0;
  } else if (bucketUnit === "month") {
    for (let date = startOfMonth(start); date <= end; date = addMonths(date, 1)) {
      buckets[format(date, "MM/yyyy")] = 0;
    }
  } else {
    for (let date = startOfYear(start); date <= end; date = addYears(date, 1)) {
      buckets[format(date, "yyyy")] = 0;
    }
  }

  for (const date of dates) {
    const key =
      bucketUnit === "day"
        ? format(date, "dd/MM/yyyy")
        : bucketUnit === "month"
          ? format(date, "MM/yyyy")
          : format(date, "yyyy");
    if (key in buckets) buckets[key] += 1;
  }

  return Object.entries(buckets).map(([month, count]) => ({ month, count }));
}

/**
 * Đếm số bản ghi theo từng ngày trong 30 ngày gần nhất (hoặc trong `range` nếu hẹp hơn).
 *
 * @param entity Loại bản ghi cần đếm.
 * @param range Khoảng thời gian lọc, giới hạn trong cửa sổ 30 ngày mặc định.
 */
async function getDailyCounts(userId: string, entity: "application" | "interview", range: StatisticsDateRange) {
  const today = startOfDay(new Date());
  const defaultFrom = subDays(today, 29);
  const from = startOfDay(range.from && range.from > defaultFrom ? range.from : defaultFrom);
  const to = range.to && range.to < addDays(today, 1) ? startOfDay(range.to) : addDays(today, 1);
  const fieldFilter = { gte: from, lt: to };
  const dates =
    entity === "application"
      ? (await prisma.application.findMany({ where: { userId, appliedDate: fieldFilter }, select: { appliedDate: true } })).map(
          (application) => application.appliedDate
        )
      : (
          await prisma.interview.findMany({
            where: { application: { userId }, scheduledAt: fieldFilter },
            select: { scheduledAt: true },
          })
        ).map((interview) => interview.scheduledAt);

  const buckets: Record<string, number> = {};
  for (let date = from; date < to; date = addDays(date, 1)) buckets[format(date, "dd/MM")] = 0;
  for (const date of dates) {
    const key = format(date, "dd/MM");
    if (key in buckets) buckets[key] += 1;
  }

  return Object.entries(buckets).map(([day, count]) => ({ month: day, count }));
}

/**
 * Tổng hợp số liệu thống kê phỏng vấn: tổng số, phân bố theo kết quả/loại phỏng vấn, biểu đồ theo tháng/ngày
 * và tỉ lệ đạt (chỉ tính trên các buổi đã có kết quả, không tính buổi còn PENDING).
 *
 * @param range Lọc interview theo `scheduledAt` và application cho các KPI theo `appliedDate` (bỏ trống nghĩa là toàn bộ).
 */
export async function getInterviewStatistics(userId: string, range: StatisticsDateRange = {}) {
  const scheduledAt = dateFilter(range);
  const interviewWhere = { application: { userId }, ...(scheduledAt ? { scheduledAt } : {}) };
  const appliedDate = dateFilter(range);
  const applicationWhere = { userId, ...(appliedDate ? { appliedDate } : {}) };
  const [total, byResult, byType, monthly, daily, applicationTotal, applicationsWithInterviews] = await Promise.all([
    prisma.interview.count({ where: interviewWhere }),
    prisma.interview.groupBy({
      by: ["result"],
      where: interviewWhere,
      _count: { _all: true },
    }),
    prisma.interview.groupBy({
      by: ["type"],
      where: interviewWhere,
      _count: { _all: true },
    }),
    getMonthlyCounts(userId, "interview", range),
    getDailyCounts(userId, "interview", range),
    prisma.application.count({ where: applicationWhere }),
    prisma.application.count({
      where: {
        ...applicationWhere,
        interviews: { some: scheduledAt ? { scheduledAt } : {} },
      },
    }),
  ]);

  const summary: Record<InterviewResult, number> = { PENDING: 0, PASSED: 0, FAILED: 0, CANCELLED: 0, NO_SHOW: 0 };
  for (const r of byResult) summary[r.result] = r._count._all;

  const decided = summary.PASSED + summary.FAILED;
  const successRate = decided > 0 ? Math.round((summary.PASSED / decided) * 100) : 0;

  return {
    total,
    applicationTotal,
    applicationsWithInterviews,
    upcoming: summary.PENDING,
    passed: summary.PASSED,
    failed: summary.FAILED,
    cancelled: summary.CANCELLED,
    noShow: summary.NO_SHOW,
    successRate,
    byType: INTERVIEW_TYPES.map((type) => ({ type, count: byType.find((item) => item.type === type)?._count._all ?? 0 })),
    monthly,
    daily,
  };
}
