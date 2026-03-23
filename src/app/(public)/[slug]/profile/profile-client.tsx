"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Trophy, Edit, FileText, LogOut, Heart, Gift } from "lucide-react";
import { TenantLogoHeader } from "@/components/tenant/tenant-logo-header";
import { Footer } from "@/components/tenant/footer";
import { clearSession } from "@/lib/session";

type MeResponse = {
  success: boolean;
  client?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    cpf: string;
    nickname?: string | null;
    avatar?: string | null;
    banner?: string | null;
  };
  summary?: {
    totalTickets: number;
    paidTickets: number;
    pendingTickets: number;
    rafflesParticipated: number;
    totalSpent: number;
    winsCount: number;
  };
  tickets?: Array<{
    id: string;
    number: string;
    status: string;
    paymentStatus: string;
    raffle: {
      id: string;
      title: string;
      slug: string;
      image?: string | null;
    };
  }>;
  raffles?: Array<{
    id: string;
    title: string;
    slug: string;
    image?: string | null;
    status: string;
    winnerTicketNumber?: string | null;
  }>;
  prizes?: Array<{
    id: string;
    title: string;
    raffleTitle?: string | null;
    createdAt: string;
  }>;
  boxes?: Array<{
    id: string;
    raffleId: string;
    raffleTitle: string;
    raffleImage?: string | null;
    boxNumber: number;
    status: "OPENED" | "AVAILABLE";
    prizeTitle?: string | null;
    openedAt?: string | null;
  }>;
  payments?: Array<{
    id: string;
    status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELED";
    totalValue: number;
    method: string;
    ticketCount: number;
    createdAt: string;
  }>;
  error?: string;
};

type ClientProfileViewProps = {
  slug: string;
  tenant?: {
    name?: string;
    logoUrl?: string | null;
  };
};

type OpenBoxApiResponse = {
  success?: boolean;
  error?: string;
  prize?: {
    id?: string;
    name?: string;
    value?: number;
    remaining?: number;
  };
};

