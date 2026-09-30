import Image from "next/image";
import Link from "next/link";
import { BriefcaseBusiness, CalendarDays, ChartNoAxesCombined, ClipboardCheck, Check } from "lucide-react";

interface AuthHeroProps {
  title: string;
  description: string;
}

/** Danh sách lợi ích hiển thị dạng lưới icon + mô tả ở nửa trên của khối giới thiệu. */
const benefits = [
  { icon: BriefcaseBusiness, label: "Quản lý đơn ứng tuyển và trạng thái từng công việc" },
  { icon: CalendarDays, label: "Theo dõi lịch phỏng vấn và những việc cần chuẩn bị" },
  { icon: ClipboardCheck, label: "Lưu ghi chú để sẵn sàng cho mỗi buổi trao đổi" },
  { icon: ChartNoAxesCombined, label: "Nắm tiến độ tìm việc và biết bước tiếp theo" },
];

/** Ba giai đoạn của hành trình tìm việc, hiển thị dạng các bước ở khối minh họa phía dưới. */
const stages = ["Ứng tuyển", "Phỏng vấn", "Nhận offer"];

/**
 * Nội dung giới thiệu bên trái trang đăng nhập/đăng ký: logo, tiêu đề, danh sách lợi ích và minh họa các giai đoạn.
 */
export function AuthHero({ title, description }: AuthHeroProps) {
  return (
    <div className="animate-fade-up relative z-10 flex flex-1 flex-col justify-between gap-8">
      <Link href="/" className="inline-flex w-fit max-w-full shrink-0 items-center gap-5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-sky-100/20 bg-white/10 shadow-lg shadow-slate-950/20">
          <Image
            src="/icons/icon.png"
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 rounded-xl object-contain"
            priority
          />
        </span>
        <span className="whitespace-nowrap font-sans text-[18px] font-bold leading-tight tracking-[-0.025em] text-[#f1f8fc] sm:text-[19px]">
          Job Application Tracker
        </span>
      </Link>

      <div className="my-auto w-full py-2">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-sky-200 sm:text-sm">
          Đồng hành cùng bạn trên hành trình nghề nghiệp
        </p>
        <h1 className="font-sans max-w-2xl text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl xl:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200/85">{description}</p>

        <ul className="mt-6 grid w-full gap-3 sm:mt-7 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-4">
          {benefits.map(({ icon: Icon, label }) => (
            <li key={label} className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-sky-200/20 bg-sky-200/10 text-sky-200">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm leading-5 text-slate-100/85">{label}</span>
            </li>
          ))}
        </ul>

        <div className="mt-7 w-full rounded-2xl border border-sky-100/15 bg-[#0b2a40]/75 p-4 shadow-xl shadow-slate-950/15 sm:mt-8 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-200/75">Từng bước đến công việc mới</p>
              <p className="mt-1 text-base font-semibold text-white sm:text-lg">Từ ứng tuyển đến nhận offer</p>
            </div>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-300/15 text-emerald-200">
              <Check className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-4" aria-label="Từ ứng tuyển đến nhận offer">
            {stages.map((stage, index) => (
              <div key={stage} className="min-w-0">
                <div className="flex items-center">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs ${index === 2 ? "border-emerald-200/30 bg-emerald-200/15 text-emerald-100" : "border-sky-200/30 bg-sky-200/10 text-sky-100"}`}>
                    {index === 2 ? <Check className="h-3.5 w-3.5" /> : index + 1}
                  </span>
                  {index < stages.length - 1 && <span className="h-px flex-1 bg-sky-100/25" />}
                </div>
                <p className="mt-2 text-[11px] leading-4 text-slate-200/85 sm:text-xs">{stage}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="hidden text-xs leading-5 text-sky-100/70 lg:block">
        Chúc bạn vững tin, bền bỉ và sớm tìm được công việc mình yêu thích.
      </p>
    </div>
  );
}
