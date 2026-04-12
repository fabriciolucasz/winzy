"use client";

import { useApp } from "@/contexts";
import { motion } from "motion/react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { BadgeCheck, Check, CircleHelp, Gift, Instagram, MessageCircle, Minus, Plus, ShoppingBag, Ticket, Trophy, Users, User, X } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";

type RankingEntry = {
  position: number;
  name: string;
  tickets: number;
  color?: string;
};

type RankingResponse = {
  success?: boolean;
  ranking?: RankingEntry[];
  userPosition?: {
    position: number;
    tickets: number;
  } | null;
};

type MysteryPrize = {
  id: string;
  title: string;
  description: string | null;
  value: number;
  prizeType: "MONETARY" | "PHYSICAL";
  chance?: number;
  remaining: number;
  totalAmount: number;
};

type RankPrizeCard = {
  positionLabel: string;
  positionColorClass: string;
  cardClass: string;
  prizeLabel: string;
};

type PixPaymentInfo = {
  paymentId: string;
  totalValue: number;
  qrCode: string;
  qrCodeBase64: string;
  createdAt?: string;
};

type PixPaymentApiResponse = {
  success?: boolean;
  error?: string;
  code?: string;
  message?: string;
  payment?: {
    id: string;
    externalId?: string | null;
    totalValue: number;
    qrCode: string;
    qrCodeBase64: string;
    status?: string;
    createdAt?: string;
  };
};

