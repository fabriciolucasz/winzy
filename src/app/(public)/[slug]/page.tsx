import { Footer } from "@/components/tenant/footer";
import { Header } from "@/components/tenant/header";
import { NoRaffle } from "@/components/tenant/no-raffle";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/database/prisma";
import { notFound } from "next/navigation";
import { AppContextProvider } from "@/contexts";
import { Raffle } from "@/components/tenant/raffle";

interface TenantProps {
  params: Promise<{ slug: string }>
}

function isPrismaTimeoutError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P1008";
}

async function findTenantBySlugWithRetry(slug: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await prisma.tenant.findUnique({
        where: { slug },
        include: {
          owner: {
            select: {
              name: true,
              profile: {
                select: {
                  avatar: true,
                },
              },
            }
          },
          raffles: {
            where: {
              status: "ACTIVE",
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          }
        },
      });
    } catch (error) {
      if (isPrismaTimeoutError(error) && attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }
      throw error;
    }
  }

  return null;
}

export default async function Tenant({ params }: TenantProps) {
  const { slug } = await params;

  const tenant = await findTenantBySlugWithRetry(slug);

  if (!tenant) {
    notFound();
  }

  const activeRaffle = tenant.raffles[0] ?? null;
  const tenantData = {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    logoUrl: tenant.logo,
    instagramUrl: tenant.instagram,
    telegramUrl: tenant.telegram,
    supportUrl: tenant.supportUrl,
    isActive: true,
    owner: {
      name: tenant.owner.name,
      avatarUrl: tenant.owner.profile?.avatar || null,
    }
  };

  const raffleData = activeRaffle ? {
    id: activeRaffle.id,
    title: activeRaffle.name,
    slug: activeRaffle.slug,
    description: activeRaffle.description,
    bannerUrl: activeRaffle.banner,
    price: Number(activeRaffle.priceTicket),
    minNumbers: activeRaffle.minTickets,
    totalNumbers: activeRaffle.maxTickets,
    status: (activeRaffle.status === "CANCELED" ? "CANCELLED" : activeRaffle.status) as "DRAFT" | "ACTIVE" | "FINISHED" | "CANCELLED",
    drawDate: activeRaffle.drawDate,
    nextTicketNumber: 1,
    mysteryBoxEnabled: false,
    mysteryBoxConfig: null,
    winnerId: null,
    pixText: activeRaffle.pixValue.toString(),
    collaboratorPrizesEnabled: activeRaffle.collaboratorPrizesEnabled,
    collaboratorPrizeFirst: activeRaffle.collaboratorPrizeFirst !== null ? Number(activeRaffle.collaboratorPrizeFirst) : null,
    collaboratorPrizeSecond: activeRaffle.collaboratorPrizeSecond !== null ? Number(activeRaffle.collaboratorPrizeSecond) : null,
    collaboratorPrizeThird: activeRaffle.collaboratorPrizeThird !== null ? Number(activeRaffle.collaboratorPrizeThird) : null,
    mysteryPrizes: []
  } : null;

  return (
    <AppContextProvider tenant={tenantData} raffle={raffleData || undefined}>
      <div className="flex min-h-screen flex-col">
        <Header />

        <main className={activeRaffle ? "flex-1" : "flex flex-1 items-start justify-center px-4 pt-4 md:items-center md:pt-0"}>
          {activeRaffle ? <Raffle /> : <NoRaffle />}
        </main>

        <Footer />
      </div>
    </AppContextProvider>
  );
}