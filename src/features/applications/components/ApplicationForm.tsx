"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Application } from "@prisma/client";
import {
  applicationFormSchema,
  applicationStatusValues,
  priorityValues,
  type ApplicationFormInput,
  type ApplicationFormRawInput,
} from "../application.schema";
import { statusLabel, priorityLabel } from "@/shared/ui/Badge";
import { Input, Select, Textarea } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { toDateInputValue } from "@/shared/utils/formatDate";

/** Danh sách tùy chọn trạng thái cho `<Select>`, kèm màu chữ riêng cho từng trạng thái. */
const statusOptions = applicationStatusValues.map((value) => ({
  value,
  label: statusLabel[value],
  colorClassName: {
    APPLIED: "text-sky-600",
    REVIEWING: "text-cyan-600",
    INTERVIEWING: "text-amber-600",
    AWAITING_RESULT: "text-orange-600",
    OFFER: "text-emerald-600",
    ACCEPTED: "text-green-600",
    REJECTED: "text-red-600",
    WITHDRAWN: "text-slate-500",
    EXPIRED: "text-rose-600",
  }[value],
}));
/** Danh sách tùy chọn độ ưu tiên cho `<Select>`, kèm màu chữ riêng cho từng mức. */
const priorityOptions = priorityValues.map((value) => ({
  value,
  label: priorityLabel[value],
  colorClassName: { LOW: "text-slate-500", MEDIUM: "text-amber-600", HIGH: "text-red-600" }[value],
}));

/**
 * @property initialData Dữ liệu đơn có sẵn khi sửa; bỏ trống khi tạo mới.
 * @property layout `"create"` dùng ở trang tạo mới (không có id trong URL cho các mục); `"wide"` dùng khi sửa
 * (mỗi mục có id riêng để liên kết mục lục ở trang chi tiết).
 */
interface ApplicationFormProps {
  initialData?: Application | null;
  layout: "wide" | "create";
  onSubmit: (values: ApplicationFormInput) => Promise<void>;
  onCancel: () => void;
}

/** Dựng giá trị mặc định cho form: form trắng khi tạo mới, hoặc chuyển đổi từ bản ghi có sẵn khi sửa. */
function toDefaultValues(app?: Application | null): ApplicationFormInput {
  if (!app) {
    return {
      company: "",
      position: "",
      location: "",
      salary: "",
      jobUrl: "",
      priority: "MEDIUM",
      status: "APPLIED",
      appliedDate: toDateInputValue(new Date()),
      deadline: "",
      experience: "",
    };
  }
  return applicationToFormInput(app);
}

/**
 * Chuyển một bản ghi `Application` từ Prisma thành dữ liệu form (chuỗi thay vì `Date`, chuỗi rỗng thay vì `null`).
 * Cũng được `ExperienceQuickEditForm` dùng lại để tạo payload `PUT` đầy đủ khi chỉ sửa mỗi phần kinh nghiệm.
 */
export function applicationToFormInput(app: Application): ApplicationFormInput {
  return {
    company: app.company,
    position: app.position,
    location: app.location ?? "",
    salary: app.salary ?? "",
    jobUrl: app.jobUrl ?? "",
    priority: app.priority,
    status: app.status,
    appliedDate: toDateInputValue(app.appliedDate),
    deadline: toDateInputValue(app.deadline),
    experience: app.experience ?? "",
  };
}

/** Hàng nút Hủy / Lưu ở cuối form. */
function FormActions({ isSubmitting, onCancel }: { isSubmitting: boolean; onCancel: () => void }) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 dark:border-white/10 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="w-full sm:w-auto">
        Hủy
      </Button>
      <Button type="submit" isLoading={isSubmitting} className="w-full sm:w-auto">
        Lưu
      </Button>
    </div>
  );
}

/**
 * Form tạo/sửa đơn ứng tuyển.
 * Bố cục nội dung giống nhau giữa hai `layout`; chỉ khác placeholder gợi ý cho phần "Kinh nghiệm" (hướng dẫn
 * khác nhau cho lúc mới tạo và lúc đơn đã có kết quả) và việc gắn `id` cho từng khối để trang chi tiết
 * có thể cuộn/liên kết tới đúng mục.
 */
