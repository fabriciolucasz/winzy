"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

type TenantOption = {
  slug: string;
  name: string;
};

type TenantSwitcherProps = {
  activeTenantName: string;
  tenants: TenantOption[];
};

export function TenantSwitcher({ activeTenantName, tenants }: TenantSwitcherProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [switchingSlug, setSwitchingSlug] = useState<string | null>(null);

  const hasTenants = tenants.length > 0;
  const sortedTenants = useMemo(
    () => [...tenants].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [tenants],
  );

  useEffect(() => {
    if (!isOpen) return;

    function isWithinRectWithPadding(x: number, y: number, rect: DOMRect, padding: number) {
      return (
        x >= rect.left - padding &&
        x <= rect.right + padding &&
        y >= rect.top - padding &&
        y <= rect.bottom + padding
      );
    }

    function handlePointerMove(event: MouseEvent) {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;

      const triggerRect = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const x = event.clientX;
      const y = event.clientY;
      const padding = 16;

      const insideTrigger = isWithinRectWithPadding(x, y, triggerRect, padding);
      const insideMenu = isWithinRectWithPadding(x, y, menuRect, padding);

      if (!insideTrigger && !insideMenu) {
        setIsOpen(false);
      }
    }

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current && !rootRef.current.contains(target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousemove", handlePointerMove);
    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousemove", handlePointerMove);
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative z-[90]">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex max-w-[58vw] items-center gap-2 truncate rounded-lg border border-white/15 bg-slate-900/55 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-900/75 md:max-w-[38vw]"
      >
        <span className="truncate">{activeTenantName}</span>
        {switchingSlug ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="absolute left-0 z-[100] mt-2 w-80 overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-[0_18px_45px_-22px_rgba(2,6,23,0.7)]"
        >
          {!hasTenants ? (
            <div className="px-4 py-3 text-sm text-slate-300">Nenhuma organizacao disponivel.</div>
          ) : (
            <div className="max-h-80 overflow-y-auto p-1">
              {sortedTenants.map((tenant) => (
                <button
                  key={tenant.slug}
                  type="button"
                  onClick={() => {
                    setSwitchingSlug(tenant.slug);
                    setIsOpen(false);
                    router.replace(`/dashboard/select/${tenant.slug}?next=/dashboard`);
                    router.refresh();
                  }}
                  disabled={Boolean(switchingSlug)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-60"
                >
                  <span>{tenant.name}</span>
                  {switchingSlug === tenant.slug ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}