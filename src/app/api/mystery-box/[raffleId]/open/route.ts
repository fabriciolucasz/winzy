import { AwardClaimType, AwardType, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/database/prisma";
import { getClientAuthUser } from "@/lib/auth/mddleware";

type PrizeCandidate = {
  id: string;
  name: string;
  value: number;
  chance: number;
  remaining: number;
};

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

function pickWeightedPrize(prizes: PrizeCandidate[]): PrizeCandidate | null {
  if (prizes.length === 0) return null;

  // Fallback de 0.0010% quando chance for 0
  const FALLBACK_CHANCE = 0.000001;

  const prizeWeights = prizes.map(prize => ({
    ...prize,
    weight: Math.max(Number(prize.chance) || 0, FALLBACK_CHANCE),
  }));

  const totalChance = prizeWeights.reduce((sum, prize) => sum + prize.weight, 0);

  // Se todas as chances são 0, seleciona aleatoriamente de forma uniforme
  if (totalChance <= 0) {
    const randomIndex = Math.floor(Math.random() * prizes.length);
    return prizes[randomIndex] ?? null;
  }

  // Sorteio ponderado: gera número aleatório entre 0 e totalChance
  const target = Math.random() * totalChance;
  let cumulative = 0;

  for (const prize of prizeWeights) {
    cumulative += prize.weight;
    if (target <= cumulative) {
      return prizes.find(p => p.id === prize.id) ?? null;
    }
  }

  // Fallback para o último prêmio (edge case)
  return prizes[prizes.length - 1] ?? null;
}

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

function isCrossSiteRequestBlocked(request: NextRequest): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return true;

  const origin = request.headers.get("origin");
  if (!origin) return false;

  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  if (!host) return false;

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const proto = forwardedProto || (host.includes("localhost") ? "http" : "https");
  const expectedOrigin = `${proto}://${host}`;

  return origin !== expectedOrigin;
}

type OpenBoxResult =
  | {
    kind: "success";
    unlockedBoxes: number;
    openedBoxes: number;
    completedTickets: number;
    prize: {
      id: string;
      name: string;
      value: number;
      chance: number;
      remaining: number;
    };
    award: {
      id: string;
      name: string;
      type: AwardType;
      claimedType: AwardClaimType;
      awardedValue: number | null;
      createdAt: string;
    };
  }
  | {
    kind: "blocked";
    status: number;
    error: string;
    unlockedBoxes: number;
    openedBoxes: number;
    completedTickets: number;
  }
  | {
    kind: "retry";
  };

