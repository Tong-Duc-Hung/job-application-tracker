"use client";

import { useState } from "react";
import type { Application } from "@prisma/client";
import { Textarea } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { useToast } from "@/shared/ui/Toast";
import { applicationToFormInput } from "./ApplicationForm";

interface ExperienceQuickEditFormProps {
  application: Application;
  onSaved: () => void;
  onCancel: () => void;
}

/**
 * Form rút gọn chỉ để sửa nhanh phần "Kinh nghiệm" của một đơn ứng tuyển (mở trong Modal ở trang chi tiết),
 * không cần mở lại toàn bộ ApplicationForm.
 * Do API chỉ hỗ trợ `PUT` thay thế toàn bộ đơn (không có `PATCH`), hàm `handleSave` phải gửi lại đầy đủ
 * các trường hiện có của đơn (qua `applicationToFormInput`) kèm giá trị kinh nghiệm mới.
 */
export function ExperienceQuickEditForm({ application, onSaved, onCancel }: ExperienceQuickEditFormProps) {
  const { push } = useToast();
  const [value, setValue] = useState(application.experience ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Gửi `PUT /api/applications/:id` với toàn bộ dữ liệu đơn hiện có, chỉ thay riêng trường kinh nghiệm. */
  async function handleSave() {
    setIsSubmitting(true);
    const res = await fetch(`/api/applications/${application.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...applicationToFormInput(application), experience: value }),
    });
    setIsSubmitting(false);
    if (!res.ok) {
      push("Không thể lưu kinh nghiệm này.", "error");
      return;
    }
    push("Đã lưu kinh nghiệm");
    onSaved();
  }

  return (
    <div className="flex flex-col gap-4">
      <Textarea
        label="Kinh nghiệm"
        placeholder="Vì sao đơn này chưa thành công — thiếu kiến thức gì, chưa có kinh nghiệm thực tế ở đâu, cần chuẩn bị gì tốt hơn cho lần sau…"
        className="min-h-[160px]"
        maxLength={2000}
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Hủy
        </Button>
        <Button type="button" onClick={handleSave} isLoading={isSubmitting}>
          Lưu
        </Button>
      </div>
    </div>
  );
}
