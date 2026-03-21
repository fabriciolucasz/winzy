import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/database/prisma";
import { getAuthUser } from "@/lib/auth/mddleware";
import { getActiveTenantCookieName } from "@/lib/auth/jwt";

function getBaseUrl(): string {
  // Em produção, usar NEXT_PUBLIC_APP_URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  // Em desenvolvimento, construir a partir da requisição
  return "http://localhost:3000";
}

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const authUser = await getAuthUser();

  if (!authUser) {
    return NextResponse.redirect(new URL("/login", getBaseUrl()));
  }

  const { slug } = await params;

  const tenant = await prisma.tenant.findFirst({
    where: {
      slug,
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
    select: { slug: true },
  });

  if (!tenant) {
    return NextResponse.redirect(new URL("/dashboard", getBaseUrl()));
  }

  const nextPath = request.nextUrl.searchParams.get("next");
  const safeNextPath = nextPath && nextPath.startsWith("/") ? nextPath : `/dashboard`;
  const baseUrl = getBaseUrl();
  const response = NextResponse.redirect(new URL(safeNextPath, baseUrl));

  response.cookies.set({
    name: getActiveTenantCookieName(),
    value: tenant.slug,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return response;
}