"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";

interface TenantLogoHeaderProps {
  href: string;
  logoUrl?: string | null;
  tenantName?: string;
  compact?: boolean;
}

export function TenantLogoHeader({ href, logoUrl, tenantName, compact = false }: TenantLogoHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`${compact ? "mb-0" : "mb-6"} flex items-center gap-3`}
    >
      <Link
        href={href}
        className="inline-flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-slate-800/50"
      >
        <ArrowLeft className="h-4 w-4 text-slate-400" />
      </Link>

      {logoUrl ? (
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800/50 p-1"
        >
          <Image
            src={logoUrl}
            alt={tenantName || "Logo"}
            width={40}
            height={40}
            className="h-full w-full object-contain"
          />
        </motion.div>
      ) : (
        <div className="h-10 w-10 rounded-lg bg-slate-800/50" />
      )}

      {tenantName && (
        <span className="text-sm font-medium text-slate-300">{tenantName}</span>
      )}
    </motion.div>
  );
}
