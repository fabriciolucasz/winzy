"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type TenantSettings = {
  name: string;
  slug: string;
  customDomain: string;
  metaTitle: string;
  metaDescription: string;
  favicon: string;
  logo: string;
  instagram: string;
  telegram: string;
  supportUrl: string;
  mercadoPagoConnected: boolean;
  mercadoPagoAccountId: string;
  mercadoPagoPublicEmail: string;
};

const emptySettings: TenantSettings = {
  name: "",
  slug: "",
  customDomain: "",
  metaTitle: "",
  metaDescription: "",
  favicon: "",
  logo: "",
  instagram: "",
  telegram: "",
  supportUrl: "",
  mercadoPagoConnected: false,
  mercadoPagoAccountId: "",
  mercadoPagoPublicEmail: "",
};

export default function DashboardSettingsPage() {
  const [settings, setSettings] = useState<TenantSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      try {
        const response = await fetch("/api/dashboard/settings");
        const data = await response.json();

        if (!response.ok || !data.success) {
          setMessage(data.error || "Nao foi possivel carregar as configuracoes.");
          return;
        }

        setSettings({
          name: data.tenant.name ?? "",
          slug: data.tenant.slug ?? "",
          customDomain: data.tenant.customDomain ?? "",
          metaTitle: data.tenant.metaTitle ?? "",
          metaDescription: data.tenant.metaDescription ?? "",
          favicon: data.tenant.favicon ?? "",
          logo: data.tenant.logo ?? "",
          instagram: data.tenant.instagram ?? "",
          telegram: data.tenant.telegram ?? "",
          supportUrl: data.tenant.supportUrl ?? "",
          mercadoPagoConnected: Boolean(data.tenant.mercadoPago?.connected),
          mercadoPagoAccountId: data.tenant.mercadoPago?.accountId ?? "",
          mercadoPagoPublicEmail: data.tenant.mercadoPago?.publicEmail ?? "",
        });
      } catch {
        setMessage("Erro de conexao ao carregar configuracoes.");
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  async function saveSettings() {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/dashboard/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: settings.name,
          customDomain: settings.customDomain,
          metaTitle: settings.metaTitle,
          metaDescription: settings.metaDescription,
          favicon: settings.favicon,
          logo: settings.logo,
          instagram: settings.instagram,
          telegram: settings.telegram,
          supportUrl: settings.supportUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setMessage(data.error || "Nao foi possivel salvar.");
        return;
      }

      setMessage("Configuracoes salvas com sucesso.");
    } catch {
      setMessage("Erro de conexao ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 shadow-lg backdrop-blur-sm md:p-6">
      <div className="mb-6 border-b border-slate-500/20 pb-4">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-slate-400">Painel administrativo</p>
        <h1 className="mt-2 text-2xl font-mono font-bold uppercase text-zinc-200 md:text-3xl">Configuracoes</h1>
        <p className="mt-2 text-sm text-slate-300">
          Personalize nome do site, metadata, logo, favicon e links sociais da organizacao ativa.
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Dados de assinatura ficam na aba Assinatura e nao sao editaveis por este painel.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-300">Carregando configuracoes...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-slate-300">Nome do site</label>
            <input
              value={settings.name}
              onChange={(event) => setSettings((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2 text-sm text-zinc-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Slug</label>
            <input
              value={settings.slug}
              disabled
              className="w-full rounded-xl border border-white/10 bg-slate-800/40 px-3 py-2 text-sm text-slate-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Titulo da pagina (meta title)</label>
            <input
              value={settings.metaTitle}
              onChange={(event) => setSettings((prev) => ({ ...prev, metaTitle: event.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2 text-sm text-zinc-100"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-slate-300">Dominio customizado (opcional)</label>
            <input
              value={settings.customDomain}
              onChange={(event) => setSettings((prev) => ({ ...prev, customDomain: event.target.value }))}
              placeholder="sua-organizacao.com.br"
              className="w-full rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2 text-sm text-zinc-100"
            />
            <p className="mt-2 text-xs text-slate-400">
              Use apenas o host (sem http:// ou https://). Sem dominio customizado, a rota publica sera via subdominio da plataforma.
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-slate-300">Descricao da pagina</label>
            <textarea
              value={settings.metaDescription}
              onChange={(event) => setSettings((prev) => ({ ...prev, metaDescription: event.target.value }))}
              className="min-h-28 w-full rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2 text-sm text-zinc-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">URL da logo</label>
            <input
              value={settings.logo}
              onChange={(event) => setSettings((prev) => ({ ...prev, logo: event.target.value }))}
              placeholder="https://..."
              className="w-full rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2 text-sm text-zinc-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">URL do favicon</label>
            <input
              value={settings.favicon}
              onChange={(event) => setSettings((prev) => ({ ...prev, favicon: event.target.value }))}
              placeholder="https://..."
              className="w-full rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2 text-sm text-zinc-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Instagram</label>
            <input
              value={settings.instagram}
              onChange={(event) => setSettings((prev) => ({ ...prev, instagram: event.target.value }))}
              placeholder="https://instagram.com/..."
              className="w-full rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2 text-sm text-zinc-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Telegram</label>
            <input
              value={settings.telegram}
              onChange={(event) => setSettings((prev) => ({ ...prev, telegram: event.target.value }))}
              placeholder="https://t.me/..."
              className="w-full rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2 text-sm text-zinc-100"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-slate-300">Whatsapp / Suporte</label>
            <input
              value={settings.supportUrl}
              onChange={(event) => setSettings((prev) => ({ ...prev, supportUrl: event.target.value }))}
              placeholder="https://wa.me/..."
              className="w-full rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2 text-sm text-zinc-100"
            />
          </div>

          <div className="md:col-span-2 rounded-2xl border border-cyan-300/20 bg-cyan-500/10 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-cyan-200">Integracao financeira</p>
                <p className="mt-1 text-xs text-slate-300">
                  Conecte sua conta do Mercado Pago para operar split payment por organizacao.
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Status: {settings.mercadoPagoConnected ? "Conectado" : "Nao conectado"}
                </p>
                {settings.mercadoPagoAccountId && (
                  <p className="text-xs text-slate-400">Conta MP: {settings.mercadoPagoAccountId}</p>
                )}
                {settings.mercadoPagoPublicEmail && (
                  <p className="text-xs text-slate-400">Email MP: {settings.mercadoPagoPublicEmail}</p>
                )}
              </div>

              <Link
                href="/api/auth/mercadopago/connect"
                className="inline-flex items-center rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700"
              >
                {settings.mercadoPagoConnected ? "Reconectar Mercado Pago" : "Conectar com Mercado Pago"}
              </Link>
            </div>
          </div>

          {message && <p className="md:col-span-2 text-sm text-slate-300">{message}</p>}

          <div className="md:col-span-2 flex justify-end">
            <button
              type="button"
              onClick={saveSettings}
              disabled={saving}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar configuracoes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
