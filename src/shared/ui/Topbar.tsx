import { UserCard } from "./UserCard";
import { LogoutButton } from "./LogoutButton";
import { TopbarTitle } from "./TopbarTitle";

interface TopbarProps {
  name: string;
  email: string;
  avatarUrl?: string | null;
}

/** Thanh tiêu đề trên cùng của khu vực dashboard: tiêu đề trang hiện tại, nút đăng xuất và thẻ người dùng. */
export function Topbar({ name, email, avatarUrl }: TopbarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-white/10 dark:bg-slate-950 sm:px-8">
      <TopbarTitle />
      <div className="flex items-center gap-1">
        <LogoutButton />
        <UserCard name={name} email={email} avatarUrl={avatarUrl} />
      </div>
    </header>
  );
}
