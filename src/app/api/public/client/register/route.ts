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
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const phone = String(body?.phone || "").trim();
    const cpf = onlyDigits(String(body?.cpf || ""));

    if (!slug || !name || !email || !phone || !cpf) {
      return NextResponse.json({ success: false, error: "Nome, email, telefone, CPF e slug sao obrigatorios." }, { status: 400 });
    }

    if (cpf.length !== 11) {
      return NextResponse.json({ success: false, error: "CPF invalido." }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ success: false, error: "Organizacao nao encontrada." }, { status: 404 });
    }

    const existingByEmail = await prisma.client.findFirst({
      where: {
        tenantId: tenant.id,
        email,
      },
      select: { id: true, cpf: true },
    });

    const existingByCpf = await prisma.client.findFirst({
      where: {
        tenantId: tenant.id,
        cpf,
      },
      select: { id: true, email: true },
    });

    if (existingByEmail && existingByEmail.cpf !== cpf) {
      return NextResponse.json({ success: false, error: "Este email ja esta vinculado a outro CPF." }, { status: 409 });
    }

    if (existingByCpf && existingByCpf.email !== email) {
      return NextResponse.json({ success: false, error: "Este CPF ja esta vinculado a outro email." }, { status: 409 });
    }

    const client = existingByEmail || existingByCpf
      ? await prisma.client.update({
        where: { id: (existingByEmail?.id || existingByCpf?.id)! },
        data: {
          name,
          email,
          phone,
          cpf,
        },
        include: { profile: true },
      })
      : await prisma.client.create({
        data: {
          tenantId: tenant.id,
          name,
          email,
          phone,
          cpf,
        },
        include: { profile: true },
      });

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
    console.error("Erro no registro de cliente:", error);
    return NextResponse.json({ success: false, error: "Erro interno do servidor." }, { status: 500 });
  }
}
