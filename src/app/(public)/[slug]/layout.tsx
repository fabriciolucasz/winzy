import type { Metadata } from "next";
import prisma from "@/lib/database/prisma";

const DEFAULT_TENANT_DESCRIPTION = "Participe desta campanha e concorra a prêmios fantásticos. Garanta seus números e acompanhe os resultados com total segurança e transparência na Winzy.";

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: {
      name: true,
      metaTitle: true,
      metaDescription: true,
      favicon: true,
    },
  });

  const resolvedMetaTitle = tenant?.metaTitle?.trim() || tenant?.name || "Winzy";
  const resolvedDescription = tenant?.metaDescription?.trim() || DEFAULT_TENANT_DESCRIPTION;
  const resolvedFavicon = tenant?.favicon?.trim() || "/winzy_logo.png";

  return {
    title: `Winzy | ${resolvedMetaTitle}`,
    description: resolvedDescription,
    icons: {
      icon: resolvedFavicon,
      shortcut: resolvedFavicon,
      apple: resolvedFavicon,
    },
  };
}

export default function TenantPublicLayout({ children }: { children: React.ReactNode }) {
  return children;
}
