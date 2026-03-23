import { notFound, redirect } from "next/navigation";
import { getClientAuthUser } from "@/lib/auth/mddleware";
import { prisma } from "@/lib/database/prisma";
import { ClientLoginView } from "./login-client";

type Params = Promise<{ slug: string }>;

export default async function ClientLoginPage(props: { params: Params }) {
  const { slug } = await props.params;
  const auth = await getClientAuthUser();

  if (auth) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: auth.tenantId },
      select: { slug: true },
    });

    if (tenant?.slug === slug) {
      redirect(`/${slug}/profile`);
    }
  }

  const tenant = await prisma.tenant.findUnique({
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

  if (!tenant || !tenant.subscription || tenant.subscription.status !== "ACTIVE") {
    notFound();
  }

  return (
    <ClientLoginView
      slug={slug}
      tenant={{
        name: tenant.name,
        logoUrl: tenant.logo ?? null,
      }}
    />
  );
}
