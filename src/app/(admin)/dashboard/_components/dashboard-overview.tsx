"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DashboardOverviewProps = {
  tenantName: string;
  totalRevenue: number;
  activeRaffles: number;
  participants: number;
  revenueSeries: Array<{ label: string; value: number }>;
  soldTicketsSeries: Array<{ label: string; value: number }>;
  subscription: {
    planName: string | null;
    planPriceMonthly: number | null;
    billingDay: number | null;
    nextBillingAt: string | null;
    status: string;
  };
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const number = new Intl.NumberFormat("pt-BR");

function formatNextBilling(dateIso: string | null): string {
  if (!dateIso) return "Nao definido";
  const parsed = new Date(dateIso);
  if (Number.isNaN(parsed.getTime())) return "Nao definido";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

export function DashboardOverview({
  tenantName,
  totalRevenue,
  activeRaffles,
  participants,
  revenueSeries,
  soldTicketsSeries,
  subscription,
}: DashboardOverviewProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/40 p-5 shadow-lg backdrop-blur-sm md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
        <p className="text-sm text-slate-300">Bem-vindo ao painel da organizacao {tenantName}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <article className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Receita total</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-100">{currency.format(totalRevenue)}</p>
        </article>

        <article className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Rifas ativas</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-100">{number.format(activeRaffles)}</p>
        </article>

        <article className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Participantes</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-100">{number.format(participants)}</p>
        </article>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
          <p className="mb-3 text-sm font-semibold text-zinc-100">Grafico de receita</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickFormatter={(value) => currency.format(Number(value))}
                />
                <Tooltip
                  formatter={(value) => currency.format(Number(value ?? 0))}
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="value" fill="#38bdf8" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
          <p className="mb-3 text-sm font-semibold text-zinc-100">Grafico de bilhetes vendidos</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={soldTicketsSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  formatter={(value) => number.format(Number(value ?? 0))}
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="value" fill="#22c55e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
        <p className="text-sm font-semibold text-zinc-100">Informacoes da assinatura</p>
        <div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-slate-900/50 p-3">
            <p className="text-xs uppercase text-slate-400">Plano atual</p>
            <p className="mt-1 font-medium text-zinc-100">{subscription.planName || "Nao definido"}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-slate-900/50 p-3">
            <p className="text-xs uppercase text-slate-400">Valor mensal</p>
            <p className="mt-1 font-medium text-zinc-100">
              {subscription.planPriceMonthly !== null
                ? currency.format(subscription.planPriceMonthly)
                : "Nao definido"}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-slate-900/50 p-3">
            <p className="text-xs uppercase text-slate-400">Dia de faturamento</p>
            <p className="mt-1 font-medium text-zinc-100">{subscription.billingDay ?? "Nao definido"}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-slate-900/50 p-3">
            <p className="text-xs uppercase text-slate-400">Proximo faturamento</p>
            <p className="mt-1 font-medium text-zinc-100">{formatNextBilling(subscription.nextBillingAt)}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-slate-900/50 p-3 md:col-span-2">
            <p className="text-xs uppercase text-slate-400">Status</p>
            <p className="mt-1 font-medium text-zinc-100">{subscription.status}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
