import prisma from "@/lib/database/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { sendVerificationEmail } from "@/lib/auth/email";
import { generateToken, getCookieName } from "@/lib/auth/jwt";
import { Prisma } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, phone, cpf } = await request.json();

    if (!email || !password || !name || !phone || !cpf) {
      return new Response(JSON.stringify({ error: "Todos os campos são obrigatórios" }), { status: 400 });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "A senha deve ter pelo menos 6 caracteres" }), { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return new Response(JSON.stringify({ error: "Email já registrado" }), { status: 400 });
    }

    const existingCpf = await prisma.user.findUnique({ where: { cpf } });

    if (existingCpf) {
      return new Response(JSON.stringify({ error: "CPF já registrado" }), { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email,
        password: hashedPassword,
        name,
        phone,
        cpf
      }
    })

    const verificationCode = Math.random().toString(36).substring(7).toUpperCase();
    // O envio de e-mail é best-effort para não bloquear cadastro quando o SMTP estiver indisponível.
    void sendVerificationEmail(email, verificationCode).then((sent) => {
      if (!sent) {
        console.warn(`Falha ao enviar e-mail de verificação para ${email}. Cadastro concluído sem bloqueio.`);
      }
    });

    const token = await generateToken({ userId: user.id, email: user.email, type: "user" });
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      },
      { status: 201 }
    );

    response.cookies.set({
      name: getCookieName(),
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Erro no registro:", error);

    // Handle Prisma unique constraint violations
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const field = (error.meta?.target as string[])?.[0] || 'campo';
        if (field === 'email') {
          return NextResponse.json(
            { error: "Email já registrado" },
            { status: 400 }
          );
        } else if (field === 'cpf') {
          return NextResponse.json(
            { error: "CPF já registrado" },
            { status: 400 }
          );
        } else if (field === 'phone') {
          return NextResponse.json(
            { error: "Número de telefone já registrado" },
            { status: 400 }
          );
        }
      }
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}