"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Plus, Users } from "lucide-react";

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  role: string;
  membersCount: number;
  pendingInvites: number;
  plan: string;
  createdAt: string;
};

type CreateTenantResponse = {
  success: boolean;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    createdAt: string;
  };
  error?: string;
};

function formatDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

type TenantManagementProps = {
  tenants: TenantRow[];
  activeTenantSlug?: string;
};

export function TenantManagement({ tenants, activeTenantSlug }: TenantManagementProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const defaultSelected = useMemo(() => {
    return tenants.find((tenant) => tenant.slug === activeTenantSlug)?.id || tenants[0]?.id || "";
  }, [activeTenantSlug, tenants]);

  const [selectedTenantId, setSelectedTenantId] = useState(defaultSelected);
  const generatedSlug = useMemo(() => slugify(slug || name), [name, slug]);

  function resetDialog() {
    setName("");
    setSlug("");
    setError("");
    setIsSubmitting(false);
    setIsDialogOpen(false);
  }

  async function handleCreateTenant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Informe o nome da organizacao.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          slug: (slug || generatedSlug).trim(),
        }),
      });

      const data = (await response.json()) as CreateTenantResponse;

      if (!response.ok || !data.success || !data.tenant) {
        setError(data.error || "Nao foi possivel criar a organizacao.");
        return;
      }

      resetDialog();
      router.replace(`/dashboard/select/${data.tenant.slug}`);
      router.refresh();
    } catch {
      setError("Erro de conexao. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-300">Selecione uma organizacao para abrir o painel ou crie uma nova em segundos.</p>
        <button
          type="button"
          onClick={() => setIsDialogOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-700"
        >
          <Plus className="h-4 w-4" />
          Nova organizacao
        </button>
      </div>

      {tenants.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-900/45 p-8 text-center shadow-lg backdrop-blur-sm">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-slate-800/70 text-slate-100">
            <Building2 className="h-7 w-7" />
          </span>
          <p className="mt-4 text-xl font-semibold text-zinc-100">Voce ainda nao tem uma organizacao</p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-300">
            Crie sua primeira organizacao para comecar a configurar rifas, branding e todos os dados operacionais do seu painel.
          </p>
          <button
            type="button"
            onClick={() => setIsDialogOpen(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700"
          >
            <Plus className="h-4 w-4" />
            Nova organizacao
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tenants.map((tenant) => {
            const isSelected = tenant.id === selectedTenantId;
            const isActive = tenant.slug === activeTenantSlug;

            return (
              <article
                key={tenant.id}
                onClick={() => setSelectedTenantId(tenant.id)}
                className={`group relative cursor-pointer overflow-hidden rounded-2xl border p-4 transition-all ${isSelected
                  ? "border-cyan-300/35 bg-cyan-500/10 shadow-[0_20px_45px_-24px_rgba(34,211,238,0.5)]"
                  : "border-white/10 bg-slate-900/40 hover:border-white/20 hover:bg-slate-900/60"
                  }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800/75 text-sm font-semibold text-slate-100">
                      {tenant.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <p className="font-semibold text-zinc-100">{tenant.name}</p>
                      <p className="text-xs text-slate-400">/{tenant.slug}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                </div>

                <div className="mt-4 grid gap-2 text-xs text-slate-300">
                  <div className="flex items-center justify-between rounded-lg bg-slate-950/40 px-3 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" /> Membros
                    </span>
                    <strong className="text-zinc-100">{tenant.membersCount}</strong>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-950/40 px-3 py-2">
                    <span>Convites</span>
                    <strong className="text-zinc-100">{tenant.pendingInvites}</strong>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-950/40 px-3 py-2">
                    <span>Plano</span>
                    <strong className="text-zinc-100">{tenant.plan}</strong>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-950/40 px-3 py-2">
                    <span>Criado em</span>
                    <strong className="text-zinc-100">{formatDate(tenant.createdAt)}</strong>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  {isActive ? (
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                      Ativa
                    </span>
                  ) : (
                    <span className="rounded-full border border-white/15 bg-slate-900/55 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                      {tenant.role}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      router.replace(`/dashboard/select/${tenant.slug}`);
                    }}
                    className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-cyan-700"
                  >
                    Abrir painel
                  </button>
                </div>
              </article>
            );
          })}

          <button
            type="button"
            onClick={() => setIsDialogOpen(true)}
            className="group flex min-h-[230px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-slate-900/35 p-6 text-center transition-colors hover:border-cyan-300/40 hover:bg-slate-900/55"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800/70 text-slate-100 transition-colors group-hover:bg-slate-700/80">
              <Plus className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-semibold text-zinc-100">Criar Nova Organizacao</p>
            <p className="mt-1 text-xs text-slate-400">Configure uma nova conta em segundos</p>
          </button>
        </div>
      )}

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#070d18]/80 p-6 backdrop-blur-sm md:p-10">
          <div className="mx-auto w-full max-w-3xl rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-xl md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">Criar organizacao</h3>
                <p className="mt-1 text-sm text-slate-400">Defina nome e slug para sua nova organizacao.</p>
              </div>

              <button
                type="button"
                onClick={resetDialog}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-white/10"
              >
                Fechar
              </button>
            </div>

            <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleCreateTenant}>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-300">Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="block w-full rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2 text-sm text-zinc-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Ex.: InCherry Brasil"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-300">Slug (opcional)</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  className="block w-full rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2 text-sm text-zinc-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="in-cherry-brasil"
                />
                <p className="mt-2 text-xs text-slate-400">Slug final: {generatedSlug || "-"}</p>
              </div>

              {error && <p className="md:col-span-2 text-sm text-red-400">{error}</p>}

              <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetDialog}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Criando..." : "Criar organizacao"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
