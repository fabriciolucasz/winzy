"use client";

import { useApp } from "@/contexts";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { BadgeCheck, Check, CircleHelp, Gift, Instagram, MessageCircle, Minus, Plus, ShoppingBag, Ticket, Trophy, Users, User, X, Sparkles } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useEffect, useMemo, useState, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";

function formatCollaboratorName(fullName: string) {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];

  const ignoreWords = ["de", "da", "do", "das", "dos"];
  const validParts = parts.filter(part => !ignoreWords.includes(part.toLowerCase()));
  
  if (validParts.length === 0) return fullName;
  if (validParts.length === 1) return validParts[0];
  
  return `${validParts[0]} ${validParts[1]}`;
}

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
  const { tenant, raffle, user, ticketCount, setTicketCount, setIsLoginModalOpen } = useApp();

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

  const [ticketInputValue, setTicketInputValue] = useState<string>(ticketCount.toString());
  const [authErrorModalOpen, setAuthErrorModalOpen] = useState(false);
  const [countdownToLogin, setCountdownToLogin] = useState(10);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"confirmation" | "payment">("confirmation");

  useEffect(() => {
    setTicketInputValue(ticketCount.toString());
  }, [ticketCount]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (authErrorModalOpen && countdownToLogin > 0) {
      timer = setTimeout(() => setCountdownToLogin(prev => prev - 1), 1000);
    } else if (authErrorModalOpen && countdownToLogin === 0) {
      setAuthErrorModalOpen(false);
      window.location.href = `/${tenant?.slug || ''}/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
    }
    return () => clearTimeout(timer);
  }, [authErrorModalOpen, countdownToLogin, tenant?.slug]);

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

  const handleTicketInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setTicketInputValue(value);
  };

  const handleTicketInputBlur = () => {
    let value = parseInt(ticketInputValue, 10);
    if (isNaN(value) || value < (raffle?.minNumbers ?? 1)) {
      value = raffle?.minNumbers ?? 1;
    } else if (value > 2000) {
      value = 2000;
    }
    setTicketCount(value);
    setTicketInputValue(value.toString());
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
      if (!tenant?.slug || !showCollaboratorRanking) {
        setRankingList([]);
        setUserRankingPosition(null);
        return;
      }
      try {
        const res = await fetch(`/api/ranking/${tenant.slug}`);
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
  }, [tenant?.slug, showCollaboratorRanking]);

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
    if (!raffle || !tenant || !user) return;

    setCheckoutError(null);

    // A validação de usuário já ocorre em handlePixPayment.

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
        setCheckoutStep("payment");
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
      setCheckoutStep("payment");
    } catch {
      setCheckoutError("Erro de conexao ao gerar pagamento PIX.");
    } finally {
      setIsPaying(false);
    }
  }

  async function handlePixPayment() {
    setCheckoutError(null);
    if (!user?.name || !user?.email || !user?.cpf || !user?.phone) {
      setCountdownToLogin(10);
      setAuthErrorModalOpen(true);
      return;
    }
    setCheckoutInfo(null);
    setPendingPaymentOffer(null);
    setCheckoutStep("confirmation");
    setCheckoutModalOpen(true);
  }

  function minimizePixDialog() {
    setCheckoutModalOpen(false);
    if (checkoutInfo || pendingPaymentOffer) {
      setPixDialogMinimized(true);
    }
  }

  function closePixDialogCompletely() {
    setCheckoutModalOpen(false);
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

      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] animate-blob" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-blob animation-delay-2000" />
        <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-purple-500/10 rounded-full blur-[120px] animate-blob animation-delay-4000" />
      </div>

      {/* Detalhes da Rifa */}
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 backdrop-blur-xl">
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

        <div>
          <button
            type="button"
            onClick={() => setIsOwnerCardOpen((prev) => !prev)}
            className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-white/5 sm:gap-4"
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
                <span className="text-sm text-gray-300 uppercase font-semibold">{raffle?.title}</span>
                <span className="text-xs text-gray-300 font-semibold">ou {formatCurrency(Number(raffle?.pixText) || 0)} no PIX</span>
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

      {/* Caixa Misteriosa */}
      {hasConfiguredMysteryPrizes && hasAvailableMysteryPrizes ? (
        <div className="mx-auto w-full max-w-2xl relative bg-linear-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-md border border-purple-500/30 rounded-[32px] p-5 md:p-8 overflow-hidden group">
          {/* Background */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/20 blur-[80px] group-hover:bg-purple-500/30 transition-all" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/20 blur-[80px] group-hover:bg-indigo-500/30 transition-all" />

          {/* Header */}
          <div className="relative z-10 flex items-center gap-6">

            {/* Icon box */}
            <div className="w-20 h-20 bg-linear-to-br from-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-500/20 group-hover:scale-110 transition-transform duration-500">
              <Gift size={40} className="text-white animate-bounce" />
            </div>

            {/* Text */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-yellow-400" />
                <h3 className="text-lg md:text-xl text-white font-black font-display tracking-tight">CAIXA MISTERIOSA</h3>
              </div>
              <p className="text-xs text-purple-200 font-medium leading-relaxed">
                Ganhe caixas ao comprar grandes quantidades e concorra a prêmios instantâneos!
              </p>
            </div>
          </div>

          {/* Options */}
          <div className="mt-8 grid grid-cols-3 gap-3">

            {/* Item */}
            {mysteryBoxRules.map((rule) => (
              <div key={`${rule.boxes}-${rule.minTickets}`} className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center space-y-1 group-hover:border-purple-500/30 transition-all">
                <p className="text-[10px] font-black text-purple-300 uppercase tracking-widest">{rule.minTickets} BILHETES</p>
                <p className="text-sm md:text-lg font-black text-white">{rule.boxes} {rule.boxes === 1 ? "Caixa" : "Caixas"}</p>
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
              <Trophy size={16} className="mr-2 text-emerald-400" />
              <h2 className="text-sm font-bold text-emerald-400 uppercase">Prêmios das Caixas</h2>
            </div>
            <span className="text-xs font-semibold uppercase text-zinc-500">
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
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${isAvailable ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-slate-800/50 text-slate-500 border border-slate-700/50"}`}>
                        {isAvailable ? "DISPONÍVEL" : "RESGATADO"}
                      </span>
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
        <div className="flex items-center border-b border-slate-500/5 pb-2 justify-center">
          <div className="flex items-center">
            <Ticket size={16} className="mr-2 text-emerald-400" />
            <h2 className="text-sm font-bold text-emerald-400 uppercase">Selecione a quantidade de bilhetes</h2>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[5, 10, 100].map((value) => (
            <button key={value} onClick={() => handleQuantitySelect(value)} className="cursor-pointer flex flex-col items-center gap-2 rounded-lg border border-white/5 bg-slate-800/40 p-3 text-zinc-200 tabular-nums sm:p-4">
              +{value}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-white/5 bg-slate-800/40 px-4 py-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleDecrease}
            disabled={ticketCount <= raffle.minNumbers}
            className="cursor-pointer flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-slate-800/40 transition-all hover:bg-slate-700/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Minus size={16} className="text-stone-400" />
          </motion.button>

          <div className="flex flex-col items-center justify-center">
            <input
              type="text"
              value={ticketInputValue}
              onChange={handleTicketInputChange}
              onBlur={handleTicketInputBlur}
              className="w-24 text-center bg-transparent text-2xl font-black text-white tabular-nums leading-none mb-1 focus:outline-none"
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleIncrease}
            className="cursor-pointer flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-slate-800/40 transition-all hover:bg-slate-700/40"
          >
            <Plus size={16} className="text-stone-400" />
          </motion.button>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[5, 10, 100].map((value) => (
            <button key={`minus-${value}`} onClick={() => handleQuantitySelect(-value)} disabled={ticketCount <= raffle.minNumbers} className="cursor-pointer flex flex-col items-center gap-2 rounded-lg border border-white/5 bg-slate-800/40 p-3 text-zinc-200 tabular-nums sm:p-4 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
              -{value}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-center">
          <span className="text-xs uppercase font-semibold text-zinc-500">O mínimo para compra é de {raffle.minNumbers} bilhete{raffle.minNumbers > 1 ? "s" : ""}</span>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-slate-800/40 px-4 py-4">
          <div className="flex flex-col">
            <span className="text-xs uppercase font-semibold text-zinc-500">Total a pagar</span>
            <span className="text-lg font-bold text-white">{formatCurrency((Number(raffle.price) || 0) * ticketCount)}</span>
          </div>
          {hasAvailableMysteryPrizes ? (
            (() => {
              const boxesEarned = getBoxesFromTickets(ticketCount);
              const hasBoxes = boxesEarned > 0;
              return (
                <motion.div 
                  layout
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2 sm:px-4 transition-all duration-500 ${hasBoxes ? "border-purple-500/50 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.2)]" : "border-white/5 bg-slate-800/40"}`}
                >
                  <motion.div 
                    layout
                    className={`rounded-xl flex h-10 w-10 shrink-0 items-center justify-center transition-colors duration-500 ${hasBoxes ? "bg-purple-500/20 text-purple-400" : "bg-white/5 text-zinc-500"}`}
                  >
                    <AnimatePresence mode="popLayout" initial={false}>
                      {hasBoxes ? (
                        <motion.div
                          key="gift-earned"
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, rotate: 90 }}
                          transition={{ type: "spring", damping: 12, stiffness: 200 }}
                        >
                          <Gift size={20} className="animate-bounce" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="gift-none"
                          initial={{ scale: 0, rotate: 90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, rotate: -90 }}
                          transition={{ type: "spring", damping: 12, stiffness: 200 }}
                        >
                          <Gift size={18} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                  <motion.div layout className="flex flex-col relative overflow-hidden flex-1">
                    <AnimatePresence mode="popLayout" initial={false}>
                      {hasBoxes ? (
                        <motion.div
                          key="text-earned"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ type: "spring", damping: 15, stiffness: 150 }}
                          className="flex flex-col"
                        >
                          <span className="text-[10px] font-bold uppercase tracking-widest text-purple-300">
                            Bônus Desbloqueado
                          </span>
                          <span className="font-black leading-tight text-sm text-white">
                            Você ganha {boxesEarned} caixa{boxesEarned !== 1 ? "s" : ""}!
                          </span>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="text-none"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ type: "spring", damping: 15, stiffness: 150 }}
                          className="flex flex-col"
                        >
                          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                            Caixas bônus
                          </span>
                          <span className="font-black leading-tight text-xs text-zinc-400 mt-0.5">
                            0 caixas
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </motion.div>
              );
            })()
          ) : null}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handlePixPayment}
          disabled={isPaying}
          className="cursor-pointer w-full items-center rounded-2xl bg-emerald-500 p-4 text-sm font-bold uppercase tracking-widest text-[#0B1120] shadow-[0_4px_24px_rgba(16,185,129,0.25)] transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPaying ? "Gerando PIX..." : "Garantir meus bilhetes com PIX"}
        </motion.button>

        {checkoutError && (
          <div className="rounded-xl border border-red-300/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {checkoutError}
          </div>
        )}
      </div>

      <Dialog.Root open={authErrorModalOpen} onOpenChange={(open) => {
        if (!open) {
          setAuthErrorModalOpen(false);
          setCountdownToLogin(10);
        }
      }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-red-500/20 bg-slate-900 p-6 shadow-2xl outline-none">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <CircleHelp size={24} className="text-red-400" />
              </div>
              <div>
                <Dialog.Title className="text-lg font-bold text-white">Faça login para continuar</Dialog.Title>
                <Dialog.Description className="text-sm text-slate-300 mt-2">
                  Para garantir seus bilhetes e pagar com PIX, você precisa estar logado. É rápido e gratuito!
                </Dialog.Description>
              </div>
              <p className="text-xs font-semibold text-emerald-400 mt-2">Redirecionando em {countdownToLogin} segundos...</p>
              <button 
                type="button"
                onClick={() => {
                  setAuthErrorModalOpen(false);
                  window.location.href = `/${tenant?.slug || ''}/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
                }}
                className="cursor-pointer w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0B1120] font-bold py-3 mt-2 transition-colors"
              >
                Entrar agora e garantir meus bilhetes
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={checkoutModalOpen} onOpenChange={(open) => {
        if (!open) closePixDialogCompletely();
      }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[96vw] max-w-3xl max-h-[90vh] overflow-hidden -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-slate-900 shadow-2xl outline-none flex flex-col md:flex-row">
            
            {/* Sidebar / Top Steps */}
            <div className="bg-slate-950 p-4 md:p-6 md:w-64 flex flex-row md:flex-col gap-4 border-b md:border-b-0 md:border-r border-white/5 overflow-x-auto">
              <h3 className="hidden md:block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Checkout</h3>
              
              <div className={`flex items-center gap-3 whitespace-nowrap md:whitespace-normal px-3 py-2 rounded-lg transition-colors ${checkoutStep === "confirmation" ? "bg-emerald-500/10 border border-emerald-500/20" : "opacity-50"}`}>
                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${checkoutStep === "confirmation" ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-400"}`}>1</div>
                <span className={`text-sm font-semibold ${checkoutStep === "confirmation" ? "text-emerald-400" : "text-slate-400"}`}>Confirmação</span>
              </div>
              
              <div className={`flex items-center gap-3 whitespace-nowrap md:whitespace-normal px-3 py-2 rounded-lg transition-colors ${checkoutStep === "payment" ? "bg-emerald-500/10 border border-emerald-500/20" : "opacity-50"}`}>
                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${checkoutStep === "payment" ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-400"}`}>2</div>
                <span className={`text-sm font-semibold ${checkoutStep === "payment" ? "text-emerald-400" : "text-slate-400"}`}>Pagamento PIX</span>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <Dialog.Title className="text-xl font-bold text-white">
                  {checkoutStep === "confirmation" ? "Confirme sua compra" : "Efetue o pagamento"}
                </Dialog.Title>
                <button
                  type="button"
                  onClick={minimizePixDialog}
                  className="cursor-pointer rounded-md border border-white/15 p-1 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {checkoutStep === "confirmation" && (
                <div className="space-y-6">
                  <div className="grid gap-3 p-4 rounded-xl border border-white/5 bg-slate-800/40">
                    <div className="flex justify-between items-center pb-3 border-b border-white/5">
                      <span className="text-sm text-slate-400">Rifa selecionada</span>
                      <span className="text-sm font-medium text-white truncate max-w-[200px]">{raffle.title}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-white/5">
                      <span className="text-sm text-slate-400">Quantidade</span>
                      <span className="text-sm font-medium text-white">{ticketCount} bilhetes</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Valor total</span>
                      <span className="text-lg font-bold text-emerald-400">{formatCurrency((Number(raffle.price) || 0) * ticketCount)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => requestPixPayment(false)}
                    disabled={isPaying}
                    className="cursor-pointer disabled:cursor-not-allowed w-full flex items-center justify-center py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold uppercase tracking-wide transition-all disabled:opacity-50"
                  >
                    {isPaying ? "Gerando PIX..." : "Prosseguir para pagamento"}
                  </button>
                </div>
              )}

              {checkoutStep === "payment" && (
                <div className="space-y-4">
                  {pendingPaymentOffer && !checkoutInfo ? (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-amber-300/20 bg-amber-500/10 p-4">
                        <p className="text-sm text-amber-100 font-medium">Já existe um pagamento pendente para esta mesma quantidade de bilhetes.</p>
                        <div className="mt-3 bg-slate-950/40 p-3 rounded-lg border border-amber-500/10">
                          <p className="text-xs text-amber-200/70">ID: {pendingPaymentOffer.paymentId}</p>
                          <p className="text-sm text-amber-300 font-bold mt-1">{formatCurrency(pendingPaymentOffer.totalValue)}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setCheckoutInfo(pendingPaymentOffer);
                            setPendingPaymentOffer(null);
                          }}
                          className="cursor-pointer w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 transition-colors"
                        >
                          Usar código existente
                        </button>
                        <button
                          type="button"
                          onClick={() => requestPixPayment(true)}
                          disabled={isPaying}
                          className="cursor-pointer disabled:cursor-not-allowed w-full rounded-xl border border-white/10 hover:bg-white/5 text-white font-medium py-3 transition-colors disabled:opacity-50"
                        >
                          {isPaying ? "Gerando..." : "Gerar novo PIX"}
                        </button>
                      </div>
                    </div>
                  ) : checkoutInfo ? (
                    <div className="flex flex-col items-center space-y-6">
                      <div className="w-full rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col items-center text-center">
                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-1">Total a Pagar</span>
                        <span className="text-3xl font-black text-white">{formatCurrency(checkoutInfo.totalValue)}</span>
                      </div>
                      
                      {checkoutInfo.qrCodeBase64 && (
                        <div className="p-3 bg-white rounded-2xl border border-white/20 shadow-xl">
                          <Image
                            src={`data:image/png;base64,${checkoutInfo.qrCodeBase64}`}
                            alt="QR Code PIX"
                            width={220}
                            height={220}
                            unoptimized
                            className="rounded-lg"
                          />
                        </div>
                      )}
                      
                      {checkoutInfo.qrCode && (
                        <div className="w-full space-y-2">
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Código Copia e Cola</p>
                          <div className="flex bg-slate-950 rounded-xl border border-white/10 overflow-hidden">
                            <div className="flex-1 p-3 overflow-x-auto no-scrollbar">
                              <p className="text-xs text-slate-300 font-mono break-all">{checkoutInfo.qrCode}</p>
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(checkoutInfo.qrCode);
                              }}
                              className="cursor-pointer px-4 bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center border-l border-white/10 text-emerald-400 font-medium text-xs uppercase"
                            >
                              Copiar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex justify-center py-12">
                      <span className="text-sm text-slate-400">Carregando dados de pagamento...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {pixDialogMinimized && (checkoutInfo || pendingPaymentOffer) ? (
        <button
          type="button"
          onClick={() => {
            setCheckoutModalOpen(true);
            setPixDialogMinimized(false);
          }}
          className="cursor-pointer fixed bottom-4 right-4 z-40 rounded-full border border-emerald-300/25 bg-emerald-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-200 shadow-lg backdrop-blur"
        >
          Abrir pagamento PIX
        </button>
      ) : null}

      {/* Descrição da Rifa */}
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-2xl border border-slate-500/5 bg-slate-800/40 p-4 shadow-lg backdrop-blur-xl sm:p-6">
        <div className="flex items-center border-b border-slate-500/5 pb-2 justify-between">
          <div className="flex items-center">
            <CircleHelp size={16} className="mr-2 text-emerald-400" />
            <h2 className="text-sm font-bold text-emerald-400 uppercase">Descrição / Regulamento</h2>
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
              <h2 className="text-sm font-bold text-emerald-400 uppercase">Ranking dos Colaboradores</h2>
            </div>
          </div>

          <p className="text-sm text-zinc-300">Um prêmio garantido para os maiores compradores!</p>

          <div className="border-t border-slate-500/5">
            {rankingList.length === 0 ? (
              <p className="text-center text-xs text-stone-500 py-4">Nenhum colaborador ainda.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-white/5 bg-transparent">
                <div className="hidden sm:grid grid-cols-[80px_1fr_120px_120px] gap-2 px-4 py-3 bg-transparent border-b border-white/5 border-dashed">
                  <span className="text-[9px] font-bold text-stone-500 tracking-[0.2em] uppercase text-center">Colocação</span>
                  <span className="text-[9px] font-bold text-stone-500 tracking-[0.2em] uppercase text-center">Nome</span>
                  <span className="text-[9px] font-bold text-stone-500 tracking-[0.2em] uppercase text-center">Bilhete</span>
                  <span className="text-[9px] font-bold text-stone-500 tracking-[0.2em] uppercase text-center">Prêmio</span>
                </div>
                {rankingList.slice(0, 3).map((u, idx) => (
                  <div
                    key={u.position}
                    className={`flex items-center justify-between gap-3 px-4 py-3 transition-colors ${idx !== 0 ? 'border-t border-white/5' : ''} bg-transparent sm:grid sm:grid-cols-[80px_1fr_120px_120px] sm:gap-2`}
                  >
                    <div className="flex items-center gap-3 sm:justify-center">
                      <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-black ${u.color ?? 'border-white/10 bg-white/5 text-stone-400'}`}>
                        {u.position <= 3 ? <Trophy size={14} /> : u.position}
                      </span>
                      <div className="flex flex-col sm:hidden">
                        <span className="text-sm font-bold text-white truncate max-w-[140px]">{formatCollaboratorName(u.name)}</span>
                        <span className="text-xs text-stone-400">{u.tickets.toLocaleString('pt-BR')} bilhetes</span>
                      </div>
                    </div>
                    
                    <span className="hidden sm:block text-xs font-medium text-stone-300 truncate text-center">{formatCollaboratorName(u.name)}</span>
                    <span className="hidden sm:block text-[11px] font-bold text-stone-300 tabular-nums text-center">
                      {u.tickets.toLocaleString('pt-BR')} {u.tickets === 1 ? "bilhete" : "bilhetes"}
                    </span>
                    <div className="flex flex-col items-end sm:items-center sm:flex-row sm:justify-center">
                      <span className="sm:hidden text-[9px] uppercase font-bold text-stone-500 tracking-wider mb-0.5">Prêmio</span>
                      <span className="text-xs sm:text-[11px] font-semibold text-emerald-400 sm:text-stone-300 truncate text-center">{rankingPrizeByPosition[u.position] ?? "Não definido"}</span>
                    </div>
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
    </motion.div >
  );
}