import { cn } from "@/shared/utils/cn";
import type { ApplicationStatus, Priority, InterviewType, InterviewResult } from "@prisma/client";

/** Bảng màu nền/chữ dùng chung cho mọi loại badge trong ứng dụng. */
const colorClasses = {
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  zinc: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  sky: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  violet: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  orange: "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  green: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  red: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
} as const;

type BadgeColor = keyof typeof colorClasses;

/** Badge chung, hiển thị nội dung tùy ý với một trong các màu của `colorClasses`. */
export function Badge({ children, color = "slate" }: { children: React.ReactNode; color?: BadgeColor }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium", colorClasses[color])}>
      {children}
    </span>
  );
}

/** Màu badge tương ứng với từng trạng thái đơn ứng tuyển. */
const statusColor: Record<ApplicationStatus, BadgeColor> = {
  APPLIED: "sky",
  REVIEWING: "cyan",
  INTERVIEWING: "amber",
  AWAITING_RESULT: "orange",
  OFFER: "emerald",
  ACCEPTED: "green",
  REJECTED: "red",
  WITHDRAWN: "slate",
  EXPIRED: "rose",
};

/** Nhãn tiếng Việt tương ứng với từng trạng thái đơn ứng tuyển. */
const statusLabel: Record<ApplicationStatus, string> = {
  APPLIED: "Đã ứng tuyển",
  REVIEWING: "Đang xét duyệt",
  INTERVIEWING: "Phỏng vấn",
  AWAITING_RESULT: "Chờ kết quả",
  OFFER: "Offer",
  ACCEPTED: "Đã nhận việc",
  REJECTED: "Bị từ chối",
  WITHDRAWN: "Đã rút đơn",
  EXPIRED: "Quá hạn",
};

/** Badge hiển thị trạng thái đơn ứng tuyển. */
export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge color={statusColor[status]}>{statusLabel[status]}</Badge>;
}

/** Màu badge tương ứng với từng mức độ ưu tiên. */
const priorityColor: Record<Priority, BadgeColor> = {
  LOW: "slate",
  MEDIUM: "amber",
  HIGH: "red",
};

/** Nhãn tiếng Việt tương ứng với từng mức độ ưu tiên. */
const priorityLabel: Record<Priority, string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
};

/** Badge hiển thị mức độ ưu tiên. */
export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge color={priorityColor[priority]}>{priorityLabel[priority]}</Badge>;
}

/** Màu badge tương ứng với từng loại phỏng vấn. */
const typeColor: Record<InterviewType, BadgeColor> = {
  HR: "violet",
  ONLINE_ASSESSMENT: "cyan",
  TECHNICAL: "sky",
  MANAGER: "indigo",
  FINAL: "amber",
  OTHER: "slate",
};

/** Nhãn tiếng Việt tương ứng với từng loại phỏng vấn. */
const typeLabel: Record<InterviewType, string> = {
  HR: "Vòng HR",
  ONLINE_ASSESSMENT: "Bài test online",
  TECHNICAL: "Vòng kỹ thuật",
  MANAGER: "Vòng quản lý",
  FINAL: "Vòng cuối",
  OTHER: "Khác",
};

/** Badge hiển thị loại phỏng vấn. */
export function TypeBadge({ type }: { type: InterviewType }) {
  return <Badge color={typeColor[type]}>{typeLabel[type]}</Badge>;
}

/** Màu badge tương ứng với từng kết quả phỏng vấn. */
const resultColor: Record<InterviewResult, BadgeColor> = {
  PENDING: "amber",
  PASSED: "green",
  FAILED: "red",
  CANCELLED: "slate",
  NO_SHOW: "rose",
};

/** Nhãn tiếng Việt tương ứng với từng kết quả phỏng vấn. */
const resultLabel: Record<InterviewResult, string> = {
  PENDING: "Sắp diễn ra",
  PASSED: "Đạt",
  FAILED: "Không đạt",
  CANCELLED: "Đã hủy",
  NO_SHOW: "Vắng mặt",
};

/** Badge hiển thị kết quả phỏng vấn. */
export function ResultBadge({ result }: { result: InterviewResult }) {
  return <Badge color={resultColor[result]}>{resultLabel[result]}</Badge>;
}

export { statusLabel, priorityLabel, typeLabel, resultLabel, statusColor };
