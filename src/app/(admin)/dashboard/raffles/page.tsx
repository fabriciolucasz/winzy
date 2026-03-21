"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Loader2, Mail, Radio, Trash2, Trophy, UserRound, X } from "lucide-react";
import { formatNumber, formatRaffleCreatedAt } from "@/lib/utils";

type RaffleItem = {
  id: string;
  name: string;
  slug: string;
  banner: string | null;
  pixValue: number;
  priceTicket: number;
  minTickets: number;
  maxTickets: number;
  collaboratorPrizesEnabled?: boolean;
  collaboratorPrizeFirst?: number | null;
  collaboratorPrizeSecond?: number | null;
  collaboratorPrizeThird?: number | null;
  mysteryPrizes?: Array<{
    id: string;
    name: string;
    value: number;
    chance: number;
    remaining: number;
    totalAmount: number;
  }>;
  status: "DRAFT" | "ACTIVE" | "FINISHED" | "CANCELED";
  createdAt: string;
  soldTicketsCount?: number;
  soldTicketsTotal?: number;
  winner?: {
    id: string;
    createdAt: string;
  } | null;
};

type RafflesResponse = {
  success: boolean;
  mercadoPagoConnected?: boolean;
  raffles?: RaffleItem[];
  tenant?: {
    name: string;
    slug: string;
  };
  error?: string;
};

type RaffleForm = {
  banner: string;
  name: string;
  description: string;
  slug: string;
  pixValue: string;
  priceTicket: string;
  minTickets: string;
  maxTickets: string;
  collaboratorPrizesEnabled: boolean;
  collaboratorPrizeFirst: string;
  collaboratorPrizeSecond: string;
  collaboratorPrizeThird: string;
};

type MysteryPrizeDraft = {
  id: string;
  name: string;
  chance: string;
};

type FeedbackState = {
  kind: "success" | "error";
  text: string;
};

type FormErrors = {
  name: boolean;
  priceTicket: boolean;
  ticketRange: boolean;
  mysteryPrizeIds: string[];
};

type WinnerData = {
  awardId: string;
  drawnAt: string;
  raffle?: {
    id: string;
    name: string;
  };
  client: {
    id: string;
    name: string;
    email: string;
    phone: string;
    cpf: string;
  };
  ticket: {
    id: string;
    number: number;
  };
};

type EditableField =
  | "banner"
  | "name"
  | "description"
  | "slug"
  | "priceTicket"
  | "pixValue"
  | "minTickets"
  | "maxTickets"
  | null;

const initialForm: RaffleForm = {
  banner: "",
  name: "",
  description: "",
  slug: "",
  pixValue: "0",
  priceTicket: "1",
  minTickets: "100",
  maxTickets: "1000000",
  collaboratorPrizesEnabled: false,
  collaboratorPrizeFirst: "",
  collaboratorPrizeSecond: "",
  collaboratorPrizeThird: "",
};

