"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type UserMenuProps = {
  name: string;
  email: string;
};

function initials(name: string) {
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "U";
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return `${tokens[0][0]}${tokens[tokens.length - 1][0]}`.toUpperCase();
}

export function UserMenu({ name, email }: UserMenuProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const avatarInitials = useMemo(() => initials(name), [name]);

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

  async function handleLogout() {
    setIsSubmitting(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setIsSubmitting(false);
      setIsOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative z-[90]">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-3 rounded-lg border border-white/15 bg-slate-900/55 px-3 py-2 transition-colors hover:bg-slate-900/75"
      >
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-zinc-100">{name}</p>
          <p className="text-xs text-slate-400">{email}</p>
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-cyan-600 text-xs font-semibold text-white">
          {avatarInitials}
        </span>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 z-[100] mt-2 w-60 overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-[0_18px_45px_-22px_rgba(2,6,23,0.7)]"
        >
          <div className="border-b border-white/10 px-4 py-3">
            <p className="text-sm font-medium text-zinc-100">{name}</p>
            <p className="truncate text-xs text-slate-400">{email}</p>
          </div>

          <div className="p-1">
            <Link
              href="/dashboard/profile"
              onClick={() => setIsOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-white/10"
            >
              Editar perfil
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isSubmitting}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-60"
            >
              {isSubmitting ? "Saindo..." : "Deslogar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}