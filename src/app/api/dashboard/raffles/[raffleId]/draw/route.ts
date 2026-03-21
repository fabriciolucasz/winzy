import { AwardType, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/database/prisma";
import { getAuthUser } from "@/lib/auth/mddleware";
import { getActiveTenantCookieName } from "@/lib/auth/jwt";

async function getActiveTenant(userId: string) {
  const cookieStore = await cookies();
  const activeTenantSlug = cookieStore.get(getActiveTenantCookieName())?.value;

  if (!activeTenantSlug) return null;

  return prisma.tenant.findFirst({
    where: {
      slug: activeTenantSlug,
      OR: [
        { ownerId: userId },
        {
          members: {
            some: {
              userId,
              revokedAt: null,
            },
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
    },
  });
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ raffleId: string }> }) {
  const authUser = await getAuthUser();

  if (!authUser) {
    return NextResponse.json({ success: false, error: "Nao autenticado." }, { status: 401 });
  }

  const tenant = await getActiveTenant(authUser.userId);

  if (!tenant) {
    return NextResponse.json({ success: false, error: "Organizacao ativa nao encontrada." }, { status: 404 });
  }

  const { raffleId } = await params;

  if (!raffleId) {
    return NextResponse.json({ success: false, error: "Rifa invalida." }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const raffle = await tx.raffle.findFirst({
          where: {
            id: raffleId,
            tenantId: tenant.id,
            status: "ACTIVE",
          },
          select: {
            id: true,
            name: true,
            maxTickets: true,
          },
        });

        if (!raffle) {
          return { success: false as const, status: 404, error: "Rifa ativa nao encontrada." };
        }

        const alreadyWinner = await tx.award.findFirst({
          where: {
            tenantId: tenant.id,
            raffleId: raffle.id,
            type: "RAFFLE_WINNER",
          },
          select: {
            id: true,
            createdAt: true,
            client: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                cpf: true,
              },
            },
            ticket: {
              select: {
                id: true,
                number: true,
              },
            },
          },
        });

        if (alreadyWinner) {
          return {
            success: true as const,
            status: 200,
            alreadyDrawn: true,
            raffle: {
              id: raffle.id,
              name: raffle.name,
              totalTickets: raffle.maxTickets,
            },
            winner: {
              awardId: alreadyWinner.id,
              drawnAt: alreadyWinner.createdAt.toISOString(),
              client: alreadyWinner.client,
              ticket: alreadyWinner.ticket,
            },
          };
        }

        const soldTicketsCount = await tx.ticket.count({
          where: {
            raffleId: raffle.id,
            payment: {
              status: "COMPLETED",
            },
          },
        });

        if (soldTicketsCount <= 0) {
          return {
            success: false as const,
            status: 409,
            error: "Nao ha bilhetes pagos para realizar o sorteio.",
          };
        }

        const randomOffset = Math.floor(Math.random() * soldTicketsCount);

        const winnerTicket = await tx.ticket.findFirst({
          where: {
            raffleId: raffle.id,
            payment: {
              status: "COMPLETED",
            },
          },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          skip: randomOffset,
          select: {
            id: true,
            number: true,
            clientId: true,
            client: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                cpf: true,
              },
            },
          },
        });

        if (!winnerTicket) {
          return {
            success: false as const,
            status: 409,
            error: "Nao foi possivel selecionar um bilhete vencedor.",
          };
        }

        const award = await tx.award.create({
          data: {
            tenantId: tenant.id,
            raffleId: raffle.id,
            clientId: winnerTicket.clientId,
            ticketId: winnerTicket.id,
            name: `Vencedor da rifa ${raffle.name}`,
            type: AwardType.RAFFLE_WINNER,
            claimedType: "PRODUCT",
          },
          select: {
            id: true,
            createdAt: true,
          },
        });

        return {
          success: true as const,
          status: 200,
          alreadyDrawn: false,
          raffle: {
            id: raffle.id,
            name: raffle.name,
            totalTickets: raffle.maxTickets,
          },
          winner: {
            awardId: award.id,
            drawnAt: award.createdAt.toISOString(),
            client: winnerTicket.client,
            ticket: {
              id: winnerTicket.id,
              number: winnerTicket.number,
            },
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Erro ao executar sorteio da rifa:", error);
    return NextResponse.json({ success: false, error: "Erro interno ao executar sorteio." }, { status: 500 });
  }
}
