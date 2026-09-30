import type { CSSProperties } from "react";

/** Vị trí (phần trăm) và kiểu (lớn/nhỏ, ấm/lạnh) của từng ngôi sao lấp lánh nền. */
const STARS = [
  { top: "6%", left: "10%", lg: false, warm: false },
  { top: "10%", left: "34%", lg: true, warm: false },
  { top: "4%", left: "58%", lg: false, warm: true },
  { top: "8%", left: "82%", lg: true, warm: false },
  { top: "16%", left: "20%", lg: true, warm: false },
  { top: "20%", left: "46%", lg: false, warm: false },
  { top: "14%", left: "70%", lg: true, warm: false },
  { top: "22%", left: "92%", lg: false, warm: true },
  { top: "28%", left: "8%", lg: true, warm: false },
  { top: "32%", left: "30%", lg: false, warm: false },
  { top: "26%", left: "55%", lg: true, warm: false },
  { top: "34%", left: "78%", lg: true, warm: false },
  { top: "40%", left: "15%", lg: false, warm: false },
  { top: "44%", left: "40%", lg: true, warm: true },
  { top: "38%", left: "62%", lg: false, warm: false },
  { top: "46%", left: "88%", lg: true, warm: false },
  { top: "52%", left: "5%", lg: true, warm: false },
  { top: "56%", left: "26%", lg: false, warm: false },
  { top: "50%", left: "50%", lg: true, warm: false },
  { top: "58%", left: "72%", lg: false, warm: true },
  { top: "62%", left: "94%", lg: true, warm: false },
  { top: "66%", left: "18%", lg: true, warm: false },
  { top: "70%", left: "42%", lg: false, warm: false },
  { top: "64%", left: "66%", lg: true, warm: false },
  { top: "74%", left: "84%", lg: true, warm: true },
  { top: "80%", left: "12%", lg: false, warm: false },
  { top: "84%", left: "36%", lg: true, warm: false },
  { top: "88%", left: "60%", lg: false, warm: false },
  { top: "92%", left: "22%", lg: true, warm: true },
  { top: "90%", left: "78%", lg: true, warm: false },
] as const;

/** Các mốc trễ hoạt ảnh (giây) được gán xoay vòng cho từng sao, để chúng không nhấp nháy đồng loạt. */
const DELAYS = ["0s", "0.5s", "1s", "1.5s", "2s", "2.5s", "3s", "3.5s", "4s", "4.5s"];
/** Các chu kỳ hoạt ảnh (giây) được gán xoay vòng cho từng sao. */
const DURATIONS = ["3.2s", "3.6s", "4s", "4.4s", "4.8s"];

// angle = hướng bay theo trục của đoạn sao (0° là sang phải, 90° là xuống).
// 122–132° tạo đường chéo từ phía trên bên phải xuống phía dưới bên trái;
// đầu sáng nằm ở cạnh phải của đoạn và đi trước theo quỹ đạo này.
/** Vị trí, góc bay, quãng đường và thời gian của từng sao băng. */
const METEORS = [
  { top: "4%", left: "78%", variant: "md", angle: 128, distance: "16vmin", delay: "0s", duration: "9s" },
  { top: "18%", left: "66%", variant: "sm", angle: 122, distance: "13vmin", delay: "3.5s", duration: "11s" },
  { top: "34%", left: "88%", variant: "lg", angle: 132, distance: "19vmin", delay: "6.2s", duration: "8s" },
  { top: "52%", left: "72%", variant: "md", angle: 126, distance: "15vmin", delay: "1.8s", duration: "12.5s" },
] as const;

// Vài ngôi sao lấp lánh 4 cánh, sáng và chậm hơn nhóm sao chấm — điểm nhấn
// cao cấp giữa bầu trời, không lạm dụng (chỉ 4 điểm).
/** Vị trí và kích thước của 4 ngôi sao 4 cánh nổi bật, điểm nhấn giữa bầu trời sao chấm. */
const BRIGHT_STARS = [
  { top: "12%", left: "26%", size: 12, delay: "0.5s", duration: "5.5s" },
  { top: "30%", left: "58%", size: 10, delay: "2.4s", duration: "6.2s" },
  { top: "58%", left: "82%", size: 13, delay: "4.1s", duration: "5s" },
  { top: "76%", left: "30%", size: 11, delay: "1.2s", duration: "6.8s" },
] as const;

/** Icon ngôi sao 4 cánh vẽ bằng SVG, dùng cho `BRIGHT_STARS`. */
function SparkleIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 0 C12.8 6.2 13.8 9 20 12 C13.8 15 12.8 17.8 12 24 C11.2 17.8 10.2 15 4 12 C10.2 9 11.2 6.2 12 0 Z"
        fill={color}
      />
    </svg>
  );
}

