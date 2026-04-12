import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import prisma from "@/lib/database/prisma";
import { getAuthUser } from "@/lib/auth/mddleware";
import { getActiveTenantCookieName } from "@/lib/auth/jwt";
import { DashboardOverview } from "../_components/dashboard-overview";

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date);
}

function getLastMonthsWindow(size: number): Array<{ key: string; label: string; date: Date }> {
  const now = new Date();
  const window: Array<{ key: string; label: string; date: Date }> = [];

  for (let i = size - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    window.push({ key, label: monthLabel(date), date });
  }

  return window;
}

export default async function DashboardHomePage() {
  const authUser = await getAuthUser();

  if (!authUser) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const activeTenantSlug = cookieStore.get(getActiveTenantCookieName())?.value;

  const totalTenants = await prisma.tenant.count({
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
  });

  if (totalTenants === 0) {
    redirect("/dashboard/organizations");
  }

  if (!activeTenantSlug) {
    redirect("/dashboard/organizations");
  }

  const tenant = await prisma.tenant.findFirst({
    where: {
      slug: activeTenantSlug,
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
      id: true,
      name: true,
      planName: true,
      planPriceMonthly: true,
      billingDay: true,
      nextBillingAt: true,
      subscriptionStatus: true,
    },
  });

  if (!tenant) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 shadow-lg backdrop-blur-sm">
        <h1 className="text-2xl font-mono font-bold uppercase text-zinc-100">Home</h1>
        <p className="mt-3 text-sm text-slate-300">A organizacao ativa nao foi encontrada ou voce nao tem acesso.</p>
      </div>
    );
  }

  const [payments, soldTicketsCount, activeRaffles, participants] = await Promise.all([
    prisma.payment.findMany({
      where: {
        tenantId: tenant.id,
        status: "COMPLETED",
      },
      select: {
        totalValue: true,
        createdAt: true,
      },
    }),
    prisma.ticket.findMany({
      where: {
        tenantId: tenant.id,
      },
      select: {
        createdAt: true,
      },
    }),
    prisma.raffle.count({
      where: {
        tenantId: tenant.id,
        status: "ACTIVE",
      },
    }),
    prisma.client.count({
      where: {
        tenantId: tenant.id,
      },
    }),
  ]);

  const window = getLastMonthsWindow(6);

  const revenueByMonth = new Map<string, number>(window.map((item) => [item.key, 0]));
  for (const payment of payments) {
    const key = `${payment.createdAt.getFullYear()}-${String(payment.createdAt.getMonth() + 1).padStart(2, "0")}`;
    revenueByMonth.set(key, (revenueByMonth.get(key) || 0) + Number(payment.totalValue));
  }

  const soldTicketsByMonth = new Map<string, number>(window.map((item) => [item.key, 0]));
  for (const ticket of soldTicketsCount) {
    const key = `${ticket.createdAt.getFullYear()}-${String(ticket.createdAt.getMonth() + 1).padStart(2, "0")}`;
    soldTicketsByMonth.set(key, (soldTicketsByMonth.get(key) || 0) + 1);
  }

  const revenueSeries = window.map((item) => ({
    label: item.label,
    value: revenueByMonth.get(item.key) || 0,
  }));

  const soldTicketsSeries = window.map((item) => ({
    label: item.label,
    value: soldTicketsByMonth.get(item.key) || 0,
  }));

  const totalRevenue = payments.reduce((acc, payment) => acc + Number(payment.totalValue), 0);

  return (
    <DashboardOverview
      tenantName={tenant.name}
      totalRevenue={totalRevenue}
      activeRaffles={activeRaffles}
      participants={participants}
      revenueSeries={revenueSeries}
      soldTicketsSeries={soldTicketsSeries}
      subscription={{
        planName: tenant.planName,
        planPriceMonthly: tenant.planPriceMonthly ? Number(tenant.planPriceMonthly) : null,
        billingDay: tenant.billingDay,
        nextBillingAt: tenant.nextBillingAt ? tenant.nextBillingAt.toISOString() : null,
        status: tenant.subscriptionStatus,
      }}
    />
  );
}
