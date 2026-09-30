import { clsx, type ClassValue } from "clsx";

/**
 * Gộp các tên class (có điều kiện) thành một chuỗi; bọc `clsx` và được dùng trong mọi component UI.
 *
 * @param inputs Chuỗi, object hoặc mảng class theo kiểu `clsx`.
 * @returns Chuỗi class đã gộp.
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