async function openBoxSecure(args: { raffleId: string; tenantId: string; clientId: string }): Promise<OpenBoxResult> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await prisma.$transaction(
      async (tx) => {
        // Serializa abertura por cliente+rifa para evitar corrida e dupla abertura.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`mystery:${args.tenantId}:${args.raffleId}:${args.clientId}`}))`;

        const raffle = await tx.raffle.findFirst({
          where: {
            id: args.raffleId,
            tenantId: args.tenantId,
            status: "ACTIVE",
          },
          select: {
            id: true,
            tenantId: true,
          },
        });

        if (!raffle) {
          return {
            kind: "blocked" as const,
            status: 404,
            error: "Rifa nao encontrada.",
            unlockedBoxes: 0,
            openedBoxes: 0,
            completedTickets: 0,
          };
        }

        const client = await tx.client.findFirst({
          where: {
            id: args.clientId,
            tenantId: args.tenantId,
          },
          select: { id: true },
        });

        if (!client) {
          return {
            kind: "blocked" as const,
            status: 404,
            error: "Cliente nao encontrado.",
            unlockedBoxes: 0,
            openedBoxes: 0,
            completedTickets: 0,
          };
        }

        // Contar caixas ganhas somando cada pagamento individual
        const completedPayments = await tx.payment.findMany({
          where: {
            tenantId: raffle.tenantId,
            clientId: client.id,
            status: "COMPLETED",
          },
          select: {
            amount: true,
            tickets: {
              where: {
                raffleId: raffle.id,
              },
              select: { id: true },
            },
          },
        });

        // Somar caixas de cada payment individual baseado nos bilhetes daquela rifa
        const unlockedBoxes = completedPayments.reduce((total, payment) => {
          const raffleTicketsFromPayment = payment.tickets.length;
          return total + getBoxesFromTickets(raffleTicketsFromPayment);
        }, 0);
        const openedBoxes = await tx.award.count({
          where: {
            tenantId: raffle.tenantId,
            raffleId: raffle.id,
            clientId: client.id,
            type: "INSTANT_PRIZE",
          },
        });

        if (unlockedBoxes <= 0) {
          return {
            kind: "blocked" as const,
            status: 403,
            error: "Voce ainda nao desbloqueou caixas misteriosas nesta rifa.",
            unlockedBoxes,
            openedBoxes,
            completedTickets: completedPayments.reduce((sum, p) => sum + p.tickets.length, 0),
          };
        }

        if (openedBoxes >= unlockedBoxes) {
          return {
            kind: "blocked" as const,
            status: 409,
            error: "Todas as caixas disponiveis para esta faixa de tickets ja foram abertas.",
            unlockedBoxes,
            openedBoxes,
            completedTickets: completedPayments.reduce((sum, p) => sum + p.tickets.length, 0),
          };
        }

        const availablePrizesRaw = await tx.mysteryPrize.findMany({
          where: {
            raffleId: raffle.id,
            remaining: {
              gt: 0,
            },
          },
          select: {
            id: true,
            name: true,
            value: true,
            chance: true,
            remaining: true,
          },
        });

        const availablePrizes: PrizeCandidate[] = availablePrizesRaw.map((prize) => ({
          id: prize.id,
          name: prize.name,
          value: Number(prize.value),
          chance: Number(prize.chance),
          remaining: prize.remaining,
        }));

        if (availablePrizes.length === 0) {
          return {
            kind: "blocked" as const,
            status: 404,
            error: "Nao ha premios instantaneos disponiveis no momento.",
            unlockedBoxes,
            openedBoxes,
            completedTickets: completedPayments.reduce((sum, p) => sum + p.tickets.length, 0),
          };
        }

        const selectedPrize = pickWeightedPrize(availablePrizes);
        if (!selectedPrize) {
          return {
            kind: "blocked" as const,
            status: 500,
            error: "Falha ao sortear premio.",
            unlockedBoxes,
            openedBoxes,
            completedTickets: completedPayments.reduce((sum, p) => sum + p.tickets.length, 0),
          };
        }

        const decrease = await tx.mysteryPrize.updateMany({
          where: {
            id: selectedPrize.id,
            raffleId: raffle.id,
            remaining: {
              gt: 0,
            },
          },
          data: {
            remaining: {
              decrement: 1,
            },
          },
        });

        if (decrease.count === 0) {
          return { kind: "retry" as const };
        }

        const award = await tx.award.create({
          data: {
            tenantId: raffle.tenantId,
            clientId: client.id,
            raffleId: raffle.id,
            name: selectedPrize.name,
            type: "INSTANT_PRIZE",
            claimedType: "PRODUCT",
            awardedValue: selectedPrize.value,
          },
          select: {
            id: true,
            name: true,
            type: true,
            claimedType: true,
            awardedValue: true,
            createdAt: true,
          },
        });

        return {
          kind: "success" as const,
          unlockedBoxes,
          openedBoxes: openedBoxes + 1,
          completedTickets: completedPayments.reduce((sum, p) => sum + p.tickets.length, 0),
          prize: {
            id: selectedPrize.id,
            name: selectedPrize.name,
            value: selectedPrize.value,
            chance: selectedPrize.chance,
            remaining: Math.max(selectedPrize.remaining - 1, 0),
          },
          award: {
            id: award.id,
            name: award.name,
            type: award.type,
            claimedType: award.claimedType,
            awardedValue: award.awardedValue ? Number(award.awardedValue) : null,
            createdAt: award.createdAt.toISOString(),
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (result.kind === "retry") {
      continue;
    }

    return result;
  }

  return {
    kind: "blocked",
    status: 409,
    error: "Nao foi possivel abrir a caixa. Tente novamente.",
    unlockedBoxes: 0,
    openedBoxes: 0,
    completedTickets: 0,
  };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ raffleId: string }> }) {
  try {
    if (isCrossSiteRequestBlocked(request)) {
      return jsonNoStore({ success: false, error: "Origem da requisicao nao permitida." }, 403);
    }

    const authClient = await getClientAuthUser();
    if (!authClient || !authClient.tenantId || !authClient.userId) {
      return jsonNoStore({ success: false, error: "Nao autenticado." }, 401);
    }

    const { raffleId } = await params;
    if (!raffleId) {
      return jsonNoStore({ success: false, error: "Rifa invalida." }, 400);
    }

    const result = await openBoxSecure({
      raffleId,
      tenantId: authClient.tenantId,
      clientId: authClient.userId,
    });

    if (result.kind === "retry") {
      return jsonNoStore(
        { success: false, error: "Nao foi possivel abrir a caixa. Tente novamente." },
        409,
      );
    }

    if (result.kind !== "success") {
      return jsonNoStore(
        {
          success: false,
          error: result.error,
          unlockedBoxes: result.unlockedBoxes,
          openedBoxes: result.openedBoxes,
          completedTickets: result.completedTickets,
        },
        result.status,
      );
    }

    return jsonNoStore({
      success: true,
      unlockedBoxes: result.unlockedBoxes,
      openedBoxes: result.openedBoxes,
      remainingBoxes: Math.max(result.unlockedBoxes - result.openedBoxes, 0),
      completedTickets: result.completedTickets,
      prize: result.prize,
      award: result.award,
    });
  } catch (error) {
    console.error("Erro ao abrir caixa misteriosa:", error);
    return jsonNoStore({ success: false, error: "Erro interno do servidor." }, 500);
  }
}

export async function GET() {
  return jsonNoStore(
    { success: false, error: "Metodo nao permitido. Use POST para abrir a caixa." },
    405,
  );
}