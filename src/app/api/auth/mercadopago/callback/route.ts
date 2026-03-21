import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/database/prisma";
import { getAuthUser } from "@/lib/auth/mddleware";

type MercadoPagoOAuthResponse = {
  access_token?: string;
  refresh_token?: string;
  user_id?: number;
  expires_in?: number;
  scope?: string;
  public_key?: string;
  live_mode?: boolean;
};

function getBaseUrl(request: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");

  const host = request.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

function parseState(state: string | null): { tenantId: string; userId: string } | null {
  if (!state) return null;

  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as { tenantId?: string; userId?: string };
    if (!parsed.tenantId || !parsed.userId) return null;
    return { tenantId: parsed.tenantId, userId: parsed.userId };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);

  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = parseState(request.nextUrl.searchParams.get("state"));

  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard/settings?mp=invalid-callback", baseUrl));
  }

  if (state.userId !== authUser.userId) {
    return NextResponse.redirect(new URL("/dashboard/settings?mp=state-mismatch", baseUrl));
  }

  const tenant = await prisma.tenant.findFirst({
    where: {
      id: state.tenantId,
      OR: [
        { ownerId: authUser.userId },
        {
          members: {
            some: {
              userId: authUser.userId,
              revokedAt: null,
            },
          },
        },
      ],
    },
    select: { id: true },
  });

  if (!tenant) {
    return NextResponse.redirect(new URL("/dashboard/settings?mp=tenant-not-found", baseUrl));
  }

  const clientId = process.env.MP_CLIENT_ID;
  const clientSecret = process.env.MP_CLIENT_SECRET;
  const redirectUri = process.env.MP_REDIRECT_URI || `${baseUrl}/api/auth/mercadopago/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/dashboard/settings?mp=missing-credentials", baseUrl));
  }

  const tokenResponse = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL("/dashboard/settings?mp=token-exchange-failed", baseUrl));
  }

  const tokenData = (await tokenResponse.json()) as MercadoPagoOAuthResponse;

  if (!tokenData.access_token || !tokenData.user_id) {
    return NextResponse.redirect(new URL("/dashboard/settings?mp=invalid-token", baseUrl));
  }

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : null;

  await prisma.connection.upsert({
    where: {
      tenantId_provider: {
        tenantId: tenant.id,
        provider: "MERCADO_PAGO",
      },
    },
    create: {
      tenantId: tenant.id,
      provider: "MERCADO_PAGO",
      providerAccountId: String(tokenData.user_id),
      publicEmail: null,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      expiresAt,
      status: "ACTIVE",
    },
    update: {
      providerAccountId: String(tokenData.user_id),
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      expiresAt,
      status: "ACTIVE",
    },
  });

  return NextResponse.redirect(new URL("/dashboard/settings?mp=connected", baseUrl));
}
