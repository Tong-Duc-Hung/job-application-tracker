"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Briefcase, CalendarClock } from "lucide-react";
import type { Note } from "@prisma/client";
import { noteFormSchema, type NoteFormInput, type NoteLinkType } from "../note.schema";
import { Input, Select, Textarea } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { cn } from "@/shared/utils/cn";
import { formatDateTime } from "@/shared/utils/formatDate";

/** Dữ liệu rút gọn của một đơn ứng tuyển, dùng để hiển thị trong dropdown chọn liên kết. */
type ApplicationOption = { id: string; company: string; position: string };
/** Dữ liệu rút gọn của một buổi phỏng vấn, dùng để hiển thị trong dropdown chọn liên kết. */
type InterviewOption = {
  id: string;
  title: string;
  scheduledAt: string | Date;
  application: { id: string; company: string; position: string };
};

/**
 * @property lockedApplication, lockedInterview Nếu có một trong hai, form khóa cứng liên kết đó (mở từ trang chi tiết đơn/phỏng vấn) thay vì cho chọn qua dropdown.
 */
interface NoteFormProps {
  initialData?: (Note & { application?: ApplicationOption | null; interview?: InterviewOption | null }) | null;
  lockedApplication?: ApplicationOption;
  lockedInterview?: InterviewOption;
  onSubmit: (values: NoteFormInput) => Promise<void>;
  onCancel: () => void;
}

/**
 * Dựng giá trị mặc định cho form: form trắng (có thể khóa sẵn liên kết) khi tạo mới, hoặc chuyển đổi từ bản ghi có sẵn khi sửa.
 */
function toDefaultValues(note?: NoteFormProps["initialData"], lockedApplicationId?: string, lockedInterviewId?: string): NoteFormInput {
  if (!note) {
    return {
      applicationId: lockedApplicationId ?? "",
      interviewId: lockedInterviewId ?? "",
      title: "",
      content: "",
    };
  }
  return {
    applicationId: note.applicationId ?? "",
    interviewId: note.interviewId ?? "",
    title: note.title,
    content: note.content,
  };
}

/**
 * Form tạo/sửa ghi chú.
 * Một ghi chú phải gắn với đúng một đối tượng: đơn ứng tuyển hoặc buổi phỏng vấn — hai nút chuyển đổi
 * (`switchLinkType`) đảm bảo trường không được chọn luôn bị xóa giá trị, khớp với ràng buộc của `noteFormSchema`.
 * Khi không bị khóa liên kết, form tự tải cả danh sách đơn ứng tuyển lẫn danh sách phỏng vấn (mỗi loại
 * tối đa 100 bản ghi gần nhất) song song để đổ vào hai dropdown.
 */