export function Raffle() {
  const { tenant, raffle, user, ticketCount, setTicketCount } = useApp();

  const formattedDescription = useMemo(() => {
    const rawDescription = raffle?.description ?? "";

    return rawDescription
      .replace(/\\n/g, "\n")
      .replace(/\r\n/g, "\n")
      .replace(/n-\s/g, "\n- ");
  }, [raffle?.description]);

  const [rankingList, setRankingList] = useState<RankingEntry[]>([]);
  const [userRankingPosition, setUserRankingPosition] = useState<{
    position: number;
    tickets: number;
  } | null>(null);
  const [prizes, setPrizes] = useState<MysteryPrize[]>([]);
  const [isOwnerCardOpen, setIsOwnerCardOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutInfo, setCheckoutInfo] = useState<PixPaymentInfo | null>(null);
  const [pendingPaymentOffer, setPendingPaymentOffer] = useState<PixPaymentInfo | null>(null);
  const [pixDialogOpen, setPixDialogOpen] = useState(false);
  const [pixDialogMinimized, setPixDialogMinimized] = useState(false);
  const [activeRankCard, setActiveRankCard] = useState<string | null>(null);

  /**
   * Calcula caixas ganhas para uma quantidade específica de bilhetes.
   * Máximo 6 caixas por lote de compra.
   */
  function getBoxesFromTickets(ticketCount: number): number {
    if (ticketCount >= 1200) return 6;
    if (ticketCount >= 600) return 2;
    if (ticketCount >= 400) return 1;
    return 0;
  }

  const handleQuantitySelect = (qty: number) => {
    setTicketCount(prev => {
      const newCount = Math.max(raffle?.minNumbers ?? 1, prev + qty);
      return Math.min(newCount, 2000); // Limita a 2000 bilhetes
    });
  };

  const handleIncrease = () => {
    setTicketCount(prev => {
      const newCount = prev + 1;
      return Math.min(newCount, 2000); // Limita a 2000 bilhetes
    });
  };

  const handleDecrease = () => {
    setTicketCount((prev) => Math.max(raffle?.minNumbers ?? 1, prev - 1));
  };

  async function fetchPrizes() {
    if (!raffle?.id) return;

    try {
      const res = await fetch(`/api/mystery-box/${raffle.id}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return;

      const data = await res.json();
      setPrizes(data.prizes ?? []);
    } catch (e) {
      console.error("Failed to fetch mystery prizes", e);
    }
  }

  useEffect(() => {
    fetchPrizes();
  }, [raffle?.id]);

  const mysteryBoxRules = [
    { boxes: 1, minTickets: 400 },
    { boxes: 2, minTickets: 600 },
    { boxes: 6, minTickets: 1200 },
  ];

  const rankPrizeCards = useMemo<RankPrizeCard[]>(() => {
    const labels = ["1º", "2º", "3º"];
    const positionColorClasses = ["text-yellow-400", "text-gray-400", "text-yellow-700"];
    const cardClasses = ["bg-yellow-500/10", "bg-gray-500/10", "bg-yellow-700/10"];
    const prizeValues = [
      raffle?.collaboratorPrizeFirst ?? null,
      raffle?.collaboratorPrizeSecond ?? null,
      raffle?.collaboratorPrizeThird ?? null,
    ];

    return labels.map((label, index) => {
      const value = prizeValues[index];
      const hasPrize = typeof value === "number" && value > 0;

      return {
        positionLabel: label,
        positionColorClass: positionColorClasses[index],
        cardClass: cardClasses[index],
        prizeLabel: hasPrize ? formatCurrency(value) : "Nao definido",
      };
    });
  }, [
    raffle?.collaboratorPrizesEnabled,
    raffle?.collaboratorPrizeFirst,
    raffle?.collaboratorPrizeSecond,
    raffle?.collaboratorPrizeThird,
  ]);

  const showCollaboratorRanking = useMemo(() => {
    const hasAnyCollaboratorPrize =
      (typeof raffle?.collaboratorPrizeFirst === "number" && raffle.collaboratorPrizeFirst > 0) ||
      (typeof raffle?.collaboratorPrizeSecond === "number" && raffle.collaboratorPrizeSecond > 0) ||
      (typeof raffle?.collaboratorPrizeThird === "number" && raffle.collaboratorPrizeThird > 0);

    return Boolean(raffle?.collaboratorPrizesEnabled && hasAnyCollaboratorPrize);
  }, [
    raffle?.collaboratorPrizesEnabled,
    raffle?.collaboratorPrizeFirst,
    raffle?.collaboratorPrizeSecond,
    raffle?.collaboratorPrizeThird,
  ]);

  useEffect(() => {
    async function fetchRanking() {
      if (!tenant?.slug || !raffle?.id || !showCollaboratorRanking) {
        setRankingList([]);
        setUserRankingPosition(null);
        return;
      }
      try {
        const res = await fetch(`/api/ranking/${tenant.slug}?raffleId=${raffle.id}`);
        if (res.ok) {
          const data = (await res.json()) as RankingResponse;
          setRankingList(data.ranking || []);
          setUserRankingPosition(data.userPosition ?? null);
        }
      } catch (e) {
        console.error('Failed to fetch ranking', e);
      }
    }
    fetchRanking();
  }, [tenant?.slug, raffle?.id, showCollaboratorRanking]);

  const rankingPrizeByPosition = useMemo(() => {
    const first = typeof raffle?.collaboratorPrizeFirst === "number" && raffle.collaboratorPrizeFirst > 0
      ? formatCurrency(raffle.collaboratorPrizeFirst)
      : "Nao definido";
    const second = typeof raffle?.collaboratorPrizeSecond === "number" && raffle.collaboratorPrizeSecond > 0
      ? formatCurrency(raffle.collaboratorPrizeSecond)
      : "Nao definido";
    const third = typeof raffle?.collaboratorPrizeThird === "number" && raffle.collaboratorPrizeThird > 0
      ? formatCurrency(raffle.collaboratorPrizeThird)
      : "Nao definido";

    return {
      1: first,
      2: second,
      3: third,
    } as Record<number, string>;
  }, [
    raffle?.collaboratorPrizeFirst,
    raffle?.collaboratorPrizeSecond,
    raffle?.collaboratorPrizeThird,
  ]);

  const hasAvailableMysteryPrizes = useMemo(
    () => prizes.some((prize) => prize.remaining > 0),
    [prizes],
  );

  const hasConfiguredMysteryPrizes = prizes.length > 0;

  if (!raffle) return null;

  async function requestPixPayment(forceNewPayment: boolean) {
    if (!raffle || !tenant) return;

    setCheckoutError(null);

    if (!user?.name || !user?.email || !user?.cpf || !user?.phone) {
      setCheckoutError("Para pagar com PIX, complete seu cadastro com nome, email, CPF e telefone.");
      return;
    }

    setIsPaying(true);

    try {
      const response = await fetch("/api/payments/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raffleId: raffle.id,
          ticketCount,
          totalValue: Number((Number(raffle.price) * ticketCount).toFixed(2)),
          forceNewPayment,
          customer: {
            name: user.name,
            email: user.email,
            cpf: user.cpf,
            phone: user.phone,
          },
        }),
      });

      const data = (await response.json()) as PixPaymentApiResponse;

      if (response.status === 409 && data.code === "PENDING_PAYMENT_EXISTS" && data.payment) {
        setPendingPaymentOffer({
          paymentId: data.payment.id,
          totalValue: Number(data.payment.totalValue || 0),
          qrCode: data.payment.qrCode || "",
          qrCodeBase64: data.payment.qrCodeBase64 || "",
          createdAt: data.payment.createdAt,
        });
        setCheckoutInfo(null);
        setPixDialogMinimized(false);
        setPixDialogOpen(true);
        return;
      }

      if (!response.ok || !data.success) {
        setCheckoutError(data.error || "Nao foi possivel gerar o PIX.");
        return;
      }

      if (!data.payment) {
        setCheckoutError("Nao foi possivel montar os dados do PIX.");
        return;
      }

      setPendingPaymentOffer(null);

      setCheckoutInfo({
        paymentId: data.payment.id,
        totalValue: Number(data.payment.totalValue || 0),
        qrCode: data.payment.qrCode || "",
        qrCodeBase64: data.payment.qrCodeBase64 || "",
        createdAt: data.payment.createdAt,
      });
      setPixDialogMinimized(false);
      setPixDialogOpen(true);
    } catch {
      setCheckoutError("Erro de conexao ao gerar pagamento PIX.");
    } finally {
      setIsPaying(false);
    }
  }

  async function handlePixPayment() {
    setCheckoutInfo(null);
    setPendingPaymentOffer(null);
    await requestPixPayment(false);
  }

  function minimizePixDialog() {
    setPixDialogOpen(false);
    if (checkoutInfo || pendingPaymentOffer) {
      setPixDialogMinimized(true);
    }
  }

  function closePixDialogCompletely() {
    setPixDialogOpen(false);
    setPixDialogMinimized(false);
    setCheckoutInfo(null);
    setPendingPaymentOffer(null);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col gap-6 px-3 py-4 sm:gap-8 sm:px-0"
    >
      {/* Detalhes da Rifa */}
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-2xl border border-slate-500/5 bg-slate-800/40 p-4 shadow-lg backdrop-blur-xl sm:p-6">
        <div>
          <button
            type="button"
            onClick={() => setIsOwnerCardOpen((prev) => !prev)}
            className="flex w-full items-center gap-3 rounded-xl p-1 text-left transition-colors hover:bg-white/5 sm:gap-4"
          >
            <Avatar size="lg">
              {tenant?.owner?.avatarUrl ? (
                <>
                  <AvatarImage
                    src={tenant.owner.avatarUrl}
                    alt={tenant.owner.name}
                  />
                </>
              ) : (
                <AvatarFallback className="bg-slate-900/50">{tenant?.owner?.name.charAt(0).toUpperCase()}</AvatarFallback>
              )}
            </Avatar>
            <div className="w-full flex flex-col">
              <div className="flex items-center">
                <span className="text-lg font-semibold text-white">{tenant?.owner?.name}</span>
                <BadgeCheck size={16} className="ml-1 text-emerald-500" />
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-gray-300 uppercase font-mono font-semibold">{raffle?.title}</span>
                <span className="text-xs text-gray-300 font-mono">ou {formatCurrency(Number(raffle?.pixText) || 0)} no PIX</span>
              </div>
            </div>
          </button>

          {isOwnerCardOpen && (
            <div className="mt-3 grid gap-2 rounded-xl border border-white/10 bg-slate-900/55 p-3 text-sm">
              <p className="text-xs uppercase tracking-wide text-slate-400">Canais da organizacao</p>
              {tenant?.instagramUrl && (
                <a
                  href={tenant.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-slate-200 transition-colors hover:text-white"
                >
                  <Instagram size={14} /> Instagram
                </a>
              )}
              {tenant?.telegramUrl && (
                <a
                  href={tenant.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-slate-200 transition-colors hover:text-white"
                >
                  <MessageCircle size={14} /> Telegram
                </a>
              )}
              {tenant?.supportUrl && (
                <a
                  href={tenant.supportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-slate-200 transition-colors hover:text-white"
                >
                  <MessageCircle size={14} /> Whatsapp/Suporte
                </a>
              )}
              {!tenant?.instagramUrl && !tenant?.telegramUrl && !tenant?.supportUrl && (
                <p className="text-xs text-slate-400">Nenhum canal de contato configurado ainda.</p>
              )}
            </div>
          )}
        </div>

        <div className="relative overflow-hidden rounded-xl">
          {raffle?.bannerUrl ? (
            <>
              <Image
                src={raffle.bannerUrl}
                alt={raffle.title}
                width={800}
                height={400}
                className="w-full aspect-[5/4] object-cover transition-transform duration-500 hover:scale-105"
              />

              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="absolute bottom-3 left-3 flex flex-col items-center justify-center rounded-xl bg-[#11161d]/80 px-3 py-1.5 leading-tight shadow-xl backdrop-blur-md sm:bottom-5 sm:left-5 sm:px-4"
              >
                <span className="text-[7px] font-bold text-stone-400 uppercase tracking-widest text-center">por apenas</span>
                <span className="text-sm font-black text-white text-center">{raffle?.price ? formatCurrency(Number(raffle.price)) : 'Preço não disponível'}</span>
              </motion.div>
            </>
          ) : (
            <div className="flex aspect-[5/4] items-center justify-center bg-white/5 md:aspect-[16/11]">
              <p className="text-sm font-black uppercase text-stone-500">Sem imagem</p>
            </div>
          )}
        </div>

        <div>
          <p className="text-xs text-stone-500">{raffle?.drawDate ? `Criada em ${formatDate(String(raffle.drawDate))}` : 'Criada recentemente'}</p>
        </div>
      </div>

      {/* Botão Ver Meus Bilhetes */}
      {user && (
        <div className="mx-auto w-full max-w-2xl">
          <a href={`/${tenant?.slug}/profile`} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 px-4 py-2 text-emerald-400 font-medium hover:from-emerald-500/30 hover:to-emerald-600/30 transition-colors border border-emerald-500/30">
            <User size={16} />
            Ver meus bilhetes
          </a>
        </div>
      )}

      {/* Descrição da Rifa */}
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-2xl border border-slate-500/5 bg-slate-800/40 p-4 shadow-lg backdrop-blur-xl sm:p-6">
        <div className="flex items-center border-b border-slate-500/5 pb-2 justify-between">
          <div className="flex items-center">
            <CircleHelp size={16} className="mr-2 text-emerald-400" />
            <h2 className="text-lg font-mono text-emerald-400 uppercase">Descrição / Regulamento</h2>
          </div>
        </div>

        <p className="text-sm text-zinc-400 whitespace-pre-line">
          {formattedDescription}
        </p>
      </div>

      {/* Ranking */}
      {showCollaboratorRanking ? (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-2xl border border-slate-500/5 bg-slate-800/40 p-4 shadow-lg backdrop-blur-xl sm:p-6">
          <div className="flex items-center border-b border-slate-500/5 pb-2 justify-between">
            <div className="flex items-center">
              <Users size={16} className="mr-2 text-emerald-400" />
              <h2 className="text-lg font-mono text-emerald-400 uppercase">Ranking dos Colaboradores</h2>
            </div>
          </div>

          <p className="text-sm text-zinc-300">Um prêmio garantido para os maiores compradores!</p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            {rankPrizeCards.map((card) => {
              const isActive = activeRankCard === card.positionLabel;

              return (
                <button
                  key={card.positionLabel}
                  type="button"
                  onClick={() => setActiveRankCard((prev) => (prev === card.positionLabel ? null : card.positionLabel))}
                  className="group h-20 cursor-pointer [perspective:1000px]"
                  aria-label={`Mostrar premio do ${card.positionLabel}`}
                >
                  <div className={`relative h-full w-full rounded-lg border border-white/5 ${card.cardClass}`}>
                    <div className={`absolute inset-0 transition-transform duration-500 [transform-style:preserve-3d] sm:group-hover:[transform:rotateY(180deg)] will-change-transform ${isActive ? "[transform:rotateY(180deg)]" : ""}`}>
                      <div className="absolute inset-0 flex items-center justify-center [backface-visibility:hidden]">
                        <span className={`text-2xl font-bold ${card.positionColorClass}`}>{card.positionLabel}</span>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center [transform:rotateY(180deg)] [backface-visibility:hidden] px-2 text-center">
                        <span className="text-sm font-bold text-zinc-100">{card.prizeLabel}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-500/5">
            {rankingList.length === 0 ? (
              <p className="text-center text-xs text-stone-500 py-4">Nenhum colaborador ainda.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-white/5 bg-transparent">
                <div className="grid grid-cols-[80px_1fr_120px_120px] gap-2 px-4 py-3 bg-transparent border-b border-white/5 border-dashed">
                  <span className="text-[9px] font-bold text-stone-500 tracking-[0.2em] uppercase text-center">Colocação</span>
                  <span className="text-[9px] font-bold text-stone-500 tracking-[0.2em] uppercase text-center">Nome</span>
                  <span className="text-[9px] font-bold text-stone-500 tracking-[0.2em] uppercase text-center">Bilhete</span>
                  <span className="text-[9px] font-bold text-stone-500 tracking-[0.2em] uppercase text-center">Prêmio</span>
                </div>
                {rankingList.slice(0, 3).map((u, idx) => (
                  <div
                    key={u.position}
                    className={`grid grid-cols-[80px_1fr_120px_120px] gap-2 items-center px-4 py-3 transition-colors ${idx !== 0 ? 'border-t border-white/5' : ''} bg-transparent`}
                  >
                    <div className="flex items-center justify-center">
                      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-black ${u.color ?? 'border-white/10 bg-white/5 text-stone-400'
                        }`}>
                        {u.position <= 3 ? <Trophy size={14} /> : u.position}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-stone-300 truncate text-center">{u.name}</span>
                    <span className="text-[11px] font-bold text-stone-300 tabular-nums text-center">
                      {u.tickets.toLocaleString('pt-BR')} {u.tickets === 1 ? "bilhete" : "bilhetes"}
                    </span>
                    <span className="text-[11px] font-semibold text-stone-300 truncate text-center">{rankingPrizeByPosition[u.position] ?? "Nao definido"}</span>
                  </div>
                ))}
                {user && (
                  <div className="py-2.5 text-center bg-transparent border-t border-white/5">
                    {userRankingPosition ? (
                      <>
                        <p className="text-[9px] text-stone-500 font-medium">Sua posicao: #{userRankingPosition.position}</p>
                        <p className="text-[10px] text-stone-400">{userRankingPosition.tickets.toLocaleString("pt-BR")} bilhetes</p>
                      </>
                    ) : (
                      <p className="text-[10px] text-stone-400">Voce ainda nao possui bilhetes para entrar no ranking.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Caixa Misteriosa */}
      {hasConfiguredMysteryPrizes && hasAvailableMysteryPrizes ? (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-2xl border border-slate-500/5 bg-slate-800/40 p-4 shadow-lg backdrop-blur-xl sm:p-6">
          <div className="flex items-center border-b border-slate-500/5 pb-2 justify-between">
            <div className="flex items-center">
              <ShoppingBag size={16} className="mr-2 text-emerald-400" />
              <h2 className="text-lg font-mono text-emerald-400 uppercase">Caixa Mistériosa</h2>
            </div>
          </div>

          <p className="text-sm text-zinc-300">Ganhe caixas ao comprar em grandes quantidades e concorra a prêmios instantâneos!</p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            {mysteryBoxRules.map((rule) => (
              <div
                key={`${rule.boxes}-${rule.minTickets}`}
                className="flex flex-col items-center gap-2 rounded-lg border border-white/5 bg-slate-800/40 p-4"
              >
                <span className="text-sm font-mono uppercase text-zinc-300">
                  {rule.boxes} {rule.boxes === 1 ? "caixa" : "caixas"}
                </span>
                <span className="text-xs font-mono uppercase text-zinc-500">
                  {rule.minTickets} bilhetes
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Premio da Caixa Misteriosa */}
      {hasConfiguredMysteryPrizes ? (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-2xl border border-slate-500/5 bg-slate-800/40 p-4 shadow-lg backdrop-blur-xl sm:p-6">
          <div className="flex items-center border-b border-slate-500/5 pb-2 justify-between">
            <div className="flex items-center">
              <Gift size={16} className="mr-2 text-emerald-400" />
              <h2 className="text-lg font-mono text-emerald-400 uppercase">Prêmios das Caixas</h2>
            </div>
            <span className="text-xs font-mono uppercase text-zinc-500">
              {prizes.filter(p => p.remaining > 0).length} disponíveis
            </span>
          </div>

          {prizes.length === 0 ? (
            <div className="flex items-center justify-center py-6">
              <p className="text-sm text-slate-400">Nenhum prêmio disponível no momento.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {prizes.map((prize) => {
                const isAvailable = prize.remaining > 0;
                return (
                  <div
                    key={prize.id}
                    className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition-all ${isAvailable
                      ? "border-emerald-400/30 bg-gradient-to-r from-emerald-500/5 to-slate-900/20 hover:border-emerald-400/50"
                      : "border-slate-500/20 bg-slate-900/30 opacity-60"
                      }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg border flex-shrink-0 ${isAvailable
                        ? "bg-emerald-500/15 border-emerald-400/30"
                        : "bg-slate-700/20 border-slate-500/20"
                        }`}>
                        {isAvailable ? (
                          <Gift size={18} className="text-emerald-300" />
                        ) : (
                          <Check size={18} className="text-slate-500" />
                        )}
                      </div>
                      <p className={`text-sm font-medium truncate ${isAvailable ? "text-white" : "text-slate-500"}`}>
                        {prize.prizeType === "MONETARY" && prize.value > 0
                          ? formatCurrency(prize.value)
                          : prize.title}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-xs font-medium ${isAvailable ? "text-slate-400" : "text-slate-600"}`}>
                        {isAvailable ? "DISPONÍVEL" : "RESGATADO"}
                      </p>
                      {isAvailable && (
                        <p className="text-sm font-bold text-emerald-300">{prize.remaining}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {/* Bilheteria */}
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-2xl border border-slate-500/5 bg-slate-800/40 p-4 shadow-lg backdrop-blur-xl sm:p-6">
        <div className="flex items-center border-b border-slate-500/5 pb-2 justify-between">
          <div className="flex items-center">
            <Ticket size={16} className="mr-2 text-emerald-400" />
            <h2 className="text-lg font-mono text-emerald-400 uppercase">Bilheteria</h2>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[5, 10, 100].map((value) => (
            <button key={value} onClick={() => handleQuantitySelect(value)} className="flex flex-col items-center gap-2 rounded-lg border border-white/5 bg-slate-800/40 p-3 text-zinc-200 tabular-nums sm:p-4">
              +{value}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-white/5 bg-slate-800/40 px-4 py-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleDecrease}
            disabled={ticketCount <= raffle.minNumbers}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-slate-800/40 transition-all hover:bg-slate-700/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Minus size={16} className="text-stone-400" />
          </motion.button>

          <div className="flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-white tabular-nums leading-none mb-1">{ticketCount}</span>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleIncrease}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-slate-800/40 transition-all hover:bg-slate-700/40"
          >
            <Plus size={16} className="text-stone-400" />
          </motion.button>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[5, 10, 100].map((value) => (
            <button key={`minus-${value}`} onClick={() => handleQuantitySelect(-value)} disabled={ticketCount <= raffle.minNumbers} className="flex flex-col items-center gap-2 rounded-lg border border-white/5 bg-slate-800/40 p-3 text-zinc-200 tabular-nums sm:p-4 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
              -{value}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-center">
          <span className="text-xs uppercase font-mono text-zinc-500">O mínimo para compra é de {raffle.minNumbers} bilhete{raffle.minNumbers > 1 ? "s" : ""}</span>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-slate-800/40 px-4 py-4">
          <div className="flex flex-col">
            <span className="text-xs uppercase font-mono text-zinc-500">Total a pagar</span>
            <span className="text-lg font-bold text-white">{formatCurrency((Number(raffle.price) || 0) * ticketCount)}</span>
          </div>
          {hasAvailableMysteryPrizes ? (
            <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-slate-800/40 px-3 py-2 sm:px-4">
              <div className="rounded-xl">
                <Gift size={16} className="text-zinc-500" />
              </div>
              <span className="text-xs font-mono uppercase text-zinc-500">
                Você ganha<br />{getBoxesFromTickets(ticketCount)} caixa{getBoxesFromTickets(ticketCount) !== 1 ? "s" : ""}
              </span>
            </div>
          ) : null}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handlePixPayment}
          disabled={isPaying}
          className="w-full items-center rounded-2xl bg-emerald-500 p-4 text-sm font-mono font-bold uppercase tracking-widest text-[#0B1120] shadow-[0_4px_24px_rgba(16,185,129,0.25)] transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPaying ? "Gerando PIX..." : "Pagar com PIX"}
        </motion.button>

        {checkoutError && (
          <div className="rounded-xl border border-red-300/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {checkoutError}
          </div>
        )}
      </div>

      <Dialog.Root
        open={pixDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            minimizePixDialog();
            return;
          }

          setPixDialogOpen(true);
          setPixDialogMinimized(false);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-slate-900 p-4 shadow-2xl outline-none">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <Dialog.Title className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
                  Pagamento PIX
                </Dialog.Title>
                <Dialog.Description className="text-xs text-slate-400">
                  Copie o codigo ou escaneie o QR Code para pagar.
                </Dialog.Description>
              </div>

              <button
                type="button"
                onClick={minimizePixDialog}
                className="rounded-md border border-white/15 p-1 text-slate-300 hover:bg-white/10 hover:text-white"
                aria-label="Minimizar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {pendingPaymentOffer && !checkoutInfo ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-amber-300/20 bg-amber-500/10 p-3 text-sm text-amber-100">
                  Ja existe um pagamento pendente para esta mesma quantidade de bilhetes. Deseja continuar com ele?
                </div>

                <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                  <p className="text-xs text-slate-300">Pagamento: {pendingPaymentOffer.paymentId}</p>
                  <p className="text-xs text-slate-300">Total: {formatCurrency(pendingPaymentOffer.totalValue)}</p>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCheckoutInfo(pendingPaymentOffer);
                      setPendingPaymentOffer(null);
                    }}
                    className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
                  >
                    Usar pagamento em aberto
                  </button>
                  <button
                    type="button"
                    onClick={() => requestPixPayment(true)}
                    disabled={isPaying}
                    className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-100 hover:bg-white/10 disabled:opacity-60"
                  >
                    {isPaying ? "Gerando..." : "Gerar novo PIX"}
                  </button>
                </div>
              </div>
            ) : checkoutInfo ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-emerald-300/20 bg-emerald-500/10 p-3">
                  <p className="text-xs uppercase text-emerald-300">PIX gerado</p>
                  <p className="mt-1 text-sm text-zinc-100">Pagamento: {checkoutInfo.paymentId}</p>
                  <p className="text-sm text-zinc-100">Total: {formatCurrency(checkoutInfo.totalValue)}</p>
                </div>

                {checkoutInfo.qrCodeBase64 ? (
                  <div className="flex justify-center">
                    <Image
                      src={`data:image/png;base64,${checkoutInfo.qrCodeBase64}`}
                      alt="QR Code PIX"
                      width={200}
                      height={200}
                      unoptimized
                      className="h-48 w-48 rounded-lg border border-white/10 bg-white p-2"
                    />
                  </div>
                ) : null}

                {checkoutInfo.qrCode ? (
                  <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                    <p className="text-[11px] uppercase text-slate-400">Codigo copia e cola</p>
                    <p className="mt-2 break-all text-xs text-slate-200">{checkoutInfo.qrCode}</p>
                  </div>
                ) : null}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={closePixDialogCompletely}
                    className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-100 hover:bg-white/10"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-300">Nenhum pagamento carregado.</p>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {pixDialogMinimized && (checkoutInfo || pendingPaymentOffer) ? (
        <button
          type="button"
          onClick={() => {
            setPixDialogOpen(true);
            setPixDialogMinimized(false);
          }}
          className="fixed bottom-4 right-4 z-40 rounded-full border border-emerald-300/25 bg-emerald-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-200 shadow-lg backdrop-blur"
        >
          Abrir pagamento PIX
        </button>
      ) : null}
    </motion.div >
  );
}