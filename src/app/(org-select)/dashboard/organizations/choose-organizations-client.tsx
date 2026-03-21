"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Plus } from "lucide-react";

type TenantItem = {
  id: string;
  name: string;
  slug: string;
  membersCount: number;
  plan: string;
  isActive: boolean;
};

type CreateTenantResponse = {
  success: boolean;
  tenant?: {
    id: string;
    name: string;
    slug: string;
  };
  error?: string;
};

type ChooseOrganizationsClientProps = {
  tenants: TenantItem[];
};

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function ChooseOrganizationsClient({ tenants }: ChooseOrganizationsClientProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectingSlug, setSelectingSlug] = useState<string | null>(null);

  const generatedSlug = useMemo(() => slugify(slug || name), [name, slug]);

  async function selectOrganization(tenantSlug: string) {
    setSelectingSlug(tenantSlug);
    router.replace(`/dashboard/select/${tenantSlug}?next=/dashboard`);
    router.refresh();
  }

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const orgName = name.trim();
    const orgSlug = (slug || generatedSlug).trim();

    if (!orgName) {
      setError("Informe o nome da organizacao.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName, slug: orgSlug }),
      });

      const data = (await response.json()) as CreateTenantResponse;

      if (!response.ok || !data.success || !data.tenant) {
        setError(data.error || "Nao foi possivel criar a organizacao.");
        return;
      }

      router.replace(`/dashboard/select/${data.tenant.slug}?next=/dashboard`);
      router.refresh();
    } catch {
      setError("Erro de conexao ao criar organizacao.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/35 p-5 shadow-lg backdrop-blur-sm sm:p-6">
      {selectingSlug ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070d18]/75 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900 px-5 py-4 text-sm text-slate-200 shadow-xl">
            <Loader2 className="h-4 w-4 animate-spin" />
            Selecionando organizacao...
          </div>
        </div>
      ) : null}

      <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">Suas Organizacoes</h1>
      <p className="mt-1 text-sm text-slate-300">Selecione uma organizacao ou crie uma nova</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {tenants.map((tenant) => (
          <button
            key={tenant.id}
            type="button"
            onClick={() => selectOrganization(tenant.slug)}
            disabled={Boolean(selectingSlug)}
            className="group flex min-h-[160px] flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/50 p-5 text-left transition-all hover:border-cyan-300/40 hover:bg-slate-900/70"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-100">
                  <Building2 className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-zinc-100">{tenant.name}</p>
                  <p className="truncate text-sm text-slate-400">/{tenant.slug}</p>
                </div>
              </div>
              <span className="text-slate-400 transition-transform group-hover:translate-x-0.5">→</span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
              <span>{tenant.membersCount} membro(s)</span>
              <span className="rounded-full border border-white/15 bg-slate-900/70 px-2.5 py-0.5 text-[10px] text-slate-200">
                {tenant.plan}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] ${tenant.isActive
                    ? "border border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                    : "border border-white/15 bg-slate-900/70 text-slate-300"
                  }`}
              >
                {tenant.isActive ? "Ativa" : "Selecionar"}
              </span>
            </div>
          </button>
        ))}

        <button
          type="button"
          onClick={() => setIsCreating(true)}
          disabled={Boolean(selectingSlug)}
          className="group flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-slate-900/35 text-center transition-all hover:border-cyan-300/40 hover:bg-slate-900/55"
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/80 text-slate-100 transition-colors group-hover:bg-slate-700/80">
            <Plus className="h-5 w-5" />
          </span>
          <p className="mt-3 text-lg font-semibold text-zinc-100">Criar Nova Organizacao</p>
          <p className="mt-1 text-sm text-slate-400">Configure uma nova conta</p>
        </button>
      </div>

      {isCreating ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070d18]/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
              <h2 className="text-lg font-semibold text-zinc-100">Nova organizacao</h2>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setError("");
                }}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
              >
                Fechar
              </button>
            </div>

            <form className="mt-4 space-y-3" onSubmit={createOrganization}>
              <div>
                <label className="mb-1 block text-sm text-slate-300">Nome</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-800/70 px-3 py-2 text-sm text-zinc-100"
                  placeholder="Ex.: Rifas Premium"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-300">Slug (opcional)</label>
                <input
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-800/70 px-3 py-2 text-sm text-zinc-100"
                  placeholder="rifas-premium"
                />
                <p className="mt-1 text-xs text-slate-400">Slug final: {generatedSlug || "-"}</p>
              </div>

              {error ? <p className="text-sm text-rose-600">{error}</p> : null}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-60"
                >
                  {saving ? "Criando..." : "Criar organizacao"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
