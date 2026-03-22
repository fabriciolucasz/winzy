import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/database/prisma";
import { generateToken, getClientCookieName } from "@/lib/auth/jwt";

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const slug = String(body?.slug || "").trim().toLowerCase();
    const email = String(body?.email || "").trim().toLowerCase();
    const cpf = onlyDigits(String(body?.cpf || ""));

    if (!slug || !email || !cpf) {
      return NextResponse.json({ success: false, error: "Slug, email e CPF sao obrigatorios." }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      include: {
        subscription: {
          select: { status: true }
        }
      }
    });

    if (!tenant) {
      return NextResponse.json({ success: false, error: "Organizacao nao encontrada." }, { status: 404 });
    }

    // Validar se o tenant tem uma subscrição ativa
    if (!tenant.subscription || tenant.subscription.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          error: "A plataforma nao esta ativa para esta organizacao. Contate o administrador."
        },
        { status: 403 }
      );
    }

    const client = await prisma.client.findFirst({
      where: {
        tenantId: tenant.id,
        email,
        cpf,
      },
      include: { profile: true },
    });

    if (!client) {
      return NextResponse.json({ success: false, error: "Cliente nao encontrado para este email/CPF." }, { status: 404 });
    }

    const token = await generateToken({
      userId: client.id,
      email: client.email,
      type: "client",
      tenantId: tenant.id,
    });

    const response = NextResponse.json({
      success: true,
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        cpf: client.cpf,
        nickname: client.profile?.nickname ?? null,
        avatar: client.profile?.avatar ?? null,
      },
    });

    response.cookies.set({
      name: getClientCookieName(),
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Erro no login de cliente:", error);
    return NextResponse.json({ success: false, error: "Erro interno do servidor." }, { status: 500 });
  }
}
