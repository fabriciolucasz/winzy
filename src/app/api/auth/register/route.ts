import prisma from "@/lib/database/prisma";
import { ZodError } from "zod";
import { NextRequest } from "next/server";
import bcrypt from "bcrypt";
import { sendVerificationEmail } from "@/lib/auth/email";
import { generateToken, getCookieName } from "@/lib/auth/jwt";
import { Prisma } from "@prisma/client";
import { jsonError, jsonNoStore } from "@/lib/server/http";
import { checkRateLimit, getRequestIp } from "@/lib/server/rate-limit";
import { authRegisterSchema } from "@/lib/validation/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, phone, cpf } = authRegisterSchema.parse(await request.json());
    const ip = getRequestIp(request);
    const rateLimit = checkRateLimit({
      key: `auth:register:${ip}:${email}`,
      limit: 5,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return jsonError("Muitas tentativas. Tente novamente em instantes.", 429, {
        retryAfter: rateLimit.retryAfterSeconds,
      });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return jsonError("Email ja registrado", 400);
    }

    const existingCpf = await prisma.user.findUnique({ where: { cpf } });

    if (existingCpf) {
      return jsonError("CPF ja registrado", 400);
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
    const response = jsonNoStore(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      },
      201
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
    if (error instanceof ZodError) {
      return jsonError("Payload invalido.", 400, {
        issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      });
    }

    console.error("Erro no registro:", error instanceof Error ? error.message : "erro desconhecido");

    // Handle Prisma unique constraint violations
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const field = (error.meta?.target as string[])?.[0] || 'campo';
        if (field === 'email') {
          return jsonError("Email ja registrado", 400);
        } else if (field === 'cpf') {
          return jsonError("CPF ja registrado", 400);
        } else if (field === 'phone') {
          return jsonError("Numero de telefone ja registrado", 400);
        }
      }
    }

    return jsonError("Erro interno do servidor", 500);
  }
}