import { NextResponse } from "next/server";
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
    },
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ raffleId: string }> }) {
  const authUser = await getAuthUser();

  if (!authUser) {
    return NextResponse.json({ success: false, error: "Nao autenticado." }, { status: 401 });
  }

  const tenant = await getActiveTenant(authUser.userId);

  if (!tenant) {
    return NextResponse.json({ success: false, error: "Organizacao ativa nao encontrada." }, { status: 404 });
  }

  const { raffleId } = await params;

  const award = await prisma.award.findFirst({
    where: {
      tenantId: tenant.id,
      raffleId,
      type: "RAFFLE_WINNER",
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      raffle: {
        select: {
          id: true,
          name: true,
        },
      },
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

  if (!award) {
    return NextResponse.json({ success: false, error: "Ainda nao existe ganhador para esta rifa." }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    winner: {
      awardId: award.id,
      drawnAt: award.createdAt.toISOString(),
      raffle: award.raffle,
      client: award.client,
      ticket: award.ticket,
    },
  });
}
