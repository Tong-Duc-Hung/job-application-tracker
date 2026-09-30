import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Chuẩn hóa phản hồi lỗi validation cho mọi API route để form phía client hiển thị lỗi theo từng trường.
 * Mỗi trường chỉ giữ thông báo lỗi đầu tiên; lỗi không gắn với trường nào dùng khóa `_root`.
 * Body có dạng `{ error: "Validation failed", fieldErrors }`.
 *
 * @param error Lỗi do Zod trả về.
 * @param status Mã HTTP (mặc định 400).
 */
export function zodErrorResponse(error: ZodError, status = 400) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_root";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return NextResponse.json({ error: "Thông tin gửi lên chưa hợp lệ", fieldErrors }, { status });
}

/**
 * Tạo phản hồi lỗi JSON dạng `{ error }`.
 *
 * @param message Nội dung lỗi trả cho client.
 * @param status Mã HTTP (mặc định 400).
 */
export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Tạo phản hồi 401 khi chưa đăng nhập hoặc phiên không hợp lệ. */
export function unauthorizedResponse() {
  return NextResponse.json({ error: "Vui lòng đăng nhập để tiếp tục" }, { status: 401 });
}

/**
 * Tạo phản hồi 404. Cũng được dùng khi tài nguyên thuộc về người dùng khác để không tiết lộ sự tồn tại của nó.
 *
 * @param message Nội dung lỗi (mặc định "Not found").
 */
export function notFoundResponse(message = "Không tìm thấy nội dung yêu cầu") {
  return NextResponse.json({ error: message }, { status: 404 });
}