export default function DashboardRafflesPage() {
  const [raffles, setRaffles] = useState<RaffleItem[]>([]);
  const [activeTab, setActiveTab] = useState<"my-raffles" | "create">("my-raffles");
  const [form, setForm] = useState<RaffleForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [mercadoPagoConnected, setMercadoPagoConnected] = useState(false);
  const [tenantName, setTenantName] = useState("Sua organizacao");
  const [tenantSlug, setTenantSlug] = useState("seu-slug");
  const [editingField, setEditingField] = useState<EditableField>(null);
  const [raffleToDelete, setRaffleToDelete] = useState<RaffleItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [mysteryPrizes, setMysteryPrizes] = useState<MysteryPrizeDraft[]>([]);
  const [liveDrawRaffle, setLiveDrawRaffle] = useState<RaffleItem | null>(null);
  const [winnerData, setWinnerData] = useState<WinnerData | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [loadingWinnerData, setLoadingWinnerData] = useState(false);
  const [notifyingWinner, setNotifyingWinner] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({
    name: false,
    priceTicket: false,
    ticketRange: false,
    mysteryPrizeIds: [],
  });

  function formatChance(chance: number) {
    return `${(Math.max(chance, 0) * 100).toFixed(2)}%`;
  }

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }),
    [],
  );

  const pixHelpText = useMemo(() => {
    const hasPix = Number(form.pixValue) > 0;
    return hasPix
      ? "Opcional PIX habilitado para o cliente escolher valor em dinheiro no lugar do premio."
      : "Sem opcao PIX adicional para esta rifa.";
  }, [form.pixValue]);

  async function loadRaffles() {
    setLoading(true);
    try {
      const response = await fetch("/api/dashboard/raffles");
      const data = (await response.json()) as RafflesResponse;

      if (!response.ok || !data.success) {
        setFeedback({ kind: "error", text: data.error || "Nao foi possivel carregar as rifas." });
        return;
      }

      setMercadoPagoConnected(Boolean(data.mercadoPagoConnected));
      if (data.tenant?.name) setTenantName(data.tenant.name);
      if (data.tenant?.slug) setTenantSlug(data.tenant.slug);
      setRaffles(data.raffles || []);
    } catch {
      setFeedback({ kind: "error", text: "Erro de conexao ao carregar rifas." });
    } finally {
      setLoading(false);
    }
  }

  const checkoutMinPreview = useMemo(() => {
    const minTickets = Math.max(Number(form.minTickets || 1), 1);
    const price = Math.max(Number(form.priceTicket || 0), 0);
    return {
      minTickets,
      total: minTickets * price,
    };
  }, [form.minTickets, form.priceTicket]);

  useEffect(() => {
    loadRaffles();
  }, []);

  async function createRaffle() {
    if (!mercadoPagoConnected) {
      setFeedback({ kind: "error", text: "Conecte o Mercado Pago em Configuracoes antes de criar uma rifa." });
      return;
    }

    const nameValid = form.name.trim().length > 0;
    const priceTicketValid = Number.isFinite(Number(form.priceTicket)) && Number(form.priceTicket) > 0;
    const ticketRangeValid =
      Number.isFinite(Number(form.minTickets)) &&
      Number.isFinite(Number(form.maxTickets)) &&
      Number(form.minTickets) >= 1 &&
      Number(form.maxTickets) >= Number(form.minTickets);
    const invalidMysteryPrizeIds = mysteryPrizes
      .filter(
        (prize) =>
          !prize.name.trim() ||
          !Number.isFinite(Number(prize.chance)) ||
          Number(prize.chance) <= 0 ||
          Number(prize.chance) > 1,
      )
      .map((prize) => prize.id);

    setFormErrors({
      name: !nameValid,
      priceTicket: !priceTicketValid,
      ticketRange: !ticketRangeValid,
      mysteryPrizeIds: invalidMysteryPrizeIds,
    });

    if (!nameValid || !priceTicketValid || !ticketRangeValid || invalidMysteryPrizeIds.length > 0) {
      setFeedback({ kind: "error", text: "Revise os campos destacados antes de criar a rifa." });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/dashboard/raffles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          pixValue: Number(form.pixValue),
          priceTicket: Number(form.priceTicket),
          minTickets: Number(form.minTickets),
          maxTickets: Number(form.maxTickets),
          collaboratorPrizesEnabled: form.collaboratorPrizesEnabled,
          collaboratorPrizeFirst: form.collaboratorPrizeFirst,
          collaboratorPrizeSecond: form.collaboratorPrizeSecond,
          collaboratorPrizeThird: form.collaboratorPrizeThird,
          mysteryPrizes: mysteryPrizes.map((prize) => ({
            name: prize.name.trim(),
            value: 1,
            chance: Number(prize.chance),
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setFeedback({ kind: "error", text: data.error || "Nao foi possivel criar a rifa." });
        return;
      }

      setForm(initialForm);
      setMysteryPrizes([]);
      setFormErrors({ name: false, priceTicket: false, ticketRange: false, mysteryPrizeIds: [] });
      setFeedback({ kind: "success", text: "Rifa criada com sucesso." });
      setActiveTab("my-raffles");
      await loadRaffles();
    } catch {
      setFeedback({ kind: "error", text: "Erro de conexao ao criar rifa." });
    } finally {
      setSaving(false);
    }
  }

  function handleRaffleClose(raffle: RaffleItem) {
    setRaffleToDelete(raffle);
  }

  async function confirmDeleteRaffle() {
    if (!raffleToDelete) return;

    const raffleTarget = raffleToDelete;
    const previousRaffles = raffles;

    setDeleting(true);
    setFeedback(null);
    setRaffleToDelete(null);
    setRaffles((current) => current.filter((item) => item.id !== raffleTarget.id));

    try {
      const response = await fetch(`/api/dashboard/raffles?raffleId=${encodeURIComponent(raffleTarget.id)}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !data.success) {
        setRaffles(previousRaffles);
        setFeedback({ kind: "error", text: data.error || "Nao foi possivel remover a rifa." });
        return;
      }

      setFeedback({ kind: "success", text: "Rifa removida com sucesso." });
    } catch {
      setRaffles(previousRaffles);
      setFeedback({ kind: "error", text: "Erro de conexao ao remover rifa." });
    } finally {
      setDeleting(false);
    }
  }

  function beginEdit(field: Exclude<EditableField, null>) {
    setEditingField(field);
  }

  function endEdit() {
    setEditingField(null);
  }

  function addMysteryPrize() {
    setMysteryPrizes((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: "",
        chance: "0.1",
      },
    ]);
  }

  function removeMysteryPrize(id: string) {
    setMysteryPrizes((current) => current.filter((prize) => prize.id !== id));
  }

  function updateMysteryPrize(id: string, field: "name" | "chance", value: string) {
    setMysteryPrizes((current) =>
      current.map((prize) => (prize.id === id ? { ...prize, [field]: value } : prize)),
    );

    if (field === "name" || field === "chance") {
      setFormErrors((prev) => ({
        ...prev,
        mysteryPrizeIds: prev.mysteryPrizeIds.filter((prizeId) => prizeId !== id),
      }));
    }
  }

  function getRaffleProgress(raffle: RaffleItem) {
    const sold = Math.max(raffle.soldTicketsCount || 0, 0);
    const total = Math.max(raffle.soldTicketsTotal || raffle.maxTickets || 1, 1);
    const percent = Math.min((sold / total) * 100, 100);

    return {
      sold,
      total,
      percent,
    };
  }

  function openLiveDraw(raffle: RaffleItem) {
    setLiveDrawRaffle(raffle);
    setWinnerData(null);
  }

  function closeLiveDraw() {
    setLiveDrawRaffle(null);
    setWinnerData(null);
  }

  const hasWinnerForLiveDraw = Boolean(winnerData) || Boolean(liveDrawRaffle?.winner);

  async function startLiveDraw() {
    if (!liveDrawRaffle) return;

    setDrawing(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/dashboard/raffles/${liveDrawRaffle.id}/draw`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setFeedback({ kind: "error", text: data.error || "Nao foi possivel iniciar o sorteio." });
        return;
      }

      setWinnerData(data.winner as WinnerData);
      setFeedback({ kind: "success", text: data.alreadyDrawn ? "Esta rifa ja possui ganhador." : "Sorteio finalizado com sucesso." });
      await loadRaffles();
    } catch {
      setFeedback({ kind: "error", text: "Erro de conexao ao executar o sorteio." });
    } finally {
      setDrawing(false);
    }
  }

  async function fetchWinnerData() {
    if (!liveDrawRaffle) return;

    setLoadingWinnerData(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/dashboard/raffles/${liveDrawRaffle.id}/winner`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        setFeedback({ kind: "error", text: data.error || "Nao foi possivel obter os dados do ganhador." });
        return;
      }

      setWinnerData(data.winner as WinnerData);
    } catch {
      setFeedback({ kind: "error", text: "Erro de conexao ao consultar ganhador." });
    } finally {
      setLoadingWinnerData(false);
    }
  }

  async function notifyWinnerByEmail() {
    if (!liveDrawRaffle) return;

    setNotifyingWinner(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/dashboard/raffles/${liveDrawRaffle.id}/winner/notify`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setFeedback({ kind: "error", text: data.error || "Nao foi possivel notificar o ganhador." });
        return;
      }

      setFeedback({ kind: "success", text: "Ganhador notificado por e-mail com sucesso." });
    } catch {
      setFeedback({ kind: "error", text: "Erro de conexao ao notificar ganhador." });
    } finally {
      setNotifyingWinner(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 shadow-lg backdrop-blur-sm md:p-6">
      <div className="mb-6 border-b border-slate-500/20 pb-4">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-slate-400">Painel administrativo</p>
        <h1 className="mt-2 text-2xl font-mono font-bold uppercase text-zinc-200 md:text-3xl">Rifas</h1>
        <p className="mt-2 text-sm text-slate-300">Crie e gerencie rifas de forma dinamica e interativa.</p>
      </div>

      {!mercadoPagoConnected && (
        <div className="mb-6 rounded-xl border border-amber-300/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-medium">Conexao Mercado Pago obrigatoria</p>
          <p className="mt-1 text-amber-100/90">
            Para criar rifas, conecte primeiro a conta da organizacao no Mercado Pago.
          </p>
          <Link
            href="/dashboard/settings"
            className="mt-3 inline-flex rounded-lg bg-amber-500/90 px-3 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-400"
          >
            Ir para Configuracoes
          </Link>
        </div>
      )}

      <div className="mx-auto max-w-5xl space-y-6">
        <div className="inline-flex rounded-xl border border-white/10 bg-slate-950/40 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("my-raffles")}
            className={`rounded-lg px-3 py-1.5 text-sm ${activeTab === "my-raffles" ? "bg-cyan-600 text-white" : "text-slate-300"}`}
          >
            Minhas Rifas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("create")}
            className={`rounded-lg px-3 py-1.5 text-sm ${activeTab === "create" ? "bg-cyan-600 text-white" : "text-slate-300"}`}
          >
            Criar Rifa
          </button>
        </div>

        {activeTab === "create" ? (
          <div className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
            <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Nova rifa</p>
              </div>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                ACTIVE
              </span>
            </div>

            <div className="rounded-xl border border-slate-500/10 bg-[#0b1220] p-4">
              <div className="grid gap-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">URL do banner</p>
                {editingField === "banner" ? (
                  <input
                    autoFocus
                    value={form.banner}
                    onBlur={endEdit}
                    onChange={(event) => setForm((prev) => ({ ...prev, banner: event.target.value }))}
                    placeholder="https://.../banner.png"
                    className="rounded-lg border border-cyan-400/30 bg-slate-800/70 px-3 py-2 text-sm text-zinc-100 outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => beginEdit("banner")}
                    className="rounded-lg border border-white/10 bg-slate-800/60 px-3 py-2 text-left text-sm text-slate-300 hover:border-cyan-300/30"
                  >
                    {form.banner.trim() || "Clique para inserir a URL do banner"}
                  </button>
                )}
              </div>

              <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
                <div
                  className="h-40 bg-slate-800/60 bg-cover bg-center"
                  style={form.banner.trim() ? { backgroundImage: `url(${form.banner.trim()})` } : undefined}
                >
                  {!form.banner.trim() && (
                    <div className="flex h-full items-center justify-center text-xs uppercase tracking-wide text-slate-500">
                      Banner da rifa
                    </div>
                  )}
                </div>
              </div>

              <div
                className={`mt-4 rounded-xl bg-slate-900/55 p-3 ${formErrors.name ? "border border-rose-400/50" : "border border-white/10"}`}
              >
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Nome da rifa</p>
                {editingField === "name" ? (
                  <input
                    autoFocus
                    value={form.name}
                    onBlur={endEdit}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Ex: MOTO CG TITAN 160 2020/21"
                    className="mt-2 w-full rounded-lg border border-cyan-400/30 bg-slate-800/70 px-3 py-2 text-sm text-zinc-100 outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => beginEdit("name")}
                    className="mt-2 text-left text-lg font-semibold uppercase text-zinc-100 hover:text-cyan-200"
                  >
                    {form.name.trim() || "Sua nova rifa"}
                  </button>
                )}
              </div>

              <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/55 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Descricao</p>
                {editingField === "description" ? (
                  <textarea
                    autoFocus
                    value={form.description}
                    onBlur={endEdit}
                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                    placeholder="Descreva regras, data de sorteio e observacoes importantes."
                    className="mt-2 min-h-24 w-full rounded-lg border border-cyan-400/30 bg-slate-800/70 px-3 py-2 text-sm text-zinc-100 outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => beginEdit("description")}
                    className="mt-2 text-left text-sm text-slate-300 hover:text-zinc-100"
                  >
                    {form.description.trim() ||
                      "Descreva os detalhes da rifa, regras de participacao, data do sorteio e observacoes importantes para os compradores."}
                  </button>
                )}
              </div>

              <div className="mt-3 grid gap-2">
                <label htmlFor="raffle-slug" className="text-[11px] uppercase tracking-wide text-slate-400">
                  Slug (opcional)
                </label>
                {editingField === "slug" ? (
                  <input
                    id="raffle-slug"
                    autoFocus
                    value={form.slug}
                    onBlur={endEdit}
                    onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                    placeholder="moto-cg-titan-160"
                    className="rounded-lg border border-cyan-400/30 bg-slate-800/70 px-3 py-2 text-sm text-zinc-100"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => beginEdit("slug")}
                    className="rounded-lg border border-white/10 bg-slate-800/60 px-3 py-2 text-left text-sm text-slate-300 hover:border-cyan-300/30"
                  >
                    {form.slug.trim() || "Clique para definir o slug"}
                  </button>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div
                  className={`rounded-xl bg-slate-900/55 p-3 ${formErrors.priceTicket ? "border border-rose-400/50" : "border border-white/10"}`}
                >
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Valor do ticket</p>
                  {editingField === "priceTicket" ? (
                    <input
                      autoFocus
                      type="number"
                      step="0.01"
                      value={form.priceTicket}
                      onBlur={endEdit}
                      onChange={(event) => setForm((prev) => ({ ...prev, priceTicket: event.target.value }))}
                      placeholder="1.00"
                      className="mt-2 w-full rounded-lg border border-cyan-400/30 bg-slate-800/70 px-3 py-2 text-sm text-zinc-100"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => beginEdit("priceTicket")}
                      className="mt-2 text-left text-2xl font-semibold text-zinc-100 hover:text-cyan-200"
                    >
                      {currencyFormatter.format(Math.max(Number(form.priceTicket || 0), 0))}
                    </button>
                  )}
                </div>

                <div className="rounded-xl border border-white/10 bg-slate-900/55 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Opcao PIX</p>
                  {editingField === "pixValue" ? (
                    <input
                      autoFocus
                      type="number"
                      step="0.01"
                      value={form.pixValue}
                      onBlur={endEdit}
                      onChange={(event) => setForm((prev) => ({ ...prev, pixValue: event.target.value }))}
                      placeholder="0.00"
                      className="mt-2 w-full rounded-lg border border-cyan-400/30 bg-slate-800/70 px-3 py-2 text-sm text-zinc-100"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => beginEdit("pixValue")}
                      className="mt-2 text-left text-2xl font-semibold text-zinc-100 hover:text-cyan-200"
                    >
                      {currencyFormatter.format(Math.max(Number(form.pixValue || 0), 0))}
                    </button>
                  )}
                </div>
              </div>

              <p className="mt-2 text-xs text-slate-400">{pixHelpText}</p>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div
                  className={`rounded-xl bg-slate-900/55 p-3 ${formErrors.ticketRange ? "border border-rose-400/50" : "border border-white/10"}`}
                >
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Minimo de tickets</p>
                  {editingField === "minTickets" ? (
                    <input
                      autoFocus
                      type="number"
                      value={form.minTickets}
                      onBlur={endEdit}
                      onChange={(event) => setForm((prev) => ({ ...prev, minTickets: event.target.value }))}
                      placeholder="100"
                      className="mt-2 w-full rounded-lg border border-cyan-400/30 bg-slate-800/70 px-3 py-2 text-sm text-zinc-100"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => beginEdit("minTickets")}
                      className="mt-2 text-left text-lg font-semibold text-zinc-100 hover:text-cyan-200"
                    >
                      {formatNumber(Math.max(Number(form.minTickets || 1), 1))}
                    </button>
                  )}
                </div>

                <div
                  className={`rounded-xl bg-slate-900/55 p-3 ${formErrors.ticketRange ? "border border-rose-400/50" : "border border-white/10"}`}
                >
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Maximo de tickets</p>
                  {editingField === "maxTickets" ? (
                    <input
                      autoFocus
                      type="number"
                      value={form.maxTickets}
                      onBlur={endEdit}
                      onChange={(event) => setForm((prev) => ({ ...prev, maxTickets: event.target.value }))}
                      placeholder="1000000"
                      className="mt-2 w-full rounded-lg border border-cyan-400/30 bg-slate-800/70 px-3 py-2 text-sm text-zinc-100"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => beginEdit("maxTickets")}
                      className="mt-2 text-left text-lg font-semibold text-zinc-100 hover:text-cyan-200"
                    >
                      {formatNumber(Math.max(Number(form.maxTickets || 1), 1))}
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/55 p-3">
                <p className="text-[11px] uppercase text-slate-500">Simulacao de checkout minimo</p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-slate-300">{formatNumber(checkoutMinPreview.minTickets)} ticket(s)</p>
                  <p className="text-base font-bold text-emerald-300">
                    {currencyFormatter.format(checkoutMinPreview.total)}
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/55 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Premios para colaboradores</p>
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.collaboratorPrizesEnabled}
                      onClick={() =>
                        setForm((prev) => ({ ...prev, collaboratorPrizesEnabled: !prev.collaboratorPrizesEnabled }))
                      }
                      className={`relative inline-flex h-8 w-14 items-center rounded-full border transition-colors ${form.collaboratorPrizesEnabled ? "border-cyan-300/50 bg-cyan-500/40" : "border-white/20 bg-slate-400/30"}`}
                    >
                      <span
                        className={`inline-block h-6 w-6 rounded-full bg-white shadow transition-transform ${form.collaboratorPrizesEnabled ? "translate-x-7" : "translate-x-1"}`}
                      />
                    </button>
                    <span className="text-xs text-slate-300">Ativar</span>
                  </div>
                </div>

                {form.collaboratorPrizesEnabled ? (
                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.collaboratorPrizeFirst}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, collaboratorPrizeFirst: event.target.value }))
                      }
                      placeholder="1o lugar (R$)"
                      className="rounded-md border border-white/15 bg-slate-800/70 px-2 py-1.5 text-xs text-zinc-100"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.collaboratorPrizeSecond}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, collaboratorPrizeSecond: event.target.value }))
                      }
                      placeholder="2o lugar (R$)"
                      className="rounded-md border border-white/15 bg-slate-800/70 px-2 py-1.5 text-xs text-zinc-100"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.collaboratorPrizeThird}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, collaboratorPrizeThird: event.target.value }))
                      }
                      placeholder="3o lugar (R$)"
                      className="rounded-md border border-white/15 bg-slate-800/70 px-2 py-1.5 text-xs text-zinc-100"
                    />
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-slate-400">Premiacao de colaboradores desativada para esta rifa.</p>
                )}
              </div>

              <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/55 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Premios instantaneos das caixas</p>
                  <button
                    type="button"
                    onClick={addMysteryPrize}
                    className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/20"
                  >
                    + Adicionar premio
                  </button>
                </div>

                {mysteryPrizes.length === 0 ? (
                  <p className="mt-3 text-xs text-slate-400">Nenhum premio instantaneo adicionado.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {mysteryPrizes.map((prize, index) => (
                      <div
                        key={prize.id}
                        className={`grid grid-cols-1 gap-2 rounded-lg bg-slate-950/50 p-2 md:grid-cols-[1fr_130px_auto] ${formErrors.mysteryPrizeIds.includes(prize.id) ? "border border-rose-400/50" : "border border-white/10"}`}
                      >
                        <input
                          value={prize.name}
                          onChange={(event) => updateMysteryPrize(prize.id, "name", event.target.value)}
                          placeholder={`Premio ${index + 1}`}
                          className="rounded-md border border-white/15 bg-slate-800/70 px-2 py-1.5 text-xs text-zinc-100"
                        />
                        <input
                          type="number"
                          step="0.0001"
                          min="0.0001"
                          max="1"
                          value={prize.chance}
                          onChange={(event) => updateMysteryPrize(prize.id, "chance", event.target.value)}
                          placeholder="Chance (0-1)"
                          className="rounded-md border border-white/15 bg-slate-800/70 px-2 py-1.5 text-xs text-zinc-100"
                        />
                        <button
                          type="button"
                          onClick={() => removeMysteryPrize(prize.id)}
                          className="inline-flex items-center justify-center rounded-md border border-red-400/30 bg-red-500/10 px-2 py-1.5 text-red-300 hover:bg-red-500/20"
                          aria-label="Remover premio"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={createRaffle}
                disabled={saving || !mercadoPagoConnected}
                className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Criando..." : !mercadoPagoConnected ? "Conecte o Mercado Pago para criar" : "Criar rifa"}
              </button>
            </div>
          </div>
        ) : null}

        {activeTab === "my-raffles" ? (
          <div className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
            <h2 className="text-sm font-semibold text-zinc-100">Minhas rifas ativas</h2>

            {loading ? (
              <p className="mt-3 text-sm text-slate-400">Carregando...</p>
            ) : raffles.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">Nenhuma rifa cadastrada ainda.</p>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {raffles.map((raffle) => (
                  <article key={raffle.id} className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/70">
                    <div className="relative h-28 w-full overflow-hidden border-b border-white/10 bg-slate-800/50">
                      {raffle.banner ? (
                        <img src={raffle.banner} alt={raffle.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-wide text-slate-400">
                          Sem banner
                        </div>
                      )}
                      <span className="absolute right-2 top-2 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
                        Ativa
                      </span>
                    </div>

                    <div className="p-3">
                      <p className="truncate text-sm font-semibold text-zinc-100">{raffle.name}</p>
                      <p className="mt-1 text-[11px] text-slate-400">ou {currencyFormatter.format(raffle.pixValue || 0)} no PIX</p>

                      <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between text-[11px] text-slate-300">
                          <span>Bilhetes vendidos</span>
                          <span>
                            {getRaffleProgress(raffle).sold}/{getRaffleProgress(raffle).total}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-cyan-400"
                            style={{ width: `${getRaffleProgress(raffle).percent}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-300">
                        <span>Preco do bilhete</span>
                        <span className="font-medium text-zinc-100">{currencyFormatter.format(raffle.priceTicket || 0)}</span>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <Link
                          href={`/${tenantSlug}`}
                          target="_blank"
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-white/15 px-2 py-1.5 text-[11px] text-slate-200 hover:bg-white/10"
                        >
                          <Eye className="h-3.5 w-3.5" /> Visualizar
                        </Link>
                        <button
                          type="button"
                          onClick={() => openLiveDraw(raffle)}
                          className="inline-flex items-center justify-center gap-1 rounded-md border border-cyan-400/30 bg-cyan-500/10 px-2 py-1.5 text-[11px] text-cyan-200 hover:bg-cyan-500/20"
                        >
                          <Radio className="h-3.5 w-3.5" /> Sorteio ao vivo
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRaffleClose(raffle)}
                          aria-label={`Fechar ${raffle.name}`}
                          className="rounded-md border border-white/15 p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <p className="mt-2 text-[10px] text-slate-500">{formatRaffleCreatedAt(raffle.createdAt)}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {liveDrawRaffle ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <p className="text-sm font-semibold text-zinc-100">Sorteio ao vivo - {liveDrawRaffle.name}</p>
                <p className="mt-1 text-xs text-slate-400">Use os botoes abaixo para conduzir o sorteio e notificar o ganhador.</p>
              </div>
              <button
                type="button"
                onClick={closeLiveDraw}
                className="rounded-md border border-white/15 p-1.5 text-slate-300 hover:bg-white/10"
                aria-label="Fechar modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/50 p-4">
              <div className="flex items-center gap-2 text-cyan-200">
                <Trophy className="h-4 w-4" />
                <p className="text-sm font-medium">Pronto para sortear</p>
              </div>
              <p className="mt-1 text-xs text-slate-300">
                Total de {formatNumber(getRaffleProgress(liveDrawRaffle).sold)} bilhetes pagos elegiveis.
              </p>
            </div>

            {winnerData ? (
              <div className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs text-emerald-100">
                <p className="text-sm font-semibold">Ganhador definido</p>
                <p className="mt-1">Nome: {winnerData.client.name}</p>
                <p>Email: {winnerData.client.email}</p>
                <p>Telefone: {winnerData.client.phone}</p>
                <p>CPF: {winnerData.client.cpf}</p>
                <p>Bilhete: #{winnerData.ticket.number}</p>
              </div>
            ) : null}

            <div className={`mt-4 grid grid-cols-1 gap-2 ${hasWinnerForLiveDraw ? "md:grid-cols-3" : "md:grid-cols-1"}`}>
              <button
                type="button"
                onClick={startLiveDraw}
                disabled={drawing}
                className="inline-flex items-center justify-center gap-1 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-medium text-white hover:bg-cyan-700 disabled:opacity-60"
              >
                {drawing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Radio className="h-3.5 w-3.5" />} Iniciar sorteio
              </button>
              {hasWinnerForLiveDraw ? (
                <button
                  type="button"
                  onClick={fetchWinnerData}
                  disabled={loadingWinnerData}
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 disabled:opacity-60"
                >
                  {loadingWinnerData ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserRound className="h-3.5 w-3.5" />} Obter ganhador
                </button>
              ) : null}
              {hasWinnerForLiveDraw ? (
                <button
                  type="button"
                  onClick={notifyWinnerByEmail}
                  disabled={notifyingWinner}
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-60"
                >
                  {notifyingWinner ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />} Notificar
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {raffleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-100">Confirmar remocao</h3>
            <p className="mt-2 text-sm text-slate-300">
              Deseja remover a rifa <span className="font-semibold text-zinc-100">{raffleToDelete.name}</span>?
            </p>
            <p className="mt-1 text-xs text-slate-400">Essa acao nao pode ser desfeita.</p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setRaffleToDelete(null)}
                className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/5 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDeleteRaffle}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Removendo..." : "Remover"}
              </button>
            </div>
          </div>
        </div>
      )}

      {feedback ? (
        <div className="fixed bottom-4 right-4 z-[90] w-full max-w-sm rounded-xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className={`text-sm font-semibold ${feedback.kind === "success" ? "text-emerald-300" : "text-rose-300"}`}>
                {feedback.kind === "success" ? "Sucesso" : "Atencao"}
              </h3>
              <p className="mt-1 text-xs text-slate-200">{feedback.text}</p>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="rounded-md border border-white/15 p-1 text-slate-300 hover:bg-white/10"
              aria-label="Fechar aviso"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
