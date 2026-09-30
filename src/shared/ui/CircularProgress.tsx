interface CircularProgressProps {
  percent: number;
  color: string;
  size?: number;
  strokeWidth?: number;
}

/**
 * Vòng tròn tiến độ dạng SVG (dùng cho tỉ lệ đạt phỏng vấn ở trang Thống kê).
 *
 * @property percent Phần trăm hoàn thành; tự động giới hạn trong khoảng 0–100.
 * @property color Màu nét vẽ (mã CSS bất kỳ).
 * @property size Đường kính, tính bằng pixel (mặc định 64).
 * @property strokeWidth Độ dày nét vẽ (mặc định 6).
 */
export function CircularProgress({ percent, color, size = 64, strokeWidth = 6 }: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-slate-100 dark:stroke-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">
        {clamped}%
      </span>
    </div>
  );
}
