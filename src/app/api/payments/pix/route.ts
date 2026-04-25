import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/database/prisma";
import { getClientAuthUser } from "@/lib/auth/mddleware";

type PaymentPayload = {
  raffleId?: string;
  ticketCount?: number;
  totalValue?: number;
  forceNewPayment?: boolean;
  customer?: {
    name?: string;
    email?: string;
    cpf?: string;
    phone?: string;
  };
};

type MercadoPagoPaymentResponse = {
  id?: number;
  status?: string;
  metadata?: {
    raffleId?: string;
    clientId?: string;
    ticketCount?: number;
  };
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
    };
  };
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const tokens = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = tokens[0] || "Cliente";
  const lastName = tokens.slice(1).join(" ") || "InCherry";
  return { firstName, lastName };
}

function asCurrencyDecimal(value: number): string {
  return value.toFixed(2);
}

function isFinitePositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function getBaseUrl(request: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");

  const host = request.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

function isOpenMercadoPagoStatus(status: string | undefined): boolean {
  if (!status) return true;
  return status === "pending" || status === "in_process" || status === "authorized";
}

function mapMercadoPagoStatusToInternal(status: string | undefined): "PENDING" | "COMPLETED" | "FAILED" | "CANCELED" {
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

async function validateNoDuplicatePayment(args: {
  clientId: string;
  ticketCount: number;
  totalValue: number;
}): Promise<{ isDuplicate: boolean; reason?: string }> {
  // Verificar se existe um pagamento pendente EXATO (mesmo valor)
  const pendingExact = await prisma.payment.findFirst({
    where: {
      clientId: args.clientId,
      status: "PENDING",
      amount: args.ticketCount,
      totalValue: args.totalValue.toString(),
    },
  });

  if (pendingExact) {
    return {
      isDuplicate: true,
      reason: "Ja existe um pagamento pendente identico para este cliente",
    };
  }

  // Verificar se há múltiplos pagamentos pendentes com mesmo cliente (proteção contra abuso)
  const pendingCount = await prisma.payment.count({
    where: {
      clientId: args.clientId,
      status: "PENDING",
      createdAt: {
        gte: new Date(Date.now() - 30 * 60 * 1000), // Ultimos 30 minutos
      },
    },
  });

  if (pendingCount >= 5) {
    return {
      isDuplicate: true,
      reason: "Muitos pagamentos pendentes. Aguarde a confirmacao dos anteriores.",
    };
  }

  return { isDuplicate: false };
}

async function getReusablePendingPayment(args: {
  tenantId: string;
  clientId: string;
  raffleId: string;
  ticketCount: number;
  mpAccessToken: string;
}) {
  const pendingPayments = await prisma.payment.findMany({
    where: {
      tenantId: args.tenantId,
      clientId: args.clientId,
      method: "PIX",
      status: "PENDING",
      amount: args.ticketCount,
      externalId: {
        not: null,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id: true,
      externalId: true,
      totalValue: true,
      createdAt: true,
    },
  });

  for (const pendingPayment of pendingPayments) {
    if (!pendingPayment.externalId) continue;

    const mpLookup = await fetch(`https://api.mercadopago.com/v1/payments/${pendingPayment.externalId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${args.mpAccessToken}`,
        Accept: "application/json",
      },
    });

    if (!mpLookup.ok) {
      continue;
    }

    const mpData = (await mpLookup.json()) as MercadoPagoPaymentResponse;
    const internalStatus = mapMercadoPagoStatusToInternal(mpData.status);

    if (internalStatus !== "PENDING") {
      await prisma.payment.update({
        where: { id: pendingPayment.id },
        data: { status: internalStatus },
      });
      continue;
    }

    const raffleIdFromMetadata = String(mpData.metadata?.raffleId || "").trim();
    const isSameRaffle = raffleIdFromMetadata === args.raffleId;
    const isStillOpen = isOpenMercadoPagoStatus(mpData.status);

    if (!isSameRaffle || !isStillOpen) {
      continue;
    }

    return {
      id: pendingPayment.id,
      externalId: pendingPayment.externalId,
      totalValue: Number(pendingPayment.totalValue),
      qrCode: mpData.point_of_interaction?.transaction_data?.qr_code ?? "",
      qrCodeBase64: mpData.point_of_interaction?.transaction_data?.qr_code_base64 ?? "",
      status: mpData.status ?? "pending",
      createdAt: pendingPayment.createdAt.toISOString(),
    };
  }

  return null;
}

async function createMercadoPagoPixPayment(args: {
  accessToken: string;
  amount: number;
  payer: {
    email: string;
    firstName: string;
    lastName: string;
    cpf: string;
  };
  description: string;
  externalReference: string;
  metadata: Record<string, string | number | boolean | null>;
  applicationFee: number;
  notificationUrl?: string;
}) {
  const baseBody = {
    transaction_amount: Number(args.amount.toFixed(2)),
    description: args.description,
    payment_method_id: "pix",
    payer: {
      email: args.payer.email,
      first_name: args.payer.firstName,
      last_name: args.payer.lastName,
      identification: {
        type: "CPF",
        number: args.payer.cpf,
      },
    },
    external_reference: args.externalReference,
    metadata: args.metadata,
    notification_url: args.notificationUrl,
  };

  const withFee = {
    ...baseBody,
    application_fee: Number(args.applicationFee.toFixed(2)),
  };

  const requestConfig = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.accessToken}`,
      "X-Idempotency-Key": crypto.randomUUID(),
    },
  };

  let response = await fetch("https://api.mercadopago.com/v1/payments", {
    ...requestConfig,
    body: JSON.stringify(withFee),
  });

  if (!response.ok) {
    // Fallback para contas que não suportam application_fee na criação via API.
    response = await fetch("https://api.mercadopago.com/v1/payments", {
      ...requestConfig,
      body: JSON.stringify(baseBody),
    });
  }

  return response;
}

export async function POST(request: NextRequest) {
  try {
    const authClient = await getClientAuthUser();
    if (!authClient || !authClient.tenantId || !authClient.userId) {
      return NextResponse.json({ success: false, error: "Nao autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as PaymentPayload;
    const raffleId = String(body.raffleId || "").trim();
    const ticketCount = Number(body.ticketCount || 0);
    const totalValueFromClient = Number(body.totalValue || 0);
    const forceNewPayment = Boolean(body.forceNewPayment);

    if (!raffleId) {
      return NextResponse.json({ success: false, error: "Rifa invalida." }, { status: 400 });
    }

    if (!Number.isInteger(ticketCount) || ticketCount <= 0) {
      return NextResponse.json({ success: false, error: "Quantidade de bilhetes invalida." }, { status: 400 });
    }

    const raffle = await prisma.raffle.findUnique({
      where: { id: raffleId },
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
      },
    });

    if (!raffle || raffle.status !== "ACTIVE") {
      return NextResponse.json({ success: false, error: "Rifa indisponivel para compra." }, { status: 404 });
    }

    const maxAllowedPerRequest = Math.min(2000, raffle.maxTickets);
    if (ticketCount < raffle.minTickets || ticketCount > maxAllowedPerRequest) {
      return NextResponse.json(
        {
          success: false,
          error: `A compra deve ter entre ${raffle.minTickets} e ${maxAllowedPerRequest} bilhetes.`,
        },
        { status: 400 },
      );
    }

    const expectedTotal = Number((Number(raffle.priceTicket) * ticketCount).toFixed(2));
    if (!isFinitePositiveNumber(expectedTotal)) {
      return NextResponse.json({ success: false, error: "Valor da compra invalido." }, { status: 400 });
    }

    // Proteção contra payload adulterado de valor (ex: milhares de bilhetes por centavos).
    if (isFinitePositiveNumber(totalValueFromClient) && Math.abs(totalValueFromClient - expectedTotal) > 0.01) {
      return NextResponse.json(
        {
          success: false,
          error: "Payload de valor invalido. O total da compra foi recalculado pela plataforma.",
        },
        { status: 400 },
      );
    }

    const mpConnection = raffle.tenant.connections[0];
    if (!mpConnection) {
      return NextResponse.json(
        { success: false, error: "A organizacao nao possui Mercado Pago conectado." },
        { status: 403 },
      );
    }

    if (raffle.tenantId !== authClient.tenantId) {
      return NextResponse.json({ success: false, error: "Sessao invalida para esta organizacao." }, { status: 403 });
    }

    const client = await prisma.client.findFirst({
      where: {
        id: authClient.userId,
        tenantId: authClient.tenantId,
      },
    });

    if (!client) {
      return NextResponse.json({ success: false, error: "Cliente nao encontrado." }, { status: 404 });
    }

    const customerEmail = client.email;
    const customerName = client.name;
    const customerCpf = client.cpf;

    const feePercentage = Math.min(Math.max(Number(process.env.PLATFORM_FEE_PERCENTAGE || 0), 0), 100);
    const platformFeeValue = Number(((expectedTotal * feePercentage) / 100).toFixed(2));
    const sellerNetValue = Number((expectedTotal - platformFeeValue).toFixed(2));

    // Validar segurança: verificar pagamentos duplicados
    const duplicateCheck = await validateNoDuplicatePayment({
      clientId: client.id,
      ticketCount,
      totalValue: expectedTotal,
    });

    if (duplicateCheck.isDuplicate) {
      return NextResponse.json(
        {
          success: false,
          code: "DUPLICATE_PAYMENT",
          error: duplicateCheck.reason || "Pagamento duplicado detectado",
        },
        { status: 409 },
      );
    }

    if (!forceNewPayment) {
      const pendingPayment = await getReusablePendingPayment({
        tenantId: raffle.tenantId,
        clientId: client.id,
        raffleId: raffle.id,
        ticketCount,
        mpAccessToken: mpConnection.accessToken,
      });

      if (pendingPayment) {
        return NextResponse.json(
          {
            success: false,
            code: "PENDING_PAYMENT_EXISTS",
            message: "Ja existe um pagamento pendente com esta mesma quantidade de bilhetes.",
            payment: pendingPayment,
          },
          { status: 409 },
        );
      }
    }

    const nameParts = splitName(customerName);
    const externalReference = `${raffle.tenantId}:${raffle.id}:${client.id}:${Date.now()}`;

    const mpResponse = await createMercadoPagoPixPayment({
      accessToken: mpConnection.accessToken,
      amount: expectedTotal,
      payer: {
        email: customerEmail,
        firstName: nameParts.firstName,
        lastName: nameParts.lastName,
        cpf: customerCpf,
      },
      description: `${raffle.name} - ${ticketCount} bilhete(s)`,
      externalReference,
      applicationFee: platformFeeValue,
      metadata: {
        tenantId: raffle.tenantId,
        raffleId: raffle.id,
        clientId: client.id,
        ticketCount,
        platformFeePercentage: feePercentage,
        platformFeeValue,
        sellerNetValue,
      },
      notificationUrl:
        process.env.MP_WEBHOOK_URL || `${getBaseUrl(request)}/api/payments/mercadopago/webhook`,
    });

    if (!mpResponse.ok) {
      const mpError = await mpResponse.text();
      return NextResponse.json(
        { success: false, error: "Falha ao criar cobranca PIX no Mercado Pago.", details: mpError },
        { status: 502 },
      );
    }

    const mpData = (await mpResponse.json()) as MercadoPagoPaymentResponse;

    const payment = await prisma.payment.create({
      data: {
        tenantId: raffle.tenantId,
        clientId: client.id,
        externalId: mpData.id ? String(mpData.id) : null,
        amount: ticketCount,
        totalValue: asCurrencyDecimal(expectedTotal),
        method: "PIX",
        status: "PENDING",
        platformFeePercentage: feePercentage,
        platformFeeValue: platformFeeValue,
        sellerNetValue: sellerNetValue,
        splitVerified: false,
      },
      select: {
        id: true,
        externalId: true,
        totalValue: true,
      },
    });

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        externalId: payment.externalId,
        totalValue: Number(payment.totalValue),
        qrCode: mpData.point_of_interaction?.transaction_data?.qr_code ?? "",
        qrCodeBase64: mpData.point_of_interaction?.transaction_data?.qr_code_base64 ?? "",
        status: mpData.status ?? "pending",
      },
      split: {
        platformFeePercentage: feePercentage,
        platformFeeValue,
        sellerNetValue,
      },
    });
  } catch (error) {
    console.error("Erro ao criar pagamento PIX:", error);
    return NextResponse.json({ success: false, error: "Erro interno do servidor." }, { status: 500 });
  }
}
