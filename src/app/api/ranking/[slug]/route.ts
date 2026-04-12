import prisma from "@/lib/database/prisma";
import { NextResponse } from "next/server";
import { getClientAuthUser } from "@/lib/auth/mddleware";

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

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const authClient = await getClientAuthUser();

    const tenant = await prisma.tenant.findUnique({
      where: { slug }
    });

    if (!tenant) {
      return jsonNoStore({ error: "Tenant not found" }, 404);
    }

    const { searchParams } = new URL(request.url);
    const requestedRaffleId = searchParams.get("raffleId")?.trim() || null;

    const raffle = requestedRaffleId
      ? await prisma.raffle.findFirst({
        where: {
          id: requestedRaffleId,
          tenantId: tenant.id,
        },
        select: { id: true },
      })
      : await prisma.raffle.findFirst({
        where: {
          tenantId: tenant.id,
          status: "ACTIVE",
        },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

    if (!raffle) {
      return jsonNoStore({
        success: true,
        ranking: [],
        userPosition: null,
      });
    }

    const grouped = await prisma.payment.groupBy({
      where: {
        tenantId: tenant.id,
        status: "COMPLETED",
        tickets: {
          some: {
            raffleId: raffle.id,
          },
        },
      },
      by: ["clientId"],
      _sum: {
        amount: true,
      },
    });

    const groupedSorted = grouped
      .sort((a, b) => {
        const bAmount = b._sum.amount ?? 0;
        const aAmount = a._sum.amount ?? 0;

        if (bAmount !== aAmount) {
          return bAmount - aAmount;
        }

        return a.clientId.localeCompare(b.clientId);
      });

    const topClientIds = groupedSorted.slice(0, 3).map((entry) => entry.clientId);

    const topClients = topClientIds.length > 0
      ? await prisma.client.findMany({
        where: {
          id: { in: topClientIds },
          tenantId: tenant.id,
        },
        select: {
          id: true,
          name: true,
          profile: {
            select: {
              nickname: true,
            },
          },
        },
      })
      : [];

    const topClientById = new Map(topClients.map((client) => [client.id, client]));

    const ranking = groupedSorted
      .slice(0, 3)
      .map((entry) => {
        const client = topClientById.get(entry.clientId);
        if (!client) return null;

        return {
          id: client.id,
          name: client.name,
          profile: client.profile,
          tickets: entry._sum.amount ?? 0,
        };
      })
      .filter((entry): entry is {
        id: string,
        name: string,
        profile: { nickname: string | null } | null,
        tickets: number,
      } => entry !== null);

    let userPosition: { position: number; tickets: number } | null = null;

    if (authClient && authClient.tenantId === tenant.id) {
      const index = groupedSorted.findIndex((entry) => entry.clientId === authClient.userId);
      const currentUserTickets = index >= 0 ? (groupedSorted[index]._sum.amount ?? 0) : 0;

      if (currentUserTickets > 0) {
        if (index >= 0) {
          userPosition = {
            position: index + 1,
            tickets: currentUserTickets,
          };
        }
      }
    }

    const formattedRanking = ranking.map((entry, index) => {
      const nickname = entry.profile?.nickname?.trim();
      const [firstName, lastName] = entry.name.trim().split(/\s+/);
      const fallbackName = lastName ? `${firstName} ${lastName}` : firstName;
      const displayName = nickname && nickname.length > 0 ? nickname : fallbackName;

      return {
        position: index + 1,
        name: displayName,
        tickets: entry.tickets,
        color: index === 0 ? 'border-amber-400/30 bg-amber-500/20 text-amber-400' :
          index === 1 ? 'border-stone-500/20 bg-stone-500/20 text-stone-300' :
            index === 2 ? 'border-orange-500/30 bg-orange-700/20 text-orange-400' : 'border-white/10 bg-white/5 text-stone-400'
      };
    });

    return jsonNoStore({
      success: true,
      ranking: formattedRanking,
      userPosition,
    });
  } catch (error) {
    return jsonNoStore({ error: "Internal server error" }, 500);
  }
}