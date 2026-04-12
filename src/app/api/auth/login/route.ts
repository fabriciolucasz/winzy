import bcrypt from "bcrypt";
import prisma from "@/lib/database/prisma";
import { ZodError } from "zod";
import { NextRequest } from "next/server";
import { generateToken, getCookieName } from "@/lib/auth/jwt";
import { jsonError, jsonNoStore } from "@/lib/server/http";
import { checkRateLimit, getRequestIp } from "@/lib/server/rate-limit";
import { authLoginSchema } from "@/lib/validation/auth";

const DUMMY_HASH = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8kD0fG8JrIoYNewc19hXtOD87Qy4Fu";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = authLoginSchema.parse(await request.json());
    const ip = getRequestIp(request);
    const rateLimit = checkRateLimit({
      key: `auth:login:${ip}:${email}`,
      limit: 8,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return jsonError("Muitas tentativas. Tente novamente em instantes.", 429, {
        retryAfter: rateLimit.retryAfterSeconds,
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        ownedTenants: true,
        memberTenants: {
          include: { tenant: true }
        }
      }
    });

    const passwordHash = user?.password || DUMMY_HASH;
    const validPassword = await bcrypt.compare(password, passwordHash);

    if (!user || !validPassword) {
      return jsonError("Email ou senha invalidos", 404);
    }

    const token = await generateToken({ userId: user.id, email: user.email, type: "user" });
    const tenants = [...user.ownedTenants, ...user.memberTenants.map(m => m.tenant)];
    const response = jsonNoStore(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        tenants: tenants.map(t => ({ id: t.id, name: t.name, slug: t.slug })),
      },
      200
    );

    response.cookies.set({
      name: getCookieName(),
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError("Payload invalido.", 400, {
        issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      });
    }

    console.error("Erro no login:", error instanceof Error ? error.message : "erro desconhecido");
    return jsonError("Erro interno do servidor", 500);
  }
}