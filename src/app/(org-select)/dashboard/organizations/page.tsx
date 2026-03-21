import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/mddleware";
import { getActiveTenantCookieName } from "@/lib/auth/jwt";
import prisma from "@/lib/database/prisma";
import { ChooseOrganizationsClient } from "./choose-organizations-client";

export default async function DashboardOrganizationsPage() {
  const authUser = await getAuthUser();

  if (!authUser) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const activeTenantSlug = cookieStore.get(getActiveTenantCookieName())?.value;

  const tenants = await prisma.tenant.findMany({
    where: {
      OR: [
        { ownerId: authUser.userId },
        {
          members: {
            some: {
              userId: authUser.userId,
              revokedAt: null,
            },
          },
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      members: {
        where: { revokedAt: null },
        select: { id: true },
      },
      planName: true,
    },
  });

  const tenantRows = tenants.map((tenant) => ({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    membersCount: tenant.members.length + 1,
    plan: tenant.planName || "Free",
    isActive: tenant.slug === activeTenantSlug,
  }));

  return <ChooseOrganizationsClient tenants={tenantRows} />;
}
