import { format, isBefore, isToday, isTomorrow, startOfDay } from "date-fns";

/**
 * Định dạng ngày theo kiểu Việt Nam, ví dụ `12/04/2026`.
 *
 * @param date Ngày dạng `Date` hoặc chuỗi ISO.
 */
export function formatDate(date: Date | string): string {
  return format(new Date(date), "dd/MM/yyyy");
}

/**
 * Định dạng ngày và giờ, ví dụ `12/04/2026, 09:00`.
 *
 * @param date Ngày dạng `Date` hoặc chuỗi ISO.
 */
export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "dd/MM/yyyy, HH:mm");
}

/**
 * Nhãn thời gian dễ đọc dùng ở Tổng quan và danh sách phỏng vấn: `Hôm nay 09:00`, `Ngày mai 09:00`
 * hoặc `12/04/2026 09:00`.
 * Việc so sánh "hôm nay/ngày mai" dựa trên múi giờ của môi trường đang chạy (máy chủ khi render phía server).
 *
 * @param date Thời điểm cần hiển thị.
 */
export function formatRelativeSchedule(date: Date | string): string {
  const d = new Date(date);
  const time = format(d, "HH:mm");
  if (isToday(d)) return `Hôm nay ${time}`;
  if (isTomorrow(d)) return `Ngày mai ${time}`;
  return `${format(d, "dd/MM/yyyy")} ${time}`;
}

/**
 * Kiểm tra hạn chót đã quá hạn chưa. Hạn chót được lưu là ngày lúc 00:00 UTC, nên hàm lấy các thành phần UTC
 * để dựng lại đúng ngày đó theo giờ địa phương rồi so với đầu ngày hôm nay; hạn trong ngày hôm nay chưa bị coi là quá hạn.
 *
 * @param date Hạn chót.
 * @returns `true` nếu hạn chót nằm trước hôm nay.
 */
export function isOverdue(date: Date | string): boolean {
  const deadline = new Date(date);
  const deadlineDayLocal = new Date(deadline.getUTCFullYear(), deadline.getUTCMonth(), deadline.getUTCDate());
  return isBefore(deadlineDayLocal, startOfDay(new Date()));
}

/**
 * Định dạng `yyyy-MM-dd` cho giá trị của `<input type="date">`.
 *
 * @param date Ngày cần định dạng.
 * @returns Chuỗi ngày, hoặc chuỗi rỗng nếu không có giá trị.
 */
export function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  return format(new Date(date), "yyyy-MM-dd");
}

/**
 * Định dạng `yyyy-MM-ddTHH:mm` (theo giờ địa phương của trình duyệt) cho giá trị của `<input type="datetime-local">`.
 *
 * @param date Thời điểm cần định dạng.
 * @returns Chuỗi thời gian, hoặc chuỗi rỗng nếu không có giá trị.
 */
export function toDateTimeInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  return format(new Date(date), "yyyy-MM-dd'T'HH:mm");
}

/**
 * Chuyển giá trị của `<input type="datetime-local">` (`yyyy-MM-ddTHH:mm`, giờ tường theo trình duyệt) sang chuỗi ISO-8601 UTC.
 * Nếu gửi nguyên giá trị thô, máy chủ sẽ hiểu nó theo múi giờ của chính nó và làm lệch giờ phỏng vấn
 * mỗi khi máy chủ và người dùng ở hai múi giờ khác nhau.
 *
 * @param value Giá trị lấy từ ô nhập.
 * @returns Thời điểm tuyệt đối ở dạng ISO UTC.
 */
export function toIsoFromDateTimeInput(value: string): string {
  return new Date(value).toISOString();
}