export function NoteForm({ initialData, lockedApplication, lockedInterview, onSubmit, onCancel }: NoteFormProps) {
  const isLocked = Boolean(lockedApplication || lockedInterview);
  const [linkType, setLinkType] = useState<NoteLinkType>(
    lockedInterview || initialData?.interviewId ? "interview" : "application"
  );

  const [applications, setApplications] = useState<ApplicationOption[]>(
    lockedApplication ? [lockedApplication] : []
  );
  const [interviews, setInterviews] = useState<InterviewOption[]>(lockedInterview ? [lockedInterview] : []);
  const [loadingOptions, setLoadingOptions] = useState(!isLocked);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<NoteFormInput>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: toDefaultValues(initialData, lockedApplication?.id, lockedInterview?.id),
  });

  useEffect(() => {
    if (initialData) reset(toDefaultValues(initialData));
  }, [initialData, reset]);

  useEffect(() => {
    if (lockedInterview) {
      setValue("interviewId", lockedInterview.id);
      setValue("applicationId", "");
    } else if (lockedApplication) {
      setValue("applicationId", lockedApplication.id);
      setValue("interviewId", "");
    }
  }, [lockedApplication, lockedInterview, setValue]);

  useEffect(() => {
    if (isLocked) return;
    let cancelled = false;
    (async () => {
      const [appsRes, interviewsRes] = await Promise.all([
        fetch("/api/applications?pageSize=100&sortBy=createdAt&sortDir=desc"),
        fetch("/api/interviews?pageSize=100&sortDir=desc"),
      ]);
      if (!cancelled && appsRes.ok) {
        const data = await appsRes.json();
        setApplications(
          data.items.map((a: ApplicationOption) => ({ id: a.id, company: a.company, position: a.position }))
        );
      }
      if (!cancelled && interviewsRes.ok) {
        const data = await interviewsRes.json();
        setInterviews(data.items);
      }
      if (!cancelled) setLoadingOptions(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isLocked]);

  /**
   * Chuyển loại đối tượng liên kết và xóa giá trị của trường không còn dùng, để không gửi lên cả hai id
   * cùng lúc (vi phạm ràng buộc "chỉ một trong hai" của schema).
   *
   * @param next Loại liên kết mới.
   */
  function switchLinkType(next: NoteLinkType) {
    setLinkType(next);
    if (next === "application") {
      setValue("interviewId", "");
    } else {
      setValue("applicationId", "");
    }
  }

  const applicationOptions = applications.map((a) => ({ label: `${a.company} — ${a.position}`, value: a.id }));
  const interviewOptions = interviews.map((iv) => ({
    label: `${iv.title} — ${iv.application.company} (${formatDateTime(iv.scheduledAt)})`,
    value: iv.id,
  }));

  const linkError = errors.applicationId?.message;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900 sm:p-7">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
        {/* Liên kết */}
        <div className="mb-4 flex items-end justify-between gap-4">
          <FormSection eyebrow="Liên kết" title="Gắn ghi chú với hồ sơ hoặc buổi phỏng vấn" />
          <span className="shrink-0 text-right text-xs text-slate-400 dark:text-slate-500">
            Các trường có dấu <span className="font-semibold text-red-500">*</span> là bắt buộc
          </span>
        </div>
        <div className="mt-4">
          {isLocked ? (
            <div className="flex h-[42px] min-w-0 items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              {lockedInterview ? (
                <>
                  <CalendarClock className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
                  <span title={lockedInterview.title} className="min-w-0 truncate font-medium text-slate-700 dark:text-slate-200">{lockedInterview.title}</span>
                  <span className="mx-1.5 shrink-0 text-slate-400 dark:text-slate-500">—</span>
                  <span title={lockedInterview.application.company} className="min-w-0 truncate">{lockedInterview.application.company}</span>
                </>
              ) : (
                <>
                  <Briefcase className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
                  <span title={lockedApplication!.company} className="min-w-0 truncate font-medium text-slate-700 dark:text-slate-200">{lockedApplication!.company}</span>
                  <span className="mx-1.5 shrink-0 text-slate-400 dark:text-slate-500">—</span>
                  <span title={lockedApplication!.position} className="min-w-0 truncate">{lockedApplication!.position}</span>
                </>
              )}
              <input type="hidden" {...register("interviewId")} />
              <input type="hidden" {...register("applicationId")} />
            </div>
          ) : (
            <>
              <div className="mb-3 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/5">
                <button
                  type="button"
                  onClick={() => switchLinkType("application")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    linkType === "application"
                      ? "bg-white text-brand-700 shadow-sm dark:bg-slate-800 dark:text-brand-300"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  )}
                >
                  <Briefcase className="h-3.5 w-3.5" /> Đơn ứng tuyển
                </button>
                <button
                  type="button"
                  onClick={() => switchLinkType("interview")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    linkType === "interview"
                      ? "bg-white text-brand-700 shadow-sm dark:bg-slate-800 dark:text-brand-300"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  )}
                >
                  <CalendarClock className="h-3.5 w-3.5" /> Buổi phỏng vấn
                </button>
              </div>

              {linkType === "application" ? (
                <Select
                  placeholder={loadingOptions ? "Đang tải danh sách…" : "Chọn một đơn ứng tuyển"}
                  options={applicationOptions}
                  error={linkError}
                  {...register("applicationId")}
                />
              ) : (
                <Select
                  placeholder={loadingOptions ? "Đang tải danh sách…" : "Chọn một buổi phỏng vấn"}
                  options={interviewOptions}
                  error={linkError}
                  {...register("interviewId")}
                />
              )}
            </>
          )}
        </div>

        {/* Nội dung ghi chú */}
        <div className="mt-8 border-t border-slate-200 pt-6 dark:border-white/10">
          <FormSection eyebrow="Nội dung ghi chú" title="Kiến thức và câu hỏi cần chuẩn bị" />
          <div className="mt-4 flex flex-col gap-5">
            <Input
              label="Tiêu đề"
              placeholder="VD: Ôn tập thuật toán trước vòng technical"
              required
              error={errors.title?.message}
              {...register("title")}
            />
            <Textarea
              label="Nội dung"
              placeholder="Kiến thức cần ôn, câu hỏi có thể gặp, mẹo chuẩn bị…"
              required
              className="min-h-[140px] max-h-[60vh] max-w-full resize-y overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
              error={errors.content?.message}
              {...register("content")}
            />
          </div>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 dark:border-white/10 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="w-full sm:w-auto">
            Hủy
          </Button>
          <Button type="submit" isLoading={isSubmitting} className="w-full sm:w-auto">
            Lưu ghi chú
          </Button>
        </div>
      </form>
    </div>
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
