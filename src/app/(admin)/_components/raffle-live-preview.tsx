"use client";

import { formatCurrency } from "@/lib/utils";

type RaffleLivePreviewProps = {
  tenantName: string;
  tenantSlug: string;
  title: string;
  description: string;
  bannerUrl: string;
  priceTicket: number;
  pixValue: number;
  minTickets: number;
};

function formatDescription(raw: string): string {
  if (!raw.trim()) {
    return "Descreva os detalhes da rifa, regras de participacao, data do sorteio e observacoes importantes para os compradores.";
  }

  return raw.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
}

export function RaffleLivePreview({
  tenantName,
  tenantSlug,
  title,
  description,
  bannerUrl,
  priceTicket,
  pixValue,
  minTickets,
}: RaffleLivePreviewProps) {
  const previewTitle = title.trim() || "Sua nova rifa";
  const previewDescription = formatDescription(description);
  const totalPreview = Math.max(minTickets, 1) * Math.max(priceTicket, 0);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/45 p-4 shadow-lg backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Preview ao vivo</p>
          <p className="mt-1 text-sm font-semibold text-zinc-100">Pagina publica da rifa</p>
        </div>
        <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
          ACTIVE
        </span>
      </div>

      <div className="rounded-xl border border-slate-500/10 bg-[#0b1220] p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-zinc-100">{tenantName || "Organizacao"}</p>
            <p className="text-xs text-slate-400">/{tenantSlug || "slug-da-organizacao"}</p>
          </div>
          <span className="text-xs text-slate-400">Home publica</span>
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10">
          <div
            className="h-40 bg-slate-800/60 bg-cover bg-center"
            style={bannerUrl.trim() ? { backgroundImage: `url(${bannerUrl.trim()})` } : undefined}
          >
            {!bannerUrl.trim() && (
              <div className="flex h-full items-center justify-center text-xs uppercase tracking-wide text-slate-500">
                Banner da rifa
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-white/10 bg-slate-900/55 p-3">
            <p className="text-base font-semibold uppercase text-zinc-100">{previewTitle}</p>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-300">{previewDescription}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-white/10 bg-slate-900/55 p-3">
              <p className="text-[11px] uppercase text-slate-500">Valor do ticket</p>
              <p className="mt-1 text-sm font-semibold text-zinc-100">{formatCurrency(Math.max(priceTicket, 0))}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-900/55 p-3">
              <p className="text-[11px] uppercase text-slate-500">Opcao PIX</p>
              <p className="mt-1 text-sm font-semibold text-zinc-100">{formatCurrency(Math.max(pixValue, 0))}</p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/55 p-3">
            <p className="text-[11px] uppercase text-slate-500">Simulacao de checkout minimo</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-slate-300">{Math.max(minTickets, 1)} ticket(s)</p>
              <p className="text-base font-bold text-emerald-300">{formatCurrency(totalPreview)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
