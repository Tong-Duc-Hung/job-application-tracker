"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Interview } from "@prisma/client";
import {
  interviewFormSchema,
  interviewTypeValues,
  interviewResultValues,
  type InterviewFormInput,
  type InterviewFormRawInput,
} from "../interview.schema";
import { typeLabel, resultLabel } from "@/shared/ui/Badge";
import { Input, Select, Textarea } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { toDateTimeInputValue, toIsoFromDateTimeInput } from "@/shared/utils/formatDate";

/** Danh sách tùy chọn loại phỏng vấn cho `<Select>`. */
const typeOptions = interviewTypeValues.map((value) => ({ value, label: typeLabel[value] }));
/** Danh sách tùy chọn kết quả phỏng vấn cho `<Select>`. */
const resultOptions = interviewResultValues.map((value) => ({ value, label: resultLabel[value] }));

/** Dữ liệu rút gọn của một đơn ứng tuyển, dùng để hiển thị trong dropdown chọn đơn. */
type ApplicationOption = { id: string; company: string; position: string };

/**
 * @property lockedApplication Nếu có, form khóa cứng đơn ứng tuyển này (mở từ trang chi tiết đơn) thay vì cho chọn qua dropdown.
 */
interface InterviewFormProps {
  initialData?: Interview | null;
  lockedApplication?: ApplicationOption;
  onSubmit: (values: InterviewFormInput) => Promise<void>;
  onCancel: () => void;
}

/**
 * Dựng giá trị mặc định cho form: form trắng (có thể khóa sẵn đơn ứng tuyển) khi tạo mới, hoặc chuyển đổi từ bản ghi có sẵn khi sửa.
 */
function toDefaultValues(interview?: Interview | null, lockedId?: string): InterviewFormInput {
  if (!interview) {
    return {
      applicationId: lockedId ?? "",
      title: "",
      type: "OTHER",
      scheduledAt: toDateTimeInputValue(new Date()),
      meetingLocation: "",
      meetingUrl: "",
      result: "PENDING",
      review: "",
    };
  }
  return {
    applicationId: interview.applicationId,
    title: interview.title,
    type: interview.type,
    scheduledAt: toDateTimeInputValue(interview.scheduledAt),
    meetingLocation: interview.meetingLocation ?? "",
    meetingUrl: interview.meetingUrl ?? "",
    result: interview.result,
    review: interview.review ?? "",
  };
}

/**
 * Form tạo/sửa lịch phỏng vấn.
 * Khi không có `lockedApplication`, form tự tải danh sách đơn ứng tuyển (tối đa 100 bản ghi gần nhất)
 * để đổ vào dropdown chọn đơn.
 * Khi submit, `scheduledAt` (giá trị thô của `<input type="datetime-local">`) được chuyển sang ISO UTC
 * bằng `toIsoFromDateTimeInput` trước khi gửi lên server, để giờ phỏng vấn không bị lệch múi giờ
 * khi máy chủ chạy ở múi giờ khác người dùng.
 */
