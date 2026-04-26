"use client";

import { motion } from "motion/react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { ChevronDown, LogOut, MoreVertical, UserIcon } from "lucide-react";
import Image from "next/image";
import { useApp } from "@/contexts";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearSession } from "@/lib/session";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { tenant, user, setUser } = useApp();
  const isAuthenticated = Boolean(user?.email);
  const userName = user?.name?.trim() || "Guest";
  const profileHref = tenant?.slug ? `/${tenant.slug}/profile` : "/";
  const loginHref = tenant?.slug
    ? `/${tenant.slug}/login?returnTo=${encodeURIComponent(pathname)}`
    : "/";
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRootRef = useRef<HTMLDivElement | null>(null);
  const userMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const userMenuPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isUserMenuOpen) return;

    function isWithinRectWithPadding(x: number, y: number, rect: DOMRect, padding: number) {
      return (
        x >= rect.left - padding &&
        x <= rect.right + padding &&
        y >= rect.top - padding &&
        y <= rect.bottom + padding
      );
    }

    function handlePointerMove(event: MouseEvent) {
      const trigger = userMenuTriggerRef.current;
      const menu = userMenuPanelRef.current;
      if (!trigger || !menu) return;

      const triggerRect = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const x = event.clientX;
      const y = event.clientY;
      const padding = 16;

      const insideTrigger = isWithinRectWithPadding(x, y, triggerRect, padding);
      const insideMenu = isWithinRectWithPadding(x, y, menuRect, padding);

      if (!insideTrigger && !insideMenu) {
        setIsUserMenuOpen(false);
      }
    }

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (userMenuRootRef.current && !userMenuRootRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("mousemove", handlePointerMove);
    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousemove", handlePointerMove);
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isUserMenuOpen]);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsUserMenuOpen(false);
    }
  }, [isAuthenticated]);

  async function handleClientLogout() {
    try {
      await fetch("/api/public/client/logout", { method: "POST" });
    } finally {
      clearSession();
      setUser(null);
      setIsUserMenuOpen(false);
      if (tenant?.slug) {
        router.replace(`/${tenant.slug}`);
      } else {
        router.replace("/");
      }
      router.refresh();
    }
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }
      }
      animate={{ opacity: 1, y: 0 }}

      className="top-0 z-40 p-4"
    >
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between rounded-full border border-slate-500/5 bg-slate-800/40 px-4 py-3 shadow-lg backdrop-blur-xl">
        <motion.a
          href="/"
          whileHover={{ scale: 1.1 }}
          style={{ display: "inline-block" }}
        >
          <Image
            src={`${tenant?.logoUrl || tenant?.faviconUrl || "/winzy_logo.png"}`}
            alt={tenant?.name ? `${tenant.name} Logo` : "Winzy Logo"}
            width={32}
            height={32}
          />
        </motion.a>

        <div className="flex items-center gap-2">
          {/* <motion.a
            href="/"
            whileHover={{ scale: 1.1 }}
            style={{ display: "inline-block" }}
            className="text-sm text-gray-300 hover:text-white"
          >
            <Ticket size={16} />
          </motion.a> */}

          <button className="flex items-center justify-center text-stone-400">
            <MoreVertical size={12} />
          </button>

          <div ref={userMenuRootRef} className="relative">
            {isAuthenticated ? (
              <>
                <button
                  ref={userMenuTriggerRef}
                  type="button"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-slate-900/55 px-1.5 py-1 pr-2 transition-colors hover:bg-slate-900/75"
                  aria-label="Abrir menu da conta"
                  aria-expanded={isUserMenuOpen}
                >
                  <Avatar>
                    <AvatarImage
                      src={"https://api.dicebear.com/6.x/initials/svg?seed=" + encodeURIComponent(userName)}
                      alt={userName}
                    />
                    <AvatarFallback>{userName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-300 transition-transform ${isUserMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {isUserMenuOpen && (
                  <div
                    ref={userMenuPanelRef}
                    className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-[0_18px_45px_-22px_rgba(2,6,23,0.7)]"
                  >
                    <div className="p-1">
                      <Link
                        href={profileHref}
                        onClick={() => setIsUserMenuOpen(false)}
                        className="block cursor-pointer rounded-lg px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-white/10"
                      >
                        Ver perfil
                      </Link>
                      <button
                        type="button"
                        onClick={handleClientLogout}
                        className="inline-flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-300 transition-colors hover:bg-red-500/15"
                      >
                        <LogOut size={14} />
                        Sair
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Link aria-label="Minha conta" href={loginHref}>
                <Avatar>
                  <AvatarFallback>
                    <UserIcon size={16} />
                  </AvatarFallback>
                </Avatar>
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.header >

  );
} 