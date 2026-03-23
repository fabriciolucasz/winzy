import { notFound, redirect } from "next/navigation";
import { getClientAuthUser } from "@/lib/auth/mddleware";
import { prisma } from "@/lib/database/prisma";
import { ClientProfileView } from "./profile-client";

type Params = Promise<{ slug: string }>;

export default async function ClientProfilePage(props: { params: Params }) {
  const { slug } = await props.params;
  const auth = await getClientAuthUser();

  if (!auth) {
    redirect(`/${slug}/login`);
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: auth.tenantId },
    select: { slug: true },
  });

  if (tenant?.slug !== slug) {
    redirect(`/${slug}/login`);
  }

  const tenantDetails = await prisma.tenant.findUnique({
    where: { slug },
    select: {
      name: true,
      logo: true,
      subscription: {
        select: {
          status: true,
        },
      },
    },
  });

  if (!tenantDetails || !tenantDetails.subscription || tenantDetails.subscription.status !== "ACTIVE") {
    notFound();
  }

  return (
    <ClientProfileView
      slug={slug}
      tenant={{
        name: tenantDetails.name,
        logoUrl: tenantDetails.logo ?? null,
      }}
    />
  );
}