export function ClientProfileView({ slug, tenant }: ClientProfileViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("");
  const [banner, setBanner] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");

  const [summary, setSummary] = useState<MeResponse["summary"]>();
  const [tickets, setTickets] = useState<MeResponse["tickets"]>([]);
  const [raffles, setRaffles] = useState<MeResponse["raffles"]>([]);
  const [prizes, setPrizes] = useState<MeResponse["prizes"]>([]);
  const [boxes, setBoxes] = useState<MeResponse["boxes"]>([]);
  const [payments, setPayments] = useState<MeResponse["payments"]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isBoxModalOpen, setIsBoxModalOpen] = useState(false);
  const [activeBoxId, setActiveBoxId] = useState<string | null>(null);
  const [boxModalPhase, setBoxModalPhase] = useState<"opening" | "result">("opening");
  const [boxModalMessage, setBoxModalMessage] = useState("");
  const [isOpeningBox, setIsOpeningBox] = useState(false);
  const [isTicketsModalOpen, setIsTicketsModalOpen] = useState(false);
  const [selectedRaffleForTickets, setSelectedRaffleForTickets] = useState<NonNullable<MeResponse["raffles"]>[number] | null>(null);

  function maskCPF(value: string): string {
    const digits = String(value || "").replace(/\D/g, "");
    if (!digits) return "***.***.***-**";
    const lastTwo = digits.slice(-2).padStart(2, "*");
    return `***.***.***-${lastTwo}`;
  }

  const personalBoxes = useMemo(
    () => (boxes || []).map((box, index) => ({ ...box, personalNumber: index + 1 })),
    [boxes],
  );

  const selectedRaffleTickets = useMemo(() => {
    if (!selectedRaffleForTickets) return [];
    return (tickets || [])
      .filter(
        (ticket) =>
          ticket.raffle.id === selectedRaffleForTickets.id ||
          ticket.raffle.slug === selectedRaffleForTickets.slug,
      )
      .sort((a, b) => Number(a.number) - Number(b.number));
  }, [tickets, selectedRaffleForTickets]);

  const selectedRaffleWinningTicket = useMemo(() => {
    if (!selectedRaffleForTickets || selectedRaffleForTickets.status !== "FINISHED") {
      return null;
    }

    const winnerNumber = selectedRaffleForTickets.winnerTicketNumber ?? null;
    if (!winnerNumber) {
      return null;
    }

    const hasWinnerTicket = selectedRaffleTickets.some((ticket) => ticket.number === winnerNumber);
    return hasWinnerTicket ? winnerNumber : null;
  }, [selectedRaffleForTickets, selectedRaffleTickets]);

  useEffect(() => {
    if (!slug) {
      return;
    }

    void loadProfile();
  }, [slug]);

  async function loadProfile() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/public/client/me?slug=${encodeURIComponent(slug)}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as MeResponse;

      if (!response.ok || !data.success || !data.client) {
        if (response.status === 401 || response.status === 403) {
          router.replace(`/${slug}/login`);
          return;
        }

        setError(data.error || "Nao foi possivel carregar o perfil.");
        return;
      }

      setName(data.client.name);
      setNickname(data.client.nickname || data.client.name.split(" ")[0]);
      setAvatar(data.client.avatar || "");
      setBanner(data.client.banner || "");
      setEmail(data.client.email);
      setCpf(data.client.cpf || "");

      setSummary(data.summary);
      setTickets(data.tickets || []);
      setRaffles(data.raffles || []);
      setPrizes(data.prizes || []);
      setBoxes(data.boxes || []);
      setPayments(data.payments || []);
    } catch {
      setError("Erro de conexao ao carregar perfil.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    setIsSaving(true);
    try {
      const response = await fetch("/api/public/client/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name, nickname, avatar, banner }),
      });

      const data = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !data.success) {
        setError(data.error || "Nao foi possivel salvar perfil.");
        return;
      }

      setMessage("Perfil atualizado com sucesso.");
      setIsEditing(false);
      router.refresh();
    } catch {
      setError("Erro de conexao ao salvar perfil.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/public/client/logout", { method: "POST" });
    clearSession();
    router.replace(`/${slug}`);
    router.refresh();
  }

  async function handleBoxClick(box: NonNullable<MeResponse["boxes"]>[number]) {
    setError("");
    setMessage("");

    if (box.status === "OPENED") {
      setActiveBoxId(box.id);
      setBoxModalPhase("result");
      setBoxModalMessage(box.prizeTitle || "Nada, essa caixa veio vazia kk");
      setIsBoxModalOpen(true);
      return;
    }

    if (isOpeningBox) {
      return;
    }

    setActiveBoxId(box.id);
    setBoxModalPhase("opening");
    setBoxModalMessage("");
    setIsBoxModalOpen(true);
    setIsOpeningBox(true);

    try {
      const response = await fetch(`/api/mystery-box/${box.raffleId}/open?t=${Date.now()}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Pragma": "no-cache",
        },
      });

      const data = (await response.json()) as OpenBoxApiResponse;

      if (!response.ok || !data.success) {
        setBoxModalPhase("result");
        setBoxModalMessage(data.error || "Nao foi possivel abrir a caixa agora.");
        return;
      }

      setBoxModalPhase("result");
      setBoxModalMessage(data.prize?.name || "Nada, essa caixa veio vazia kk");
      await loadProfile();
    } catch {
      setBoxModalPhase("result");
      setBoxModalMessage("Erro de conexao ao abrir caixa.");
    } finally {
      setIsOpeningBox(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10">
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-sm text-slate-300"
        >
          Carregando seu perfil...
        </motion.p>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-40 border-b border-slate-500/10 bg-slate-900/85 backdrop-blur px-4 py-2.5"
      >
        <TenantLogoHeader
          href={`/${slug}`}
          logoUrl={tenant?.logoUrl}
          tenantName={tenant?.name}
          compact
        />
      </motion.div>

      <main className="mx-auto w-full max-w-6xl flex-1">
        {/* Banner Section */}
        <div className="relative">
          <div className="h-48 w-full overflow-hidden rounded-b-3xl bg-gradient-to-r from-emerald-500/20 via-slate-900 to-slate-900">
            {banner ? (
              <img
                src={banner}
                alt="Profile banner"
                className="h-full w-full rounded-b-3xl object-cover"
              />
            ) : (
              <div className="absolute inset-0 rounded-b-3xl bg-gradient-to-b from-emerald-500/20 to-slate-900" />
            )}
          </div>

          {/* Profile Overlap */}
          <div className="px-4 md:px-6">
            <div className="relative -mt-20 mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="flex items-end gap-4">
                {/* Avatar */}
                <div className="relative">
                  <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-slate-950 bg-gradient-to-br from-emerald-400 to-slate-700 shadow-lg">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl font-bold text-white">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Profile Info */}
                <div className="pb-2">
                  <h1 className="text-3xl font-bold text-white">{nickname}</h1>
                  <p className="text-sm text-slate-400">{email}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    CPF: {maskCPF(cpf)}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              {!isEditing && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20"
                  >
                    <Edit size={16} />
                    Editar Perfil
                  </button>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20"
                  >
                    <LogOut size={16} />
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="px-4 md:px-6 pb-12">
          {error && (
            <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}
          {message && (
            <p className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              {message}
            </p>
          )}

          {/* Stats Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mb-8 grid gap-4 md:grid-cols-3"
          >
            <div className="rounded-lg border border-white/10 bg-slate-900/40 p-6">
              <p className="text-xs font-mono uppercase tracking-wider text-slate-400">Total Gasto</p>
              <p className="mt-2 text-2xl font-bold text-emerald-400">
                R$ {(summary?.totalSpent || 0).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-slate-900/40 p-6">
              <p className="text-xs font-mono uppercase tracking-wider text-slate-400">Bilhetes Comprados</p>
              <p className="mt-2 text-2xl font-bold text-emerald-400">{summary?.totalTickets || 0}</p>
            </div>

            <div className="rounded-lg border border-white/10 bg-slate-900/40 p-6">
              <p className="text-xs font-mono uppercase tracking-wider text-slate-400">Rifas Participando</p>
              <p className="mt-2 text-2xl font-bold text-amber-400">{summary?.rafflesParticipated || 0}</p>
            </div>
          </motion.section>

          {/* Content Tabs */}
          {isEditing ? (
            // Edit Form
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 max-w-2xl"
            >
              <h2 className="text-lg font-semibold text-zinc-100 mb-4">Editar Perfil</h2>
              <form className="grid gap-4" onSubmit={handleSaveProfile}>
                <div>
                  <label className="text-xs font-medium text-slate-400">Nome</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-slate-800/70 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400">Apelido (Como você quer ser chamado)</label>
                  <input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-slate-800/70 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400">Avatar (URL da imagem)</label>
                  <input
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-slate-800/70 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400">Banner (URL da imagem)</label>
                  <input
                    value={banner}
                    onChange={(e) => setBanner(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-slate-800/70 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400">Email (Não pode ser alterado)</label>
                  <input
                    value={email}
                    disabled
                    className="mt-1 w-full cursor-not-allowed rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-400"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-[#0B1120] transition-colors hover:bg-emerald-400 disabled:opacity-70"
                  >
                    {isSaving ? "Salvando..." : "Salvar alterações"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.article>
          ) : (
            // View Sections
            <div className="space-y-6">
              {/* Achievements Section */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <div className="mb-4 flex items-center gap-2">
                  <Trophy size={20} className="text-amber-400" />
                  <h2 className="text-lg font-semibold text-white">Minhas Caixas (Conquistas)</h2>
                </div>

                {personalBoxes.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {personalBoxes.map((box) => (
                      <button
                        key={box.id}
                        type="button"
                        onClick={() => handleBoxClick(box)}
                        disabled={isOpeningBox && activeBoxId === box.id}
                        className={`rounded-lg border p-4 transition-colors ${box.status === "OPENED"
                          ? "border-white/10 bg-slate-900/25 opacity-75"
                          : "border-emerald-400/40 bg-emerald-500/10"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${box.status === "OPENED" ? "bg-slate-700/40" : "bg-emerald-500/20"
                            }`}>
                            <Trophy size={24} className={box.status === "OPENED" ? "text-slate-400" : "text-emerald-300"} />
                          </div>
                          <div>
                            <p className="font-medium text-white">Caixa #{box.personalNumber}</p>
                            {box.status === "OPENED" ? (
                              <p className="text-xs text-slate-400">Toque para ver o resultado</p>
                            ) : (
                              <p className="text-xs text-emerald-300">Disponível para abrir</p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-white/10 bg-slate-900/30 p-8 text-center">
                    <Trophy size={32} className="mx-auto mb-2 text-slate-600" />
                    <p className="text-sm text-slate-400">Nenhuma caixa conquistada ainda</p>
                  </div>
                )}
              </motion.section>

              {/* Payment History */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
              >
                <div className="mb-4 flex items-center gap-2">
                  <FileText size={20} className="text-emerald-400" />
                  <h2 className="text-lg font-semibold text-white">Histórico de Pagamentos</h2>
                </div>

                {payments && payments.length > 0 ? (
                  <div className="space-y-3">
                    {payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/30 p-4 transition-colors hover:border-emerald-500/30 hover:bg-slate-900/50"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">
                            {payment.ticketCount} bilhete{payment.ticketCount > 1 ? "s" : ""}
                          </p>
                          <p className="text-xs text-slate-400">
                            {new Date(payment.createdAt).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })} • {payment.method}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 ml-4">
                          <div className="text-right">
                            <p className="text-sm font-semibold text-white">
                              R$ {payment.totalValue.toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </p>
                          </div>

                          {payment.status === "COMPLETED" && (
                            <div className="flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-1">
                              <span className="text-xs font-medium text-emerald-200">✓ Confirmado</span>
                            </div>
                          )}
                          {payment.status === "PENDING" && (
                            <div className="flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-1">
                              <span className="text-xs font-medium text-amber-200">⏱ Pendente</span>
                            </div>
                          )}
                          {(payment.status === "FAILED" || payment.status === "CANCELED") && (
                            <div className="flex items-center gap-1 rounded-full bg-red-500/20 border border-red-500/40 px-2 py-1">
                              <span className="text-xs font-medium text-red-200">✕ Falhou</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-white/10 bg-slate-900/30 p-8 text-center">
                    <FileText size={32} className="mx-auto mb-2 text-slate-600" />
                    <p className="text-sm text-slate-400">Nenhum pagamento realizado ainda</p>
                  </div>
                )}
              </motion.section>

              {/* Raffles Participating */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                <div className="mb-4 flex items-center gap-2">
                  <Heart size={20} className="text-red-400" />
                  <h2 className="text-lg font-semibold text-white">Rifas que Participo</h2>
                </div>

                {raffles && raffles.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {raffles.map((raffle) => (
                      <button
                        key={raffle.id || raffle.slug}
                        onClick={() => {
                          setSelectedRaffleForTickets(raffle);
                          setIsTicketsModalOpen(true);
                        }}
                        className="overflow-hidden rounded-lg border border-white/10 bg-slate-900/30 text-left transition-colors hover:border-red-500/50 hover:bg-slate-900/50"
                      >
                        <div className="relative h-24 w-full bg-slate-800/60">
                          {raffle.image ? (
                            <img
                              src={raffle.image}
                              alt={raffle.title}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/30 to-transparent" />
                          <p className="absolute bottom-2 left-3 text-sm font-semibold text-white">{raffle.title}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-white/10 bg-slate-900/30 p-8 text-center">
                    <Heart size={32} className="mx-auto mb-2 text-slate-600" />
                    <p className="text-sm text-slate-400">Você ainda não participa de nenhuma rifa</p>
                  </div>
                )}
              </motion.section>
            </div>
          )}
        </div>
      </main>

      {isBoxModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900/95 p-5 shadow-2xl">
            {boxModalPhase === "opening" ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <motion.div
                  animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.06, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity }}
                  className="flex h-20 w-20 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-500/15"
                >
                  <Gift size={34} className="text-emerald-300" />
                </motion.div>
                <p className="text-sm font-medium text-emerald-200">Abrindo sua caixa...</p>
                <p className="text-xs text-slate-400">Validando regras de seguranca no servidor.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center justify-between w-full pb-3 border-b border-white/10">
                  <p className="text-xs uppercase tracking-wide font-semibold text-slate-300">Resultado da Caixa</p>
                  <button
                    type="button"
                    onClick={() => setIsBoxModalOpen(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                {boxModalMessage && boxModalMessage.toLowerCase().includes("vazia") ? (
                  // Caixa Vazia
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-full rounded-xl border-2 border-slate-500/40 bg-gradient-to-br from-slate-700/20 to-slate-900/40 p-6 flex flex-col items-center gap-3 text-center"
                  >
                    <motion.div
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="flex h-16 w-16 items-center justify-center"
                    >
                      <div className="text-4xl">🪦</div>
                    </motion.div>
                    <div>
                      <p className="text-lg font-bold text-slate-300 leading-tight">Nada... só vento!</p>
                      <p className="text-xs text-slate-500 mt-2">Essa caixa veio vazia. Azar na próxima!</p>
                    </div>
                  </motion.div>
                ) : boxModalMessage === "Nao há premios instantaneos disponiveis no momento." || boxModalMessage?.includes("esgotado") ? (
                  // Prêmios Esgotados
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-full rounded-xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-900/20 p-6 flex flex-col items-center gap-3 text-center"
                  >
                    <div className="flex h-16 w-16 items-center justify-center text-3xl">🏜️</div>
                    <div>
                      <p className="text-lg font-bold text-amber-200 leading-tight">Todos os prêmios acabaram!</p>
                      <p className="text-xs text-amber-300/70 mt-2">Os prêmios desta rifa foram todos resgatados. Tente uma outra!</p>
                    </div>
                  </motion.div>
                ) : (
                  // Prêmio Normal ou Valioso
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0, rotateX: 90 }}
                    animate={{ scale: 1, opacity: 1, rotateX: 0 }}
                    transition={{ duration: 0.6, type: "spring" }}
                    className={`w-full rounded-xl border-2 p-6 flex flex-col items-center gap-4 text-center ${boxModalMessage?.includes("R$") || boxModalMessage?.includes("iPhone")
                        ? "border-amber-400/50 bg-gradient-to-br from-amber-500/20 via-amber-600/10 to-slate-900/30 shadow-lg shadow-amber-500/20"
                        : "border-emerald-400/40 bg-gradient-to-br from-emerald-500/15 to-slate-900/25"
                      }`}
                  >
                    <motion.div
                      animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      className={`flex h-16 w-16 items-center justify-center rounded-lg border ${boxModalMessage?.includes("R$") || boxModalMessage?.includes("iPhone")
                          ? "bg-amber-500/20 border-amber-400/60"
                          : "bg-emerald-500/20 border-emerald-400/60"
                        }`}
                    >
                      <Gift size={32} className={boxModalMessage?.includes("R$") || boxModalMessage?.includes("iPhone") ? "text-amber-300" : "text-emerald-300"} />
                    </motion.div>
                    <div>
                      <p className={`text-xl font-bold leading-tight ${boxModalMessage?.includes("R$") || boxModalMessage?.includes("iPhone")
                          ? "text-amber-100"
                          : "text-emerald-100"
                        }`}>
                        {boxModalMessage}
                      </p>
                      <p className={`text-xs mt-2 ${boxModalMessage?.includes("R$") || boxModalMessage?.includes("iPhone")
                          ? "text-amber-200/60"
                          : "text-emerald-200/60"
                        }`}>
                        ✓ Prêmio resgatado com sucesso!
                      </p>
                    </div>
                  </motion.div>
                )}

                <button
                  type="button"
                  onClick={() => setIsBoxModalOpen(false)}
                  className="mt-4 w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-[#0B1120] hover:bg-emerald-400 transition-colors"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {isTicketsModalOpen && selectedRaffleForTickets ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => {
            setIsTicketsModalOpen(false);
            setSelectedRaffleForTickets(null);
          }}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900/95 p-5 shadow-2xl max-h-[80vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">{selectedRaffleForTickets.title}</h3>
              <button
                type="button"
                onClick={() => {
                  setIsTicketsModalOpen(false);
                  setSelectedRaffleForTickets(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {selectedRaffleTickets && selectedRaffleTickets.length > 0 ? (
              <div>
                <p className="text-xs text-slate-400 mb-3 font-medium">
                  {selectedRaffleTickets.length} número{selectedRaffleTickets.length !== 1 ? "s" : ""} cadastrado{selectedRaffleTickets.length !== 1 ? "s" : ""}
                </p>
                {selectedRaffleForTickets.status === "FINISHED" ? (
                  <p className="mb-3 text-xs text-slate-400">
                    Rifa finalizada: números desativados
                    {selectedRaffleForTickets.winnerTicketNumber
                      ? ` e número vencedor em destaque (${selectedRaffleForTickets.winnerTicketNumber}).`
                      : "."}
                  </p>
                ) : null}
                {selectedRaffleWinningTicket ? (
                  <div className="mb-3 rounded-lg border border-amber-300/50 bg-amber-400/20 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-amber-100">
                    Seu número vencedor: {selectedRaffleWinningTicket}
                  </div>
                ) : null}
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {selectedRaffleTickets.map((ticket) => {
                    const isFinished = selectedRaffleForTickets.status === "FINISHED";
                    const winnerNumber = selectedRaffleForTickets.winnerTicketNumber ?? null;
                    const isHighlighted = Boolean(isFinished && winnerNumber && ticket.number === winnerNumber);

                    return (
                      <div
                        key={ticket.id}
                        className={`flex items-center justify-center rounded-lg border p-2 text-center text-sm font-semibold transition-all ${isHighlighted
                          ? "border-amber-300/60 bg-amber-400/20 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.25)]"
                          : isFinished
                            ? "border-slate-500/20 bg-slate-900/30 text-slate-500"
                            : "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                          }`}
                      >
                        {ticket.number}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-6">
                Nenhum bilhete encontrado para essa rifa
              </p>
            )}

            <button
              type="button"
              onClick={() => {
                setIsTicketsModalOpen(false);
                setSelectedRaffleForTickets(null);
              }}
              className="mt-4 w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-[#0B1120] hover:bg-emerald-400 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      ) : null}

      <Footer />
    </div>
  );
}
