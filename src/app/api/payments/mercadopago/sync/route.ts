import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const externalId = String(body?.externalId || "").trim();

    if (!externalId) {
      return NextResponse.json({ success: false, error: "externalId e obrigatorio." }, { status: 400 });
    }

    // Encaminha para o webhook interno para reutilizar a mesma lógica de processamento.
    const url = new URL(`/api/payments/mercadopago/webhook?id=${encodeURIComponent(externalId)}`, request.url);
    const webhookResponse = await fetch(url, { method: "GET" });
    const data = await webhookResponse.json();

    if (!webhookResponse.ok) {
      return NextResponse.json({ success: false, error: data?.error || "Falha ao sincronizar pagamento." }, { status: 500 });
    }

    return NextResponse.json({ success: true, result: data?.result || null });
  } catch (error) {
    console.error("Erro ao sincronizar pagamento manualmente:", error);
    return NextResponse.json({ success: false, error: "Erro interno do servidor." }, { status: 500 });
  }
}
