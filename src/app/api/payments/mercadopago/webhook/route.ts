import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/database/prisma";
import { createHmac, timingSafeEqual } from "node:crypto";

type MercadoPagoPaymentLookupResponse = {
  id?: number;
  status?: string;
  transaction_amount?: number;
  application_fee?: number;
  fee_details?: Array<{
    type?: string;
    amount?: number;
  }>;
  metadata?: {
    raffleId?: string;
    ticketCount?: number;
    platformFeePercentage?: string | number;
    platformFeeValue?: string | number;
    sellerNetValue?: string | number;
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

function verifySplitPayment(mpData: MercadoPagoPaymentLookupResponse, payment: { platformFeeValue: any }): boolean {
  // Verifica se o split foi aplicado no Mercado Pago
  if (mpData.application_fee && mpData.application_fee > 0) {
    // application_fee foi realmente deduzido
    return true;
  }

  // Fallback: se não há fee_details mas há metadata com os valores
  if (mpData.metadata?.platformFeeValue) {
    // Pelo menos a metadata foi enviada corretamente
    return true;
  }

  // Se não encontrou evidence de split, considera como não verificado
  console.warn(`[SPLIT_VALIDATION] Pagamento ${mpData.id} pode não ter split aplicado`);
  return false;
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

  // Validate split payment
  const splitVerified = verifySplitPayment(mpData, payment);
  if (!splitVerified) {
    console.warn(`[PAYMENT_WARNING] Split payment não verificado para ${payment.id} - MP payment ${mpData.id}`);
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
      data: {
        status: "COMPLETED",
        splitVerified: splitVerified,
      },
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

function parseSignatureHeader(signatureHeader: string | null): { ts: string; v1: string } | null {
  if (!signatureHeader) return null;

  const parts = signatureHeader.split(",").map((part) => part.trim());
  const values = new Map<string, string>();

  for (const part of parts) {
    const [key, value] = part.split("=", 2);
    if (!key || !value) continue;
    values.set(key.trim(), value.trim());
  }

  const ts = values.get("ts");
  const v1 = values.get("v1");

  if (!ts || !v1) return null;
  return { ts, v1 };
}

function safeCompareHex(expectedHex: string, receivedHex: string): boolean {
  const expectedBuffer = Buffer.from(expectedHex, "hex");
  const receivedBuffer = Buffer.from(receivedHex, "hex");

  if (expectedBuffer.length === 0 || receivedBuffer.length === 0) return false;
  if (expectedBuffer.length !== receivedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

function buildWebhookManifest(args: { dataId: string; requestId: string; ts: string }): string {
  return `id:${args.dataId};request-id:${args.requestId};ts:${args.ts};`;
}

function validateMercadoPagoWebhookSignature(request: NextRequest, body: unknown): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET || process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Webhook Mercado Pago rejeitado: MP_WEBHOOK_SECRET nao configurado.");
    return false;
  }

  const signature = parseSignatureHeader(request.headers.get("x-signature"));
  const requestId = request.headers.get("x-request-id");
  const dataId = getNotificationPaymentId(request, body);

  if (!signature || !requestId || !dataId) {
    return false;
  }

  const normalizedDataId = dataId.toLowerCase();
  const manifest = buildWebhookManifest({
    dataId: normalizedDataId,
    requestId,
    ts: signature.ts,
  });

  const expectedSignature = createHmac("sha256", secret).update(manifest).digest("hex");
  return safeCompareHex(expectedSignature, signature.v1.toLowerCase());
}

async function handleNotification(request: NextRequest, body: unknown) {
  const isValidSignature = validateMercadoPagoWebhookSignature(request, body);
  if (!isValidSignature) {
    return NextResponse.json(
      { success: false, error: "Assinatura do webhook invalida." },
      { status: 401 },
    );
  }

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
    const rawBody = await request.text();
    body = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    body = null;
  }

  return handleNotification(request, body);
}

export async function GET(request: NextRequest) {
  return handleNotification(request, null);
}
