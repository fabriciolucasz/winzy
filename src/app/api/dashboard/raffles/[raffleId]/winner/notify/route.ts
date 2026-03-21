import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/database/prisma";
import { getAuthUser } from "@/lib/auth/mddleware";
import { getActiveTenantCookieName } from "@/lib/auth/jwt";
import { sendRaffleWinnerEmail } from "@/lib/auth/email";

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
    },
  });
}

export async function POST(_request: Request, { params }: { params: Promise<{ raffleId: string }> }) {
  const authUser = await getAuthUser();

  if (!authUser) {
    return NextResponse.json({ success: false, error: "Nao autenticado." }, { status: 401 });
  }

  const tenant = await getActiveTenant(authUser.userId);

  if (!tenant) {
    return NextResponse.json({ success: false, error: "Organizacao ativa nao encontrada." }, { status: 404 });
  }

  const { raffleId } = await params;

  const winner = await prisma.award.findFirst({
    where: {
      tenantId: tenant.id,
      raffleId,
      type: "RAFFLE_WINNER",
    },
    orderBy: { createdAt: "desc" },
    select: {
      raffle: {
        select: {
          name: true,
        },
      },
      client: {
        select: {
          name: true,
          email: true,
        },
      },
      ticket: {
        select: {
          number: true,
        },
      },
    },
  });

  if (!winner || !winner.client || !winner.ticket || !winner.raffle) {
    return NextResponse.json({ success: false, error: "Ganhador nao encontrado para notificacao." }, { status: 404 });
  }

  const sent = await sendRaffleWinnerEmail({
    email: winner.client.email,
    clientName: winner.client.name,
    raffleName: winner.raffle.name,
    ticketNumber: winner.ticket.number,
  });

  if (!sent) {
    return NextResponse.json({ success: false, error: "Falha ao enviar notificacao por e-mail." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
