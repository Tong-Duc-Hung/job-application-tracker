"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Text, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/shared/ui/Card";
import { CircularProgress } from "@/shared/ui/CircularProgress";

/** Màu lưới nền dùng chung cho các biểu đồ dạng cột/vùng. */
export const GRID = "rgba(148, 163, 184, 0.2)";

/**
 * Tính phần trăm, làm tròn về số nguyên gần nhất, an toàn khi `total` bằng 0.
 *
 * @returns 0 nếu `total` bằng 0, ngược lại là phần trăm đã làm tròn.
 */
export function percent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

/**
 * Rút gọn nhãn trục X: `dd/MM/yyyy` → `dd/MM`, `MM/yyyy` giữ nguyên, `yyyy` giữ nguyên; chuỗi không
 * khớp định dạng nào được giữ nguyên.
 *
 * @param raw Nhãn gốc từ dữ liệu biểu đồ (khóa `month` trả về từ tầng thống kê).
 */
export function formatAxisTick(raw: string): string {
  const numeric = raw.replace(/^[^\d]*/, "").trim();

  const dayMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(numeric);
  if (dayMatch) {
    const [, day, month] = dayMatch;
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}`;
  }

  const monthMatch = /^(\d{1,2})\/(\d{4})$/.exec(numeric);
  if (monthMatch) {
    const [, month, year] = monthMatch;
    return `${month.padStart(2, "0")}/${year}`;
  }

  const yearMatch = /^(\d{4})$/.exec(numeric);
  if (yearMatch) {
    return yearMatch[1];
  }

  return raw;
}

/**
 * Tooltip dùng chung cho mọi biểu đồ recharts trong trang Thống kê, tùy chọn hiển thị thêm phần trăm trên tổng nếu có `total`.
 */
function ChartTooltip({
  active,
  payload,
  label,
  total,
  formatLabel,
}: {
  active?: boolean;
  payload?: { value?: number; color?: string; fill?: string; payload?: { name?: string } }[];
  label?: string;
  total?: number;
  formatLabel?: (value: string) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  const value = Number(item.value ?? 0);
  const dotColor = item.color ?? item.fill ?? "#2f9bf0";
  const rawName = label ?? item.payload?.name ?? "";
  const name = formatLabel ? formatLabel(rawName) : rawName;

  return (
    <div className="rounded-lg border border-slate-700/80 bg-[#0f172a] px-3 py-2 shadow-lg shadow-black/20">
      <p className="mb-1 text-[11px] font-medium text-slate-400">{name}</p>
      <div className="flex items-center gap-1.5 text-xs">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
        <span className="font-semibold tabular-nums text-slate-50">{value}</span>
        {typeof total === "number" && total > 0 && (
          <span className="text-slate-400">· {percent(value, total)}%</span>
        )}
      </div>
    </div>
  );
}

/** Tiêu đề nhỏ, viết hoa, đứng đầu mỗi khối thống kê, kèm nhãn phụ (khoảng thời gian) căn phải. */
export function SectionLabel({ children, meta }: { children: React.ReactNode; meta?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 px-1 pt-1">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
        {children}
      </p>
      {meta && <p className="text-xs text-slate-500 dark:text-slate-400">{meta}</p>}
    </div>
  );
}

/** Dải màu nhấn dọc bên trái các thẻ KPI. */
function AccentStripe({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="absolute left-2 top-3 bottom-3 w-[3px] rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

/** Thẻ số liệu đơn giản: nhãn, giá trị lớn và ghi chú phụ. */
export function Kpi({ label, value, note, accent = "#64748b" }: { label: string; value: number; note: string; accent?: string }) {
  return (
    <Card className="relative min-h-[102px] overflow-hidden py-4 pl-5 pr-4">
      <AccentStripe color={accent} />
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">{label}</p>
      <p className="mt-2 text-3xl font-bold leading-none tabular-nums text-slate-900 dark:text-white">{value}</p>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{note}</p>
    </Card>
  );
}

/** Thẻ số liệu kèm vòng tròn tiến độ (`CircularProgress`) thể hiện tỉ lệ phần trăm. */
export function RingKpi({
  label,
  value,
  note,
  pct,
  color,
}: {
  label: string;
  value: number;
  note: string;
  pct: number;
  color: string;
}) {
  return (
    <Card className="relative flex min-h-[102px] items-center justify-between gap-3 overflow-hidden py-4 pl-5 pr-4">
      <AccentStripe color={color} />
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">{label}</p>
        <p className="mt-2 text-3xl font-bold leading-none tabular-nums text-slate-900 dark:text-white">{value}</p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{note}</p>
      </div>
      <CircularProgress percent={pct} color={color} size={52} strokeWidth={5} />
    </Card>
  );
}

/** Trạng thái hiển thị khi biểu đồ không có dữ liệu. */
export function EmptyChartState() {
  return (
    <div className="flex h-[220px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
      Chưa có dữ liệu
    </div>
  );
}

/**
 * Chuyển nhãn trục thời gian (`dd/MM/yyyy`, `MM/yyyy`, hoặc `yyyy`) thành một số thứ tự có thể so sánh được
 * (số ngày hoặc số tháng kể từ mốc chung), để `pickEvenTicks` chọn được các điểm cách đều nhau thật sự
 * trên trục thời gian thay vì chỉ cách đều theo chỉ số mảng.
 *
 * @param raw Nhãn cần phân tích.
 * @returns Số thứ tự, hoặc `null` nếu không khớp định dạng nào.
 */
function parseTickOrdinal(raw: string): number | null {
  const numeric = raw.replace(/^[^\d]*/, "").trim();

  const dayMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(numeric);
  if (dayMatch) {
    const [, day, month, year] = dayMatch;
    return Date.UTC(+year, +month - 1, +day) / 86_400_000;
  }

  const monthMatch = /^(\d{1,2})\/(\d{4})$/.exec(numeric);
  if (monthMatch) {
    const [, month, year] = monthMatch;
    return +year * 12 + (+month - 1);
  }

  const yearMatch = /^(\d{4})$/.exec(numeric);
  if (yearMatch) return +yearMatch[1] * 12;

  return null;
}

/**
 * Chọn tối đa `maxTicks` nhãn để hiển thị trên trục X, dàn đều theo thời gian thực tế (không chỉ theo
 * chỉ số điểm dữ liệu) để trục không bị dồn cụm khi khoảng cách giữa các điểm dữ liệu không đều.
 * Nếu không phân tích được toàn bộ nhãn thành số thứ tự thời gian, dùng lại cách chọn đều theo chỉ số
 * làm phương án dự phòng.
 *
 * @param chartData Dữ liệu biểu đồ theo đúng thứ tự trục X.
 * @param maxTicks Số nhãn tối đa muốn hiển thị.
 */
function pickEvenTicks(chartData: { month: string }[], maxTicks: number): string[] {
  if (chartData.length === 0) return [];
  if (chartData.length <= maxTicks) return chartData.map((point) => point.month);

  const ordinals = chartData.map((point) => parseTickOrdinal(point.month));
  const allParsed = ordinals.every((value): value is number => value !== null);

  if (allParsed) {
    const firstOrdinal = ordinals[0];
    const lastOrdinal = ordinals[ordinals.length - 1];
    const span = lastOrdinal - firstOrdinal;

    const picked: string[] = [];
    const usedIndices = new Set<number>();

    for (let i = 0; i < maxTicks; i++) {
      const targetOrdinal = firstOrdinal + (i * span) / (maxTicks - 1);

      let bestIndex = 0;
      let bestDistance = Infinity;
      for (let j = 0; j < ordinals.length; j++) {
        const distance = Math.abs((ordinals[j] as number) - targetOrdinal);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = j;
        }
      }

      if (!usedIndices.has(bestIndex)) {
        usedIndices.add(bestIndex);
        picked.push(chartData[bestIndex].month);
      }
    }

    return picked;
  }

  const lastIndex = chartData.length - 1;
  const step = lastIndex / (maxTicks - 1);
  const indices = new Set<number>();
  for (let i = 0; i < maxTicks; i++) {
    indices.add(Math.round(i * step));
  }
  return Array.from(indices)
    .sort((a, b) => a - b)
    .map((index) => chartData[index].month);
}

/**
 * Renderer tùy biến cho nhãn trục X: canh trái nhãn đầu tiên và canh phải nhãn cuối cùng (khi `alignEdges`
 * bật) để nhãn không bị tràn ra ngoài biểu đồ, các nhãn còn lại canh giữa như bình thường.
 */
function renderAxisTick(
  props: {
    x?: number | string;
    y?: number | string;
    verticalAnchor?: "start" | "middle" | "end";
    textAnchor?: string;
    payload?: { value?: string | number };
  },
  tickValues: string[],
  alignEdges = true,
) {
  const { x, y, verticalAnchor, payload } = props;
  const value = String(payload?.value ?? "");
  const isFirst = value === tickValues[0];
  const isLast = tickValues.length > 1 && value === tickValues[tickValues.length - 1];
  const anchor = alignEdges && isFirst ? "start" : alignEdges && isLast ? "end" : "middle";

  return (
    <Text
      x={typeof x === "number" ? x : undefined}
      y={typeof y === "number" ? y : undefined}
      verticalAnchor={verticalAnchor}
      textAnchor={anchor}
      fill="currentColor"
      fontSize={11}
    >
      {formatAxisTick(value)}
    </Text>
  );
}

/**
 * Chỉ vẽ chấm tròn tại các điểm dữ liệu trùng với nhãn đang hiển thị trên trục X (`tickValues`),
 * để biểu đồ đường không bị rối mắt bởi quá nhiều chấm khi có nhiều điểm dữ liệu.
 */
function renderLineDot(
  props: { cx?: number; cy?: number; payload?: { month?: string } },
  tickValues: string[],
  color: string,
) {
  const { cx, cy, payload } = props;
  const isTickPoint = payload?.month !== undefined && tickValues.includes(payload.month);

  if (!isTickPoint || cx === undefined || cy === undefined) {
    return <circle cx={cx ?? 0} cy={cy ?? 0} r={0} fill="none" stroke="none" />;
  }

  return <circle cx={cx} cy={cy} r={3.5} fill={color} stroke="#0f172a" strokeWidth={1.5} />;
}

/**
 * Biểu đồ số lượng theo thời gian: dạng cột khi ≤ 12 điểm dữ liệu, dạng vùng (area) khi nhiều hơn.
 * Số nhãn trục X được giới hạn (9–10) và chọn dàn đều theo thời gian thực (`pickEvenTicks`) để luôn
 * đọc được dù có bao nhiêu điểm dữ liệu.
 *
 * LƯU Ý: chỉ đọc `monthly`; tham số `daily` hiện không được sử dụng (xem ghi chú ở `getApplicationStatistics`).
 */
export function TimeSeriesChart({
  mode,
  monthly,
  label,
  color,
}: {
  mode: "bar" | "line";
  monthly: { month: string; count: number }[];
  daily: { month: string; count: number }[];
  label: string;
  color: string;
}) {
  const chartData = monthly;
  const desiredTickCount = chartData.length <= 12 ? chartData.length : chartData.length % 2 === 0 ? 10 : 9;
  const tickValues = pickEvenTicks(chartData, Math.min(chartData.length, desiredTickCount));

  return (
    <div className="text-slate-500 dark:text-slate-400">
      {mode === "bar" ? (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={GRID} strokeOpacity={0.8} strokeDasharray="3 3" vertical={chartData.length <= 12} />
            <XAxis
              dataKey="month"
              ticks={tickValues}
              interval={0}
              tick={(props) => renderAxisTick(props, tickValues, false)}
              axisLine={false}
              tickLine={false}
            />
            <YAxis allowDecimals={false} tick={{ fill: "currentColor", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: "rgba(148, 163, 184, 0.08)" }} content={<ChartTooltip formatLabel={formatAxisTick} />} />
            <Bar dataKey="count" name={label} fill={color} radius={[6, 6, 0, 0]} maxBarSize={42} animationDuration={350} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={GRID} strokeOpacity={0.8} strokeDasharray="3 3" vertical={chartData.length <= 12} />
            <XAxis
              dataKey="month"
              ticks={tickValues}
              interval={0}
              tick={(props) => renderAxisTick(props, tickValues)}
              axisLine={false}
              tickLine={false}
            />
            <YAxis allowDecimals={false} tick={{ fill: "currentColor", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ stroke: color, strokeOpacity: 0.3 }} content={<ChartTooltip formatLabel={formatAxisTick} />} />
            <Area
              dataKey="count"
              name={label}
              stroke={color}
              strokeWidth={2}
              fill={color}
              fillOpacity={0.12}
              dot={(props: any) => renderLineDot(props, tickValues, color)}
              activeDot={{ r: 4 }}
              animationDuration={350}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/**
 * Ngưỡng phần trăm tối thiểu để một múi biểu đồ tròn được gắn nhãn số liệu ngay trên múi (múi quá nhỏ sẽ không đủ chỗ hiển thị chữ).
 */
const PIE_LABEL_MIN_PERCENT = 10;

/**
 * Tạo hàm vẽ nhãn phần trăm cho từng múi biểu đồ tròn.
 * Chỉ 1 múi (100%): nhãn ở chính giữa vòng tròn. Đúng 2 múi: luôn hiển thị cả hai nhãn để dễ so sánh.
 * Từ 3 múi trở lên: chỉ hiển thị nhãn cho múi đủ lớn (từ `PIE_LABEL_MIN_PERCENT` trở lên), tránh chữ
 * chồng chéo ở các múi nhỏ.
 *
 * @param totalSlices Tổng số múi đang hiển thị.
 */
function makePieSliceLabelRenderer(totalSlices: number) {
  return function renderPieSliceLabel(props: {
    cx?: number;
    cy?: number;
    midAngle?: number;
    innerRadius?: number;
    outerRadius?: number;
    percent?: number;
  }) {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent: fraction } = props;
    if (
      cx === undefined ||
      cy === undefined ||
      midAngle === undefined ||
      innerRadius === undefined ||
      outerRadius === undefined ||
      fraction === undefined
    ) {
      return null;
    }
    const pct = Math.round(fraction * 100);

    if (totalSlices === 1) {
      return (
        <text x={cx} y={cy} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight={700}>
          {pct}%
        </text>
      );
    }

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.62;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (totalSlices === 2) {
      return (
        <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
          {pct}%
        </text>
      );
    }

    if (pct < PIE_LABEL_MIN_PERCENT) return null;

    return (
      <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
        {pct}%
      </text>
    );
  };
}

/**
 * Biểu đồ tròn kèm chú giải chi tiết bên cạnh (tên, số lượng, phần trăm cho từng mục); ẩn hẳn nếu không có mục nào có giá trị dương.
 */
export function PieBreakdownChart({
  data,
  total,
  getColor,
  unitLabel,
}: {
  data: { name: string; value: number; key: string }[];
  total: number;
  getColor: (key: string) => string;
  unitLabel: string;
}) {
  const visibleData = data.filter((item) => item.value > 0);
  if (!visibleData.length) return <EmptyChartState />;

  return (
    <div className="flex items-center justify-center gap-6">
      <div className="h-[184px] w-[184px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={visibleData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={88}
              paddingAngle={0}
              label={makePieSliceLabelRenderer(visibleData.length)}
              labelLine={false}
              animationDuration={350}
            >
              {visibleData.map((item) => (
                <Cell key={item.key} fill={getColor(item.key)} stroke="none" />
              ))}
            </Pie>
            <Tooltip cursor={false} content={<ChartTooltip total={total} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex min-w-0 max-w-[260px] flex-col gap-2.5">
        {visibleData.map((item) => (
          <div key={item.key} className="flex items-start gap-2 text-[13px]">
            <span
              className="mt-[3px] h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: getColor(item.key) }}
            />
            <p className="min-w-0 flex-1 leading-snug text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-white">{item.name}</span>
              {": "}
              <span className="font-bold tabular-nums text-slate-900 dark:text-white">{item.value}</span>{" "}
              {unitLabel}{" "}
              <span className="font-medium text-slate-500 dark:text-slate-400">
                ({percent(item.value, total)}%)
              </span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
