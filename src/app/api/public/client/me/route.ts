import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/database/prisma";
import { getClientAuthUser } from "@/lib/auth/mddleware";

function getUnlockedBoxes(ticketCount: number): number {
  if (ticketCount >= 1200) return 6;
  if (ticketCount >= 600) return 2;
  if (ticketCount >= 400) return 1;
  return 0;
}

export async function GET(request: NextRequest) {
  try {
    const authClient = await getClientAuthUser();
    if (!authClient || !authClient.tenantId) {
      return NextResponse.json({ success: false, error: "Nao autenticado." }, { status: 401 });
    }

    const slug = String(request.nextUrl.searchParams.get("slug") || "").trim().toLowerCase();
    if (!slug) {
      return NextResponse.json({ success: false, error: "Slug obrigatorio." }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true },
    });

    if (!tenant || tenant.id !== authClient.tenantId) {
      return NextResponse.json({ success: false, error: "Sessao invalida para esta organizacao." }, { status: 403 });
    }

    const client = await prisma.client.findFirst({
      where: {
        id: authClient.userId,
        tenantId: tenant.id,
      },
      include: {
        profile: true,
        awards: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            type: true,
            claimedType: true,
            createdAt: true,
            raffle: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            ticket: {
              select: {
                number: true,
              },
            },
          },
        },
        tickets: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            number: true,
            createdAt: true,
            raffle: {
              select: {
                id: true,
                name: true,
                slug: true,
                banner: true,
                status: true,
                drawDate: true,
              },
            },
            payment: {
              select: {
                id: true,
                status: true,
                totalValue: true,
                amount: true,
                createdAt: true,
              },
            },
          },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            status: true,
            totalValue: true,
            method: true,
            amount: true,
            createdAt: true,
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ success: false, error: "Cliente nao encontrado." }, { status: 404 });
    }

    const winnerTicketByRaffleId = new Map<string, string>();
    for (const award of client.awards) {
      if (award.type !== "RAFFLE_WINNER" || !award.raffle?.id || !award.ticket?.number) {
        continue;
      }

      winnerTicketByRaffleId.set(
        award.raffle.id,
        String(award.ticket.number).padStart(6, "0"),
      );
    }

    const raffleMap = new Map<string, {
      id: string;
      title: string;
      slug: string;
      image: string | null;
      status: string;
      winnerTicketNumber: string | null;
      drawDate: string | null;
      ticketsCount: number;
      completedTicketsCount: number;
      lastTicketAt: string | null;
      totalSpent: number;
    }>();

    for (const ticket of client.tickets) {
      const key = ticket.raffle.id;
      const current = raffleMap.get(key) || {
        id: ticket.raffle.id,
        title: ticket.raffle.name,
        slug: ticket.raffle.slug,
        image: ticket.raffle.banner,
        status: ticket.raffle.status,
        winnerTicketNumber: winnerTicketByRaffleId.get(ticket.raffle.id) ?? null,
        drawDate: ticket.raffle.drawDate ? ticket.raffle.drawDate.toISOString() : null,
        ticketsCount: 0,
        completedTicketsCount: 0,
        lastTicketAt: null,
        totalSpent: 0,
      };

      current.ticketsCount += 1;
      const createdAtIso = ticket.createdAt.toISOString();
      if (!current.lastTicketAt || current.lastTicketAt < createdAtIso) {
        current.lastTicketAt = createdAtIso;
      }

      if (ticket.payment && ticket.payment.status === "COMPLETED") {
        current.completedTicketsCount += 1;
        const totalValue = Number(ticket.payment.totalValue);
        const amount = Math.max(ticket.payment.amount, 1);
        current.totalSpent += totalValue / amount;
      }

      raffleMap.set(key, current);
    }

    const boxCards = Array.from(raffleMap.values()).flatMap((raffleSummary) => {
      const unlockedBoxes = getUnlockedBoxes(raffleSummary.completedTicketsCount);
      if (unlockedBoxes <= 0) return [];

      const openedAwards = client.awards
        .filter((award) => award.type === "INSTANT_PRIZE" && award.raffle?.id === raffleSummary.id)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      return Array.from({ length: unlockedBoxes }, (_, index) => {
        const openedAward = openedAwards[index] ?? null;
        const isOpened = Boolean(openedAward);

        return {
          id: `${raffleSummary.id}-box-${index + 1}`,
          raffleId: raffleSummary.id,
          raffleTitle: raffleSummary.title,
          raffleImage: raffleSummary.image,
          boxNumber: index + 1,
          status: isOpened ? "OPENED" : "AVAILABLE",
          prizeTitle: openedAward?.name ?? null,
          openedAt: openedAward?.createdAt.toISOString() ?? null,
        };
      });
    });

    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        cpf: client.cpf,
        nickname: client.profile?.nickname ?? null,
        avatar: client.profile?.avatar ?? null,
        banner: client.profile?.banner ?? null,
      },
      tenantName: tenant.name,
      summary: {
        totalTickets: client.tickets.length,
        paidTickets: client.tickets.filter(t => t.payment?.status === "COMPLETED").length,
        pendingTickets: client.tickets.filter(t => !t.payment || t.payment.status === "PENDING").length,
        rafflesParticipated: raffleMap.size,
        totalSpent: Array.from(raffleMap.values()).reduce((sum, r) => sum + r.totalSpent, 0),
        winsCount: client.awards.length,
      },
      awards: client.awards.map((award) => ({
        id: award.id,
        name: award.name,
        type: award.type,
        claimedType: award.claimedType,
        createdAt: award.createdAt.toISOString(),
        raffle: award.raffle,
      })),
      tickets: client.tickets.map((ticket) => ({
        id: ticket.id,
        number: String(ticket.number).padStart(6, "0"),
        createdAt: ticket.createdAt.toISOString(),
        raffle: ticket.raffle,
        payment: ticket.payment
          ? {
            id: ticket.payment.id,
            status: ticket.payment.status,
            totalValue: Number(ticket.payment.totalValue),
            amount: ticket.payment.amount,
            createdAt: ticket.payment.createdAt.toISOString(),
          }
          : null,
      })),
      raffles: Array.from(raffleMap.values()).sort((a, b) => (b.lastTicketAt || "").localeCompare(a.lastTicketAt || "")),
      boxes: boxCards,
      payments: client.payments.map((payment) => ({
        id: payment.id,
        status: payment.status,
        totalValue: Number(payment.totalValue),
        method: payment.method,
        ticketCount: payment.amount,
        createdAt: payment.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Erro ao buscar perfil do cliente:", error);
    return NextResponse.json({ success: false, error: "Erro interno do servidor." }, { status: 500 });
  }
}
