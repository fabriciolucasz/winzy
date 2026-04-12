import Link from "next/link";
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAuthUser } from "@/lib/auth/mddleware";
import { getActiveTenantCookieName } from "@/lib/auth/jwt";
import prisma from "@/lib/database/prisma";
import { UserMenu } from "../_components/user-menu";
import { MobileMenu } from "../_components/mobile-menu";
import { Logo } from "@/components/ui/logo";
import { TenantSwitcher } from "../_components/tenant-switcher";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const authUser = await getAuthUser();

  if (!authUser) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.userId },
    select: {
      name: true,
      email: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const activeTenantSlug = cookieStore.get(getActiveTenantCookieName())?.value;
  let activeTenantName = "Nenhuma organização ativa";

  const tenants = await prisma.tenant.findMany({
    where: {
      OR: [
        { ownerId: authUser.userId },
        {
          members: {
            some: {
              userId: authUser.userId,
              revokedAt: null,
            },
          },
        },
      ],
    },
    select: {
      slug: true,
      name: true,
    },
  });

  if (activeTenantSlug) {
    const activeTenant = tenants.find((tenant) => tenant.slug === activeTenantSlug);

    if (activeTenant) {
      activeTenantName = activeTenant.name;
    }
  }

  const hasOrganizations = tenants.length > 0;

  return (
    <div className="relative min-h-screen bg-[#071126] text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_22%,rgba(6,182,212,0.18),transparent_30%),radial-gradient(circle_at_84%_76%,rgba(59,130,246,0.14),transparent_30%)]" />

      <header className="relative z-40 w-full border-b border-white/10 bg-slate-950/55 backdrop-blur">
        <div className="flex h-[76px] w-full items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-2 lg:gap-4">
            {hasOrganizations && <MobileMenu />}
            <div className="flex items-center gap-3">
              <Logo className="h-8 w-8" width={32} height={32} href="/dashboard" />
            </div>

            {hasOrganizations ? (
              <TenantSwitcher activeTenantName={activeTenantName} tenants={tenants} />
            ) : (
              <p className="text-sm text-slate-300">Selecione uma organizacao</p>
            )}
          </div>

          <UserMenu name={user.name} email={user.email} />
        </div>
      </header>

      <div className="relative flex min-h-[calc(100vh-76px)] w-full">
        {hasOrganizations ? (
          <aside className="hidden w-64 border-r border-white/10 bg-slate-950/55 p-5 backdrop-blur lg:flex lg:flex-col">
            <nav className="space-y-1">
              <Link
                href="/dashboard"
                className="flex items-center rounded-xl px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-white/10"
              >
                Home
              </Link>
              <Link
                href="/dashboard/raffles"
                className="flex items-center rounded-xl px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-white/10"
              >
                Rifas
              </Link>
              <Link
                href="/dashboard/subscription"
                className="flex items-center rounded-xl px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-white/10"
              >
                Assinatura
              </Link>
              <Link
                href="/dashboard/settings"
                className="flex items-center rounded-xl px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-white/10"
              >
                Configuracoes
              </Link>
            </nav>
          </aside>
        ) : null}

        <main className="relative flex-1 px-4 py-6 md:px-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}