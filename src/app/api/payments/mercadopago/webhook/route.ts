import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/database/prisma";

type MercadoPagoPaymentLookupResponse = {
  id?: number;
  status?: string;
  metadata?: {
    raffleId?: string;
    ticketCount?: number;
  };
};

function mapMercadoPagoStatus(status: string | undefined): "PENDING" | "COMPLETED" | "FAILED" | "CANCELED" {
  switch (status) {
    case "approved":
      return "COMPLETED";
    case "rejected":
      return "FAILED";
    case "cancelled":
    case "refunded":
    case "charged_back":
      return "CANCELED";
    default:
      return "PENDING";
  }
}

function randomInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive);
}

function generateRandomTicketNumbers(count: number, takenNumbers: Set<number>): number[] {
  const MAX_TICKET_SPACE = 1_000_000; // 000000 a 999999

  if (count <= 0) return [];

  if (count > MAX_TICKET_SPACE - takenNumbers.size) {
    throw new Error("Nao ha numeros de ticket suficientes para concluir a emissao.");
  }

  const generated = new Set<number>();
  let attempts = 0;
  const maxAttempts = Math.max(50_000, count * 1000);

  while (generated.size < count && attempts < maxAttempts) {
    attempts += 1;
    const number = randomInt(MAX_TICKET_SPACE);
    if (takenNumbers.has(number) || generated.has(number)) continue;
    generated.add(number);
  }

  if (generated.size < count) {
    // Fallback robusto para cenários de alta ocupação mantendo pseudoaleatoriedade por offset.
    const offset = randomInt(MAX_TICKET_SPACE);
    for (let i = 0; i < MAX_TICKET_SPACE && generated.size < count; i += 1) {
      const candidate = (offset + i) % MAX_TICKET_SPACE;
      if (takenNumbers.has(candidate) || generated.has(candidate)) continue;
      generated.add(candidate);
    }
  }

  if (generated.size < count) {
    throw new Error("Falha ao gerar tickets aleatorios unicos.");
  }

  return Array.from(generated);
}

async function processPaymentNotificationByExternalId(externalId: string) {
  const payment = await prisma.payment.findUnique({
    where: { externalId },
    include: {
      tenant: {
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
      },
      tickets: {
        select: { id: true },
      },
    },
  });

  if (!payment) {
    return { ignored: true, reason: "payment-not-found" as const };
  }

  const connection = payment.tenant.connections[0];
  if (!connection) {
    return { ignored: true, reason: "missing-tenant-connection" as const };
  }

  const mpLookup = await fetch(`https://api.mercadopago.com/v1/payments/${externalId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${connection.accessToken}`,
      Accept: "application/json",
    },
  });

  if (!mpLookup.ok) {
    const details = await mpLookup.text();
    throw new Error(`Nao foi possivel consultar pagamento no Mercado Pago: ${details}`);
  }

  const mpData = (await mpLookup.json()) as MercadoPagoPaymentLookupResponse;
  const mappedStatus = mapMercadoPagoStatus(mpData.status);

  if (mappedStatus !== "COMPLETED") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: mappedStatus },
    });

    return { success: true, completed: false };
  }

  if (payment.status === "COMPLETED" && payment.tickets.length > 0) {
    return { success: true, completed: true, alreadyProcessed: true };
  }

  const raffleId = String(mpData.metadata?.raffleId || "").trim();
  if (!raffleId) {
    throw new Error("Pagamento aprovado sem raffleId no metadata.");
  }

  const raffle = await prisma.raffle.findFirst({
    where: {
      id: raffleId,
      tenantId: payment.tenantId,
    },
    select: {
      id: true,
      tenantId: true,
      maxTickets: true,
    },
  });

  if (!raffle) {
    throw new Error("Rifa do pagamento nao encontrada para emissao de tickets.");
  }

  await prisma.$transaction(async (tx) => {
    const alreadyIssuedCount = await tx.ticket.count({
      where: {
        paymentId: payment.id,
      },
    });

    if (alreadyIssuedCount > 0) {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "COMPLETED" },
      });
      return;
    }

    const existingTicketsCount = await tx.ticket.count({
      where: {
        raffleId: raffle.id,
      },
    });

    if (existingTicketsCount + payment.amount > raffle.maxTickets) {
      throw new Error("Quantidade de tickets excede o limite da rifa.");
    }

    const takenNumbersList = await tx.ticket.findMany({
      where: {
        raffleId: raffle.id,
      },
      select: {
        number: true,
      },
    });

    const takenNumbers = new Set<number>(takenNumbersList.map((t) => t.number));
    const randomNumbers = generateRandomTicketNumbers(payment.amount, takenNumbers);

    await tx.ticket.createMany({
      data: randomNumbers.map((ticketNumber) => ({
        tenantId: payment.tenantId,
        raffleId: raffle.id,
        clientId: payment.clientId,
        paymentId: payment.id,
        number: ticketNumber,
      })),
    });

    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "COMPLETED" },
    });
  });

  return { success: true, completed: true };
}

function getNotificationPaymentId(request: NextRequest, body: unknown): string | null {
  const queryDataId = request.nextUrl.searchParams.get("data.id");
  const queryId = request.nextUrl.searchParams.get("id");

  if (queryDataId) return queryDataId;
  if (queryId) return queryId;

  if (body && typeof body === "object") {
    const parsedBody = body as {
      data?: { id?: string | number };
      id?: string | number;
      resource?: string;
    };

    if (parsedBody.data?.id !== undefined) return String(parsedBody.data.id);
    if (parsedBody.id !== undefined) return String(parsedBody.id);

    if (parsedBody.resource) {
      const resourceId = parsedBody.resource.split("/").pop();
      if (resourceId) return resourceId;
    }
  }

  return null;
}

async function handleNotification(request: NextRequest, body: unknown) {
  const paymentExternalId = getNotificationPaymentId(request, body);

  if (!paymentExternalId) {
    return NextResponse.json({ success: true, ignored: true, reason: "missing-payment-id" });
  }

  try {
    const result = await processPaymentNotificationByExternalId(paymentExternalId);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Erro ao processar webhook do Mercado Pago:", error);
    return NextResponse.json({ success: false, error: "Erro ao processar webhook." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: unknown = null;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  return handleNotification(request, body);
}

export async function GET(request: NextRequest) {
  return handleNotification(request, null);
}
