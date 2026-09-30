import Link from "next/link";
import { Avatar } from "./Avatar";

interface UserCardProps {
  name: string;
  email: string;
  avatarUrl?: string | null;
}

/** Thẻ người dùng ở góc phải Topbar (tên, email, ảnh đại diện), bấm vào để tới trang Cài đặt. */
export function UserCard({ name, email, avatarUrl }: UserCardProps) {
  return (
    <Link
      href="/settings"
      className="flex items-center gap-3 rounded-xl px-2.5 py-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-white/5"
    >
      <div className="hidden text-right sm:block">
        <p className="text-sm font-medium leading-tight text-slate-800 dark:text-slate-100">{name}</p>
        <p className="text-xs leading-tight text-slate-500 dark:text-slate-400">{email}</p>
      </div>
      <Avatar name={name} avatarUrl={avatarUrl} size="md" />
    </Link>
  );
}
