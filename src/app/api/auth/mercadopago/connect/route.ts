import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/database/prisma";
import { getAuthUser } from "@/lib/auth/mddleware";
import { getActiveTenantCookieName } from "@/lib/auth/jwt";

function getBaseUrl(request: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");

  const host = request.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);

  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  const clientId = process.env.MP_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL("/dashboard/settings?mp=missing-client-id", baseUrl));
  }

  const cookieStore = await cookies();
  const activeTenantSlug = cookieStore.get(getActiveTenantCookieName())?.value;
  if (!activeTenantSlug) {
    return NextResponse.redirect(new URL("/dashboard/organizations?mp=missing-tenant", baseUrl));
  }

  const tenant = await prisma.tenant.findFirst({
    where: {
      slug: activeTenantSlug,
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

  const redirectUri = process.env.MP_REDIRECT_URI || `${baseUrl}/api/auth/mercadopago/callback`;
  const state = Buffer.from(JSON.stringify({ tenantId: tenant.id, userId: authUser.userId })).toString("base64url");

  const authUrl = new URL("https://auth.mercadopago.com/authorization");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("platform_id", "mp");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("redirect_uri", redirectUri);

  return NextResponse.redirect(authUrl);
}
