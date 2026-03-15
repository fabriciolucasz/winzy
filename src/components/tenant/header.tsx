"use client";

import { motion } from "motion/react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { MoreVertical, Ticket, UserIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useApp } from "@/contexts";

export function Header() {
  const { tenant, user } = useApp();
  const isAuthenticated = Boolean(user?.email);
  const userName = user?.name?.trim() || "Guest";

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
            src={`${tenant?.logoUrl || '/incherry_logo.svg'}`}
            alt={tenant?.name ? `${tenant.name} Logo` : "InCherry Logo"}
            width={32}
            height={32}
          />
        </motion.a>

        <div className="flex items-center gap-2">
          <motion.a
            href="/"
            whileHover={{ scale: 1.1 }}
            style={{ display: "inline-block" }}
            className="text-sm text-gray-300 hover:text-white"
          >
            <Ticket size={16} />
          </motion.a>

          <button className="flex items-center justify-center text-stone-400">
            <MoreVertical size={12} />
          </button>

          <div className="relative">
            <button aria-label="Minha conta">
              <Avatar>
                {isAuthenticated ? (
                  <>
                    <AvatarImage
                      src={"https://api.dicebear.com/6.x/initials/svg?seed=" + encodeURIComponent(userName)}
                      alt={userName}
                    />
                    <AvatarFallback>{userName.charAt(0).toUpperCase()}</AvatarFallback>
                  </>
                ) : (
                  <AvatarFallback>
                    <UserIcon size={16} />
                  </AvatarFallback>
                )}
              </Avatar>
            </button>
          </div>
        </div>
      </div>
    </motion.header >

  );
} 