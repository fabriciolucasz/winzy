import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import prisma from "@/lib/database/prisma";
import { getAuthUser } from "@/lib/auth/mddleware";
import { getActiveTenantCookieName } from "@/lib/auth/jwt";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatDate(value: Date | null): string {
  if (!value) return "Nao definido";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function formatStatus(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "Ativa";
    case "TRIAL":
      return "Periodo de teste";
    case "PAST_DUE":
      return "Pagamento pendente";
    case "CANCELED":
      return "Cancelada";
    default:
      return status;
  }
}

export default async function DashboardSubscriptionPage() {
  const authUser = await getAuthUser();

  if (!authUser) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const activeTenantSlug = cookieStore.get(getActiveTenantCookieName())?.value;

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
      name: true,
      planName: true,
      planPriceMonthly: true,
      billingDay: true,
      nextBillingAt: true,
      subscriptionStatus: true,
    },
  });

  if (!tenant) {
    redirect("/dashboard/organizations");
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/45 p-5 shadow-lg backdrop-blur-sm md:p-6">
      <div className="mb-6 border-b border-white/10 pb-4">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-slate-400">Painel administrativo</p>
        <h1 className="mt-2 text-2xl font-mono font-bold uppercase text-zinc-100 md:text-3xl">Assinatura</h1>
        <p className="mt-2 text-sm text-slate-300">
          Informacoes contratuais da organizacao {tenant.name}. Estes dados sao gerenciados internamente.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <article className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Plano atual</p>
          <p className="mt-2 text-lg font-semibold text-zinc-100">{tenant.planName || "Nao definido"}</p>
        </article>

        <article className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Valor mensal</p>
          <p className="mt-2 text-lg font-semibold text-zinc-100">
            {tenant.planPriceMonthly !== null
              ? currencyFormatter.format(Number(tenant.planPriceMonthly))
              : "Nao definido"}
          </p>
        </article>

        <article className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Dia de faturamento</p>
          <p className="mt-2 text-lg font-semibold text-zinc-100">{tenant.billingDay ?? "Nao definido"}</p>
        </article>

        <article className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Proximo faturamento</p>
          <p className="mt-2 text-lg font-semibold text-zinc-100">{formatDate(tenant.nextBillingAt)}</p>
        </article>

        <article className="rounded-xl border border-white/10 bg-slate-950/45 p-4 md:col-span-2">
          <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
          <p className="mt-2 text-lg font-semibold text-zinc-100">{formatStatus(tenant.subscriptionStatus)}</p>
        </article>
      </div>
    </section>
  );
}
