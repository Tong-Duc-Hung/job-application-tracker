import { cn } from "@/shared/utils/cn";

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/** Kích thước hiển thị cho từng cỡ avatar. */
const sizeClasses = {
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-sm",
  lg: "h-16 w-16 text-lg",
};

/**
 * Lấy tối đa hai chữ cái đầu của tên (theo từng từ, cách nhau bởi khoảng trắng) làm chữ viết tắt
 * hiển thị khi không có ảnh đại diện.
 *
 * @param name Tên đầy đủ.
 */
function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Ảnh đại diện người dùng; nếu không có `avatarUrl` thì hiện chữ viết tắt trên nền màu thương hiệu. */
export function Avatar({ name, avatarUrl, size = "md", className }: AvatarProps) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        className={cn("shrink-0 rounded-full object-cover", sizeClasses[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-medium text-brand-700 dark:bg-brand-500/20 dark:text-brand-300",
        sizeClasses[size],
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
