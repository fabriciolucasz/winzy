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
    include: {
      connections: {
        where: {
          provider: "MERCADO_PAGO",
          status: "ACTIVE",
        },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });
}

export async function GET() {
  const authUser = await getAuthUser();

  if (!authUser) {
    return NextResponse.json({ success: false, error: "Nao autenticado." }, { status: 401 });
  }

  const tenant = await getActiveTenant(authUser.userId);

  if (!tenant) {
    return NextResponse.json({ success: false, error: "Organizacao ativa nao encontrada." }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      customDomain: tenant.customDomain,
      metaTitle: tenant.metaTitle,
      metaDescription: tenant.metaDescription,
      favicon: tenant.favicon,
      logo: tenant.logo,
      instagram: tenant.instagram,
      telegram: tenant.telegram,
      supportUrl: tenant.supportUrl,
      planName: tenant.planName,
      planPriceMonthly: tenant.planPriceMonthly,
      billingDay: tenant.billingDay,
      nextBillingAt: tenant.nextBillingAt,
      subscriptionStatus: tenant.subscriptionStatus,
      mercadoPago: {
        connected: tenant.connections.length > 0,
        accountId: tenant.connections[0]?.providerAccountId ?? null,
        publicEmail: tenant.connections[0]?.publicEmail ?? null,
      },
    },
  });
}

export async function PATCH(request: NextRequest) {
  const authUser = await getAuthUser();

  if (!authUser) {
    return NextResponse.json({ success: false, error: "Nao autenticado." }, { status: 401 });
  }

  const tenant = await getActiveTenant(authUser.userId);

  if (!tenant) {
    return NextResponse.json({ success: false, error: "Organizacao ativa nao encontrada." }, { status: 404 });
  }

  const payload = await request.json();
  const customDomain = payload?.customDomain ? String(payload.customDomain).trim().toLowerCase() : null;

  if (customDomain && /(^https?:\/\/)|\//i.test(customDomain)) {
    return NextResponse.json(
      { success: false, error: "Informe apenas o host de dominio, sem protocolo ou barras." },
      { status: 400 },
    );
  }

  if (customDomain && customDomain === tenant.slug) {
    return NextResponse.json(
      { success: false, error: "Dominio customizado invalido." },
      { status: 400 },
    );
  }

  if (customDomain) {
    const domainOwner = await prisma.tenant.findFirst({
      where: {
        customDomain,
        id: { not: tenant.id },
      },
      select: { id: true },
    });

    if (domainOwner) {
      return NextResponse.json(
        { success: false, error: "Esse dominio ja esta em uso por outra organizacao." },
        { status: 409 },
      );
    }
  }

  const updated = await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      name: String(payload?.name ?? tenant.name).trim() || tenant.name,
      customDomain,
      metaTitle: payload?.metaTitle ? String(payload.metaTitle).trim() : null,
      metaDescription: payload?.metaDescription ? String(payload.metaDescription).trim() : null,
      favicon: payload?.favicon ? String(payload.favicon).trim() : null,
      logo: payload?.logo ? String(payload.logo).trim() : null,
      instagram: payload?.instagram ? String(payload.instagram).trim() : null,
      telegram: payload?.telegram ? String(payload.telegram).trim() : null,
      supportUrl: payload?.supportUrl ? String(payload.supportUrl).trim() : null,
    },
  });

  return NextResponse.json({
    success: true,
    tenant: {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      customDomain: updated.customDomain,
      metaTitle: updated.metaTitle,
      metaDescription: updated.metaDescription,
      favicon: updated.favicon,
      logo: updated.logo,
      instagram: updated.instagram,
      telegram: updated.telegram,
      supportUrl: updated.supportUrl,
      planName: updated.planName,
      planPriceMonthly: updated.planPriceMonthly,
      billingDay: updated.billingDay,
      nextBillingAt: updated.nextBillingAt,
      subscriptionStatus: updated.subscriptionStatus,
    },
  });
}