export function ApplicationForm({ initialData, layout, onSubmit, onCancel }: ApplicationFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationFormRawInput, unknown, ApplicationFormInput>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: toDefaultValues(initialData),
  });
  const isCreateLayout = layout === "create";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={layout === "wide" ? "flex flex-col gap-6" : "flex flex-col gap-5"}>
      {isCreateLayout ? (
        <div className="grid gap-x-4 gap-y-5 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Input label="Công ty" required error={errors.company?.message} {...register("company")} />
          </div>
          <div className="lg:col-span-7">
            <Input label="Vị trí" required error={errors.position?.message} {...register("position")} />
          </div>

          <div className="lg:col-span-4">
            <Input label="Địa điểm" placeholder="Hà Nội, TP.HCM, Remote…" error={errors.location?.message} {...register("location")} />
          </div>
          <div className="lg:col-span-4">
            <Input label="Mức lương" placeholder="15-20 triệu/tháng" error={errors.salary?.message} {...register("salary")} />
          </div>
          <div className="lg:col-span-4">
            <Input label="Link tin tuyển dụng" placeholder="https://…" error={errors.jobUrl?.message} {...register("jobUrl")} />
          </div>

          <div className="border-t border-slate-200 pt-4 dark:border-white/10 lg:col-span-12">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">Theo dõi hồ sơ</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Trạng thái và các mốc quan trọng</p>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500">Bắt buộc: ngày ứng tuyển</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Select label="Trạng thái" options={statusOptions} error={errors.status?.message} {...register("status")} />
              <Select label="Độ ưu tiên" options={priorityOptions} error={errors.priority?.message} {...register("priority")} />
              <Input label="Ngày ứng tuyển" type="date" required error={errors.appliedDate?.message} {...register("appliedDate")} />
              <Input label="Hạn chót" type="date" error={errors.deadline?.message} {...register("deadline")} />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 dark:border-white/10 lg:col-span-12">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Ghi chú cá nhân</p>
                <h2 className="mt-1 text-base font-semibold text-slate-900 dark:text-white">Kinh nghiệm và ghi nhớ</h2>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500">Không bắt buộc</span>
            </div>
            <Textarea label="Nội dung kinh nghiệm" placeholder="Điều cần ghi nhớ, kỹ năng cần bổ sung hoặc điều muốn chuẩn bị tốt hơn…" hint="Tối đa 2.000 ký tự" className="min-h-[104px]" error={errors.experience?.message} {...register("experience")} />
          </div>
        </div>
      ) : (
        <div className="grid gap-x-4 gap-y-5 lg:grid-cols-12">
          <div id="application-job-info" className="lg:col-span-5">
            <Input label="Công ty" required error={errors.company?.message} {...register("company")} />
          </div>
          <div className="lg:col-span-7">
            <Input label="Vị trí" required error={errors.position?.message} {...register("position")} />
          </div>

          <div className="lg:col-span-4">
            <Input label="Địa điểm" placeholder="Hà Nội, TP.HCM, Remote…" error={errors.location?.message} {...register("location")} />
          </div>
          <div className="lg:col-span-4">
            <Input label="Mức lương" placeholder="VD: 15-20 triệu/tháng hoặc thỏa thuận" error={errors.salary?.message} {...register("salary")} />
          </div>
          <div className="lg:col-span-4">
            <Input label="Link tin tuyển dụng" placeholder="https://…" error={errors.jobUrl?.message} {...register("jobUrl")} />
          </div>

          <div id="application-tracking" className="border-t border-slate-200 pt-4 dark:border-white/10 lg:col-span-12">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">Theo dõi hồ sơ</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Trạng thái và các mốc quan trọng</p>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500">Bắt buộc: ngày ứng tuyển</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Select label="Trạng thái" options={statusOptions} error={errors.status?.message} {...register("status")} />
              <Select label="Độ ưu tiên" options={priorityOptions} error={errors.priority?.message} {...register("priority")} />
              <Input label="Ngày ứng tuyển" type="date" required error={errors.appliedDate?.message} {...register("appliedDate")} />
              <Input label="Hạn chót" type="date" error={errors.deadline?.message} {...register("deadline")} />
            </div>
          </div>

          <div id="application-reflection" className="border-t border-slate-200 pt-4 dark:border-white/10 lg:col-span-12">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Ghi chú cá nhân</p>
                <h2 className="mt-1 text-base font-semibold text-slate-900 dark:text-white">Kinh nghiệm và ghi nhớ</h2>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500">Không bắt buộc</span>
            </div>
            <Textarea
              label="Nội dung kinh nghiệm"
              placeholder="Vì sao đơn này chưa thành công — thiếu kiến thức gì, chưa có kinh nghiệm thực tế ở đâu, cần chuẩn bị gì tốt hơn cho lần sau…"
              hint="Không bắt buộc — có thể bổ sung sau khi có kết quả"
              className="min-h-[104px]"
              error={errors.experience?.message}
              {...register("experience")}
            />
          </div>
        </div>
      )}

      <FormActions isSubmitting={isSubmitting} onCancel={onCancel} />
    </form>
  );
}