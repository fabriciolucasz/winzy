import { notFound, redirect } from "next/navigation";
import { getClientAuthUser } from "@/lib/auth/mddleware";
import { prisma } from "@/lib/database/prisma";
import { ClientLoginView } from "./login-client";

function sanitizeReturnTo(returnTo: string | undefined, slug: string): string {
  if (!returnTo) return `/${slug}`;
  // Só aceita caminhos relativos que começam com /${slug} — nunca URLs externas
  const decoded = decodeURIComponent(returnTo);
  if (decoded.startsWith(`/${slug}`) && !decoded.startsWith("//") && !decoded.includes(":")) {
    return decoded;
  }
  return `/${slug}`;
}

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ returnTo?: string }>;

export default async function ClientLoginPage(props: { params: Params; searchParams: SearchParams }) {
  const { slug } = await props.params;
  const { returnTo: rawReturnTo } = await props.searchParams;
  const returnTo = sanitizeReturnTo(rawReturnTo, slug);
  const auth = await getClientAuthUser();

  if (auth) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: auth.tenantId },
      select: { slug: true },
    });

    if (tenant?.slug === slug) {
      redirect(returnTo);
    }
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: {
      name: true,
      logo: true,
      favicon: true,
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
      returnTo={returnTo}
      tenant={{
        name: tenant.name,
        logoUrl: tenant.logo ?? null,
        faviconUrl: tenant.favicon ?? null,
      }}
    />
  );
}
