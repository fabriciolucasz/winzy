import prisma from "@/lib/database/prisma";
import { NextResponse } from "next/server";

// mystery-box/[raffleId] # API de consumo de dados de um sorteio específico
export async function GET(request: Request, { params }: { params: Promise<{ raffleId: string }> }) {
  try {
    const { raffleId } = await params;

    const raffle = await prisma.raffle.findUnique({
      where: { id: raffleId },
      select: {
        id: true,
        mysteryPrizes: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            description: true,
            value: true,
            chance: true,
            remaining: true,
            totalAmount: true,
          },
        },
      },
    });

    if (!raffle) {
      return NextResponse.json({ error: "Raffle not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      raffle: {
        id: raffle.id,
        mysteryBoxEnabled: raffle.mysteryPrizes.length > 0,
      },
      prizes: raffle.mysteryPrizes.map((prize) => ({
        id: prize.id,
        title: prize.name,
        description:
          prize.description ||
          `Premio instantaneo de ${Number(prize.value).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}`,
        chance: Number(prize.chance),
        remaining: prize.remaining,
        totalAmount: prize.totalAmount,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}