/**
 * Nền bầu trời sao trang trí phía sau khối giới thiệu của trang đăng nhập/đăng ký (thuần trang trí, `aria-hidden`).
 */
export function AuthSky() {
  return (
    <div className="auth-sky pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <style>{`
        .auth-star { position: absolute; width: 2px; height: 2px; border-radius: 999px; background: #e0f2fe; box-shadow: 0 0 4px 1px rgba(224, 242, 254, 0.6); opacity: 0.2; animation: auth-star-twinkle ease-in-out infinite; }
        .auth-star--lg { width: 3px; height: 3px; background: #f8fbff; box-shadow: 0 0 6px 2px rgba(224, 242, 254, 0.75), 0 0 10px 3px rgba(56, 189, 248, 0.35); }
        .auth-star--warm { background: #ffe6c2; box-shadow: 0 0 5px 1px rgba(255, 214, 163, 0.65), 0 0 9px 2px rgba(255, 183, 94, 0.3); }
        @keyframes auth-star-twinkle { 0%, 100% { opacity: 0.15; transform: scale(0.7); } 50% { opacity: 1; transform: scale(1.2); } }

        .auth-sparkle { position: absolute; animation: auth-sparkle-pulse ease-in-out infinite; will-change: transform, opacity; }
        @keyframes auth-sparkle-pulse { 0%, 100% { opacity: 0.2; transform: scale(0.5) rotate(0deg); } 50% { opacity: 1; transform: scale(1.2) rotate(40deg); } }

        .auth-meteor {
          position: absolute;
          height: 2px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(56, 189, 248, 0) 0%, rgba(56, 189, 248, 0.5) 55%, #f0faff 100%);
          transform-origin: left center;
          /* translateX chạy DỌC THEO trục đã xoay -> hướng bay luôn = hướng đầu sáng đang chỉ */
          transform: rotate(var(--meteor-angle, 128deg)) translateX(0);
          opacity: 0;
          animation-name: auth-meteor-fall;
          animation-timing-function: ease-in;
          animation-iteration-count: infinite;
          will-change: transform, opacity;
        }
        .auth-meteor::before {
          content: "";
          position: absolute;
          left: -8px; right: 0; top: -3px; bottom: -3px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(56, 189, 248, 0) 0%, rgba(56, 189, 248, 0.3) 55%, rgba(240, 250, 255, 0.5) 100%);
          filter: blur(4px);
        }
        .auth-meteor::after {
          content: "";
          position: absolute;
          right: -1.5px; top: 50%;
          width: 5px; height: 5px; margin-top: -2.5px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 0 7px 2px rgba(240, 250, 255, 0.95), 0 0 12px 4px rgba(56, 189, 248, 0.5);
        }
        .auth-meteor--sm { width: clamp(46px, 6.5vmin, 70px); }
        .auth-meteor--md { width: clamp(62px, 8.8vmin, 96px); }
        .auth-meteor--lg { width: clamp(78px, 11vmin, 118px); }
        @keyframes auth-meteor-fall {
          0%   { transform: rotate(var(--meteor-angle, 128deg)) translateX(0); opacity: 0; }
          12%  { opacity: 1; }
          55%  { opacity: 1; }
          100% { transform: rotate(var(--meteor-angle, 128deg)) translateX(var(--meteor-distance, 15vmin)); opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) { .auth-star, .auth-sparkle, .auth-meteor { animation: none; opacity: 0.6; } }
      `}</style>

      {STARS.map((star, i) => (
        <span
          key={`star-${i}`}
          className={`auth-star${star.lg ? " auth-star--lg" : ""}${star.warm ? " auth-star--warm" : ""}`}
          style={{ top: star.top, left: star.left, animationDelay: DELAYS[i % DELAYS.length], animationDuration: DURATIONS[i % DURATIONS.length] }}
        />
      ))}
      {METEORS.map((meteor, i) => (
        <span
          key={`meteor-${i}`}
          className={`auth-meteor auth-meteor--${meteor.variant}`}
          style={{
            top: meteor.top,
            left: meteor.left,
            animationDelay: meteor.delay,
            animationDuration: meteor.duration,
            "--meteor-angle": `${meteor.angle}deg`,
            "--meteor-distance": meteor.distance,
          } as CSSProperties}
        />
      ))}
      {BRIGHT_STARS.map((star, i) => (
        <span
          key={`bright-${i}`}
          className="auth-sparkle"
          style={{ top: star.top, left: star.left, animationDelay: star.delay, animationDuration: star.duration, filter: "drop-shadow(0 0 6px rgba(234, 252, 255, 0.9))" }}
        >
          <SparkleIcon size={star.size} color="#eafcff" />
        </span>
      ))}
    </div>
  );
}