export function InterviewForm({ initialData, lockedApplication, onSubmit, onCancel }: InterviewFormProps) {
  const [applications, setApplications] = useState<ApplicationOption[]>(
    lockedApplication ? [lockedApplication] : []
  );
  const [loadingOptions, setLoadingOptions] = useState(!lockedApplication);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InterviewFormRawInput, unknown, InterviewFormInput>({
    resolver: zodResolver(interviewFormSchema),
    defaultValues: toDefaultValues(initialData, lockedApplication?.id),
  });

  useEffect(() => {
    if (initialData) reset(toDefaultValues(initialData));
  }, [initialData, reset]);

  useEffect(() => {
    if (lockedApplication) setValue("applicationId", lockedApplication.id);
  }, [lockedApplication, setValue]);

  useEffect(() => {
    if (lockedApplication) return;
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/applications?pageSize=100&sortBy=createdAt&sortDir=desc");
      if (res.ok && !cancelled) {
        const data = await res.json();
        setApplications(
          data.items.map((a: { id: string; company: string; position: string }) => ({
            id: a.id,
            company: a.company,
            position: a.position,
          }))
        );
      }
      if (!cancelled) setLoadingOptions(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [lockedApplication]);

  const applicationOptions = applications.map((a) => ({
    label: `${a.company} — ${a.position}`,
    value: a.id,
  }));

  return (
    <form
      onSubmit={handleSubmit((values) => onSubmit({ ...values, scheduledAt: toIsoFromDateTimeInput(values.scheduledAt) }))}
      className="flex flex-col"
    >
      {/* Đơn ứng tuyển */}
      <div className="mb-4 flex items-end justify-between gap-4">
        <FormSection eyebrow="Đơn ứng tuyển" title="Liên kết hồ sơ ứng viên" />
        <span className="shrink-0 text-right text-xs text-slate-400 dark:text-slate-500">
          Các trường có dấu <span className="font-semibold text-red-500">*</span> là bắt buộc
        </span>
      </div>
      <div className="mt-4">
        {lockedApplication ? (
          <div className="flex h-[42px] min-w-0 items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
            <span title={lockedApplication.company} className="min-w-0 truncate font-medium">{lockedApplication.company}</span>
            <span className="mx-1.5 shrink-0 text-slate-400 dark:text-slate-500">—</span>
            <span title={lockedApplication.position} className="min-w-0 truncate">{lockedApplication.position}</span>
            <input type="hidden" defaultValue={lockedApplication.id} {...register("applicationId")} />
          </div>
        ) : (
          <Select
            label="Chọn đơn ứng tuyển"
            required
            placeholder={loadingOptions ? "Đang tải danh sách…" : "Chọn một đơn ứng tuyển"}
            options={applicationOptions}
            error={errors.applicationId?.message}
            {...register("applicationId")}
          />
        )}
      </div>

      {/* Lịch phỏng vấn */}
      <div className="mt-8 border-t border-slate-200 pt-6 dark:border-white/10">
        <FormSection eyebrow="Lịch phỏng vấn" title="Thời gian và vòng phỏng vấn" />
        <div className="mt-4 flex flex-col gap-5">
          <Input
            label="Tiêu đề"
            placeholder="VD: Vòng phỏng vấn kỹ thuật"
            required
            error={errors.title?.message}
            {...register("title")}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select label="Loại phỏng vấn" options={typeOptions} error={errors.type?.message} {...register("type")} />
            <Input
              label="Ngày & giờ"
              type="datetime-local"
              required
              error={errors.scheduledAt?.message}
              {...register("scheduledAt")}
            />
            <Select label="Kết quả" options={resultOptions} error={errors.result?.message} {...register("result")} />
          </div>
        </div>
      </div>

      {/* Chi tiết địa điểm và nhận xét */}
      <div className="mt-8 border-t border-slate-200 pt-6 dark:border-white/10">
        <FormSection eyebrow="Lịch phỏng vấn" title="Địa điểm và nhận xét" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input
            label="Địa điểm"
            placeholder="Văn phòng, Google Meet, Zoom…"
            error={errors.meetingLocation?.message}
            {...register("meetingLocation")}
          />
          <div>
            <Input
              label="Link họp"
              placeholder="https://meet.google.com/…"
              error={errors.meetingUrl?.message}
              {...register("meetingUrl")}
            />
            <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">Hiển thị thành nút mở link ở trang chi tiết.</p>
          </div>
          <div className="sm:col-span-2">
            <Textarea
              label="Nhận xét sau buổi phỏng vấn"
              placeholder="Ghi lại trải nghiệm, câu hỏi đã gặp và cảm nhận của bạn về buổi phỏng vấn…"
              className="min-h-[104px]"
              error={errors.review?.message}
              {...register("review")}
            />
            <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
              Nhật ký riêng cho buổi phỏng vấn này, độc lập với ghi chú chuẩn bị. Tối đa 1.000 ký tự.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 dark:border-white/10 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="w-full sm:w-auto">
          Hủy
        </Button>
        <Button type="submit" isLoading={isSubmitting} className="w-full sm:w-auto">
          Lưu lịch phỏng vấn
        </Button>
      </div>
    </form>
  );
}

/** Tiêu đề một khối nội dung trong form (nhãn nhỏ phía trên + tiêu đề). */
function FormSection({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">{eyebrow}</p>
      <h2 className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
    </div>
  );
}
