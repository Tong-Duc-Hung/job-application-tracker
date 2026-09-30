import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma 7 yêu cầu driver adapter tường minh: `new PrismaClient()` trần không còn hợp lệ.
 * Adapter tự đọc chuỗi kết nối vì `datasource.url` đã bị bỏ khỏi schema.prisma ở bản 7
 * (chuyển sang prisma.config.ts cho phía CLI/migration).
 */
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

/**
 * Giữ PrismaClient trên `globalThis` để không tạo thêm client (và kết nối DB) mỗi lần hot-reload khi phát triển.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * PrismaClient dùng chung toàn ứng dụng. Ở môi trường development ghi cả log lỗi và cảnh báo, còn lại chỉ ghi log lỗi.
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
