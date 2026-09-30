import { ReactNode } from "react";
import { AuthSky } from "@/features/auth/components/AuthSky";

interface AuthShellProps {
  hero: ReactNode;
  children: ReactNode;
}

/**
 * Bố cục khung chung cho trang đăng nhập/đăng ký: khối giới thiệu (`hero`) bên trái trên desktop, form (`children`) bên phải.
 */
export function AuthShell({ hero, children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col [color-scheme:dark] lg:flex-row">
      <div className="auth-sky-context relative hidden shrink-0 flex-col overflow-hidden bg-[radial-gradient(ellipse_130%_85%_at_50%_-12%,_#145174,_#092238_68%)] px-6 py-8 sm:px-10 sm:py-10 lg:flex lg:w-1/2 lg:flex-none lg:border-r lg:border-[#1a4a66] lg:px-14 lg:py-14">
        <AuthSky />
        {hero}
      </div>
      <div className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_110%_90%_at_50%_0%,_#173b52,_#0c2030_72%)] px-5 py-12 sm:px-10 lg:min-h-0 lg:w-1/2 lg:flex-none lg:px-16 xl:px-20">
        <div className="relative w-full max-w-xl">{children}</div>
      </div>
    </div>
  );
}
