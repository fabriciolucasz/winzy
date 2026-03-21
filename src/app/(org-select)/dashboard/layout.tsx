import { ReactNode } from "react";
import { redirect } from "next/navigation";
import prisma from "@/lib/database/prisma";
import { getAuthUser } from "@/lib/auth/mddleware";
import { Logo } from "@/components/ui/logo";

interface SelectOrgLayoutProps {
  children: ReactNode;
}

function initials(name: string) {
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "U";
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return `${tokens[0][0]}${tokens[tokens.length - 1][0]}`.toUpperCase();
}

export default async function SelectOrgLayout({ children }: SelectOrgLayoutProps) {
  const authUser = await getAuthUser();

  if (!authUser) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.userId },
    select: { name: true, email: true },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="relative min-h-screen bg-[#071126] text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_22%,rgba(6,182,212,0.18),transparent_30%),radial-gradient(circle_at_84%_76%,rgba(59,130,246,0.14),transparent_30%)]" />

      <header className="relative border-b border-white/10 bg-slate-950/55 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Logo className="h-8 w-8" width={32} height={32} href="/dashboard/organizations" />
            <span className="text-sm font-semibold text-zinc-100">Winzy</span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-slate-900/60 px-3 py-1.5">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-cyan-600 text-[11px] font-semibold text-white">
              {initials(user.name)}
            </span>
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium text-zinc-100">{user.name}</p>
              <p className="text-[11px] text-slate-400">{user.email}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-5xl px-4 py-8 md:px-6">{children}</main>
    </div>
  );
}
