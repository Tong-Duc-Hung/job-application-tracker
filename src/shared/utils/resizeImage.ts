/**
 * Thu nhỏ và nén ảnh ngay trên trình duyệt, trả về data URL dạng JPEG. Dùng cho ảnh đại diện: ảnh được nhúng
 * trực tiếp (tự chứa, dùng được khi ngoại tuyến, không phụ thuộc máy chủ ảnh bên ngoài có thể ngừng hoạt động)
 * thay vì lưu file thô hoặc bắt người dùng cung cấp URL.
 *
 * @param file File ảnh do người dùng chọn.
 * @param maxSize Cạnh dài tối đa sau khi thu nhỏ, tính bằng pixel (mặc định 256).
 * @param quality Chất lượng JPEG từ 0 đến 1 (mặc định 0.85).
 * @returns Promise chứa data URL; bị từ chối kèm thông báo tiếng Việt nếu file không phải ảnh hợp lệ.
 */
export function resizeImageToDataUrl(file: File, maxSize = 256, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Vui lòng chọn một file ảnh (JPG, PNG, WebP…)"));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Không thể đọc file ảnh"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("File không phải là ảnh hợp lệ"));
      img.onload = () => {
        // Thu nhỏ theo cạnh dài nhất về tối đa `maxSize`, giữ nguyên tỉ lệ khung hình; ảnh nhỏ hơn được giữ nguyên kích thước.
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height >= width && height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }

        // Vẽ ảnh đã thu nhỏ lên canvas rồi xuất ra JPEG đã nén.
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Trình duyệt không hỗ trợ xử lý ảnh"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
