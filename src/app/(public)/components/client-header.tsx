"use client";

import Link from "next/link";
import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";

export function ClientHeader({ tenantName, tenantSlug, clientName }: {
  tenantName: string;
  tenantSlug: string;
  clientName?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-700/50 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href={`/${tenantSlug}`} className="flex flex-col">
                <p className="text-xs font-mono uppercase tracking-wider text-slate-400">{tenantName}</p>
                <h1 className="text-lg font-bold text-white">México Auto Garage</h1>
              </Link>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <nav className="flex gap-6">
                <Link
                  href={`/${tenantSlug}/profile`}
                  className="text-sm text-slate-300 transition-colors hover:text-cyan-400"
                >
                  Perfil
                </Link>
                <Link
                  href={`/${tenantSlug}`}
                  className="text-sm text-slate-300 transition-colors hover:text-cyan-400"
                >
                  Sorteios
                </Link>
              </nav>

              <div className="flex items-center gap-3 border-l border-slate-700/50 pl-4">
                <div className="flex flex-col items-end">
                  <p className="text-xs text-slate-400">Conectado como</p>
                  <p className="text-sm font-semibold text-white">{clientName || "Cliente"}</p>
                </div>
                <button
                  onClick={() => {
                    // TODO: Implement logout
                  }}
                  className="inline-flex items-center justify-center rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-red-400"
                  title="Sair"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-slate-300"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="border-t border-slate-700/50 bg-slate-900 md:hidden">
            <nav className="flex flex-col gap-3 px-4 py-4">
              <Link
                href={`/${tenantSlug}/profile`}
                className="text-sm text-slate-300 transition-colors hover:text-cyan-400"
                onClick={() => setMenuOpen(false)}
              >
                Perfil
              </Link>
              <Link
                href={`/${tenantSlug}`}
                className="text-sm text-slate-300 transition-colors hover:text-cyan-400"
                onClick={() => setMenuOpen(false)}
              >
                Sorteios
              </Link>
              <button
                onClick={() => {
                  // TODO: Implement logout
                  setMenuOpen(false);
                }}
                className="flex items-center gap-2 text-sm text-red-400 transition-colors hover:text-red-300"
              >
                <LogOut size={16} />
                Sair
              </button>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
