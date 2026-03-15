"use client";

import { useApp } from "@/contexts";
import { motion } from "motion/react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Award, BadgeCheck, CircleHelp, Gift, Minus, Plus, ShoppingBag, Ticket, Trophy, Users } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

export function Raffle() {
  const { tenant, raffle, user, ticketCount, setTicketCount } = useApp();

  const formattedDescription = useMemo(() => {
    const rawDescription = raffle?.description ?? "";

    return rawDescription
      .replace(/\\n/g, "\n")
      .replace(/\r\n/g, "\n")
      .replace(/n-\s/g, "\n- ");
  }, [raffle?.description]);

  const [rankingList, setRankingList] = useState<any[]>([]);

  useEffect(() => {
    async function fetchRanking() {
      if (!tenant?.slug) return;
      try {
        const res = await fetch(`/api/ranking/${tenant.slug}`);
        if (res.ok) {
          const data = await res.json();
          setRankingList(data.ranking);
        }
      } catch (e) {
        console.error('Failed to fetch ranking', e);
      }
    }
    fetchRanking();
  }, [tenant?.slug]);

  if (!raffle) return null;

  const handleQuantitySelect = (qty: number) => {
    setTicketCount(prev => prev + qty);
  };

  const handleIncrease = () => {
    setTicketCount(prev => prev + 1);
  };

  const handleDecrease = () => {
    setTicketCount(prev => Math.max(raffle.minNumbers, prev - 1));
  };

  type MysteryPrize = {
    id: string;
    title: string;
    description: string | null;
    remaining: number;
    totalAmount: number;
  };

  const [prizes, setPrizes] = useState<MysteryPrize[]>([]);

  useEffect(() => {
    async function fetchPrizes() {
      if (!raffle?.id) return;

      try {
        const res = await fetch(`/api/mystery-box/${raffle.id}`);
        if (!res.ok) return;

        const data = await res.json();
        setPrizes(data.prizes ?? []);
      } catch (e) {
        console.error("Failed to fetch mystery prizes", e);
      }
    }

    fetchPrizes();
  }, [raffle?.id]);

  const mysteryBoxRules = [
    { boxes: 1, minTickets: 400 },
    { boxes: 2, minTickets: 600 },
    { boxes: 6, minTickets: 1200 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="py-4 flex flex-col gap-8"
    >
      {/* Detalhes da Rifa */}
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-2xl border border-slate-500/5 bg-slate-800/40 p-6 shadow-lg backdrop-blur-xl">
        <div className="flex items-center gap-4">
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
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300 uppercase font-mono font-semibold">{raffle?.title}</span>
              <span className="text-xs text-gray-300 font-mono">ou {formatCurrency(Number(raffle?.pixText) || 0)} no PIX</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden">
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
                className="absolute bottom-18 left-12 rounded-xl bg-[#11161d]/80 px-4 py-1.5 backdrop-blur-md flex flex-col items-center justify-center leading-tight shadow-xl"
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

      {/* Descrição da Rifa */}
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-2xl border border-slate-500/5 bg-slate-800/40 p-6 shadow-lg backdrop-blur-xl">
        <div className="flex items-center border-b border-slate-500/5 pb-2 justify-between">
          <div className="flex items-center">
            <CircleHelp size={16} className="mr-2 text-emerald-400" />
            <h2 className="text-lg font-mono text-emerald-400 uppercase">Descrição / Regulamento</h2>
          </div>
        </div>

        <p className="text-sm text-gray-300 whitespace-pre-line">
          {formattedDescription}
        </p>
      </div>

      {/* Ranking */}
      {/* FALTA CRIAR API DE CONSUMO DE RANKING */}
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-2xl border border-slate-500/5 bg-slate-800/40 p-6 shadow-lg backdrop-blur-xl">
        <div className="flex items-center border-b border-slate-500/5 pb-2 justify-between">
          <div className="flex items-center">
            <Users size={16} className="mr-2 text-emerald-400" />
            <h2 className="text-lg font-mono text-emerald-400 uppercase">Ranking dos Colaboradores</h2>
          </div>
        </div>

        <p className="text-sm text-zinc-300">Um prêmio garantido para os maiores compradores!</p>

        <div className="flex gap-4">
          <div className="w-1/3 flex flex-col items-center gap-2 border border-white/5 bg-yellow-500/10 rounded-lg p-4">
            <span className="text-2xl font-bold text-yellow-400">1º</span>
          </div>

          <div className="w-1/3 flex flex-col items-center gap-2 border border-white/5 bg-gray-500/10 rounded-lg p-4">
            <span className="text-2xl font-bold text-gray-400">2º</span>
          </div>

          <div className="w-1/3 flex flex-col items-center gap-2 border border-white/5 bg-yellow-700/10 rounded-lg p-4">
            <span className="text-2xl font-bold text-yellow-700">3º</span>
          </div>
        </div>

        <div className="border-t border-slate-500/5">
          {rankingList.length === 0 ? (
            <p className="text-center text-xs text-stone-500 py-4">Nenhum colaborador ainda.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-white/5 bg-transparent">
              <div className="grid grid-cols-[80px_1fr_80px] gap-2 px-4 py-3 bg-transparent border-b border-white/5 border-dashed">
                <span className="text-[9px] font-bold text-stone-500 tracking-[0.2em] uppercase text-center">Colocação</span>
                <span className="text-[9px] font-bold text-stone-500 tracking-[0.2em] uppercase text-center">Nome</span>
                <span className="text-[9px] font-bold text-stone-500 tracking-[0.2em] uppercase text-right">Bilhetes</span>
              </div>
              {rankingList.slice(0, 3).map((u, idx) => (
                <div
                  key={u.position}
                  className={`grid grid-cols-[80px_1fr_80px] gap-2 items-center px-4 py-3 transition-colors ${idx !== 0 ? 'border-t border-white/5' : ''} bg-transparent`}
                >
                  <div className="flex items-center justify-center">
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-black ${u.color ?? 'border-white/10 bg-white/5 text-stone-400'
                      }`}>
                      {u.position <= 3 ? <Trophy size={14} /> : u.position}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-stone-300 truncate text-center">{u.name}</span>
                  <span className="text-xs font-bold text-stone-300 tabular-nums text-right">{u.tickets.toLocaleString('pt-BR')}</span>
                </div>
              ))}
              {user && (
                <div className="py-2.5 text-center bg-transparent border-t border-white/5">
                  <p className="text-[9px] text-stone-500 font-medium">Sua posição: #</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Caixa Misteriosa */}
      {/* FALTA ADICIONAR ANIMAÇÃO HOVER */}
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-2xl border border-slate-500/5 bg-slate-800/40 p-6 shadow-lg backdrop-blur-xl">
        <div className="flex items-center border-b border-slate-500/5 pb-2 justify-between">
          <div className="flex items-center">
            <ShoppingBag size={16} className="mr-2 text-emerald-400" />
            <h2 className="text-lg font-mono text-emerald-400 uppercase">Caixa Mistériosa</h2>
          </div>
        </div>

        <p className="text-sm text-zinc-300">Ganhe caixas ao comprar em grandes quantidades e concorra a prêmios instantâneos!</p>

        <div className="flex gap-4">
          {mysteryBoxRules.map((rule) => (
            <div
              key={`${rule.boxes}-${rule.minTickets}`}
              className="w-1/3 flex flex-col items-center gap-2 border border-white/5 bg-slate-800/40 rounded-lg p-4"
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

      {/* Premio da Caixa Misteriosa */}
      {/* FALTA CRIAR API DE CONSUMO DE PREMIOS DISPONIVEIS */}
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-2xl border border-slate-500/5 bg-slate-800/40 p-6 shadow-lg backdrop-blur-xl">
        <div className="flex items-center border-b border-slate-500/5 pb-2 justify-between">
          <div className="flex items-center">
            <Award size={16} className="mr-2 text-emerald-400" />
            <h2 className="text-lg font-mono text-emerald-400 uppercase">Prêmios das Caixas</h2>
          </div>
          <span className="text-xs font-mono uppercase text-zinc-500">
            {prizes.length} disponíveis
          </span>
        </div>

        {prizes.length === 0 ? (
          <p className="text-xs text-zinc-500">Nenhum prêmio disponível no momento.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {prizes.map((prize) => (
              <div
                key={prize.id}
                className="flex items-center justify-between border border-white/5 bg-slate-800/40 rounded-lg p-4"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-mono uppercase text-zinc-200">{prize.title}</span>
                  {prize.description ? (
                    <span className="text-xs text-zinc-500">{prize.description}</span>
                  ) : null}
                </div>
                <div className="text-right">
                  <span className="block text-xs uppercase text-zinc-500">Restam</span>
                  <span className="text-sm font-bold text-emerald-400">{prize.remaining}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bilheteria */}
      {/* FALTA CRIAR API DE GANHAR CAIXA MISTERIIOSA MAXIMO DE 6 COM 1200 BILHETES POR COMPRA */}
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-2xl border border-slate-500/5 bg-slate-800/40 p-6 shadow-lg backdrop-blur-xl">
        <div className="flex items-center border-b border-slate-500/5 pb-2 justify-between">
          <div className="flex items-center">
            <Ticket size={16} className="mr-2 text-emerald-400" />
            <h2 className="text-lg font-mono text-emerald-400 uppercase">Bilheteria</h2>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[5, 10, 100].map((value) => (
            <button key={value} onClick={() => handleQuantitySelect(value)} className="flex flex-col items-center gap-2 border border-white/5 bg-slate-800/40 text-zinc-200 tabular-nums rounded-lg p-4">
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

        <div className="flex items-center justify-center">
          <span className="text-xs uppercase font-mono text-zinc-500">O mínimo para compra é de {raffle.minNumbers} bilhete{raffle.minNumbers > 1 ? "s" : ""}</span>
        </div>


        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-slate-800/40 px-4 py-4">
          <div className="flex flex-col">
            <span className="text-xs uppercase font-mono text-zinc-500">Total a pagar</span>
            <span className="text-lg font-bold text-white">{formatCurrency((Number(raffle.price) || 0) * ticketCount)}</span>
          </div>
          <div className="flex items-center gap-4 border border-white/5 bg-slate-800/40 rounded-lg px-4 py-2">
            <div className="rounded-xl">
              <Gift size={16} className="text-zinc-500" />
            </div>
            <span className="text-xs font-mono uppercase text-zinc-500">Você ganha<br />0 caixas</span>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full items-center rounded-2xl bg-emerald-500 text-sm font-mono font-bold uppercase text-zinc-200 p-4 tracking-widest text-[#0B1120] shadow-[0_4px_24px_rgba(16,185,129,0.25)] transition-all hover:bg-emerald-400"
        >
          Pagar com PIX
        </motion.button>

      </div>
    </motion.div >
  );
}