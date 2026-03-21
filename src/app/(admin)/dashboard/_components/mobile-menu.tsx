"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden inline-flex items-center justify-center p-2 text-slate-200 hover:bg-white/10 rounded-lg transition-colors"
        aria-label="Menu"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[35] bg-black/50 lg:hidden" onClick={() => setIsOpen(false)} />
      )}

      <aside
        className={`fixed left-0 top-[76px] z-40 h-[calc(100vh-76px)] w-64 border-r border-white/10 bg-slate-950/95 backdrop-blur p-5 transition-transform duration-300 lg:hidden ${isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <nav className="space-y-1">
          <Link
            href="/dashboard"
            onClick={() => setIsOpen(false)}
            className="flex items-center rounded-xl px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-white/10"
          >
            Home
          </Link>
          <Link
            href="/dashboard/raffles"
            onClick={() => setIsOpen(false)}
            className="flex items-center rounded-xl px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-white/10"
          >
            Rifas
          </Link>
          <Link
            href="/dashboard/subscription"
            onClick={() => setIsOpen(false)}
            className="flex items-center rounded-xl px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-white/10"
          >
            Assinatura
          </Link>
          <Link
            href="/dashboard/settings"
            onClick={() => setIsOpen(false)}
            className="flex items-center rounded-xl px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-white/10"
          >
            Configuracoes
          </Link>
        </nav>
      </aside>
    </>
  );
}
