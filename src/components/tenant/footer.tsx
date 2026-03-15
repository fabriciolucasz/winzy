"use client";

import { InstagramLogoIcon } from "@radix-ui/react-icons";
import { motion } from "motion/react";
import Image from "next/image";

export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full flex items-center justify-between p-16 text-sm border-t border-slate-500/5"
    >
      <div className="flex items-center gap-2">
        <motion.a
          href="https://www.winzy.com.br/"
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.1 }}
          style={{ display: "inline-block" }}
        >
          <Image
            src="/winzy_logo.png"
            alt="Winzy Logo"
            width={48}
            height={48}
          />
        </motion.a>
        <span className="text-zinc-300">
          Copyright © 2026 - <a href="https://www.winzy.com.br" className="font-bold text-zinc-200" target="_blank" rel="noopener noreferrer">
            Winzy
          </a>
          . Todos os direitos reservados.
        </span>
      </div>

      <motion.a
        href="https://www.instagram.com/gowinzy/"
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ scale: 1.1 }}
        style={{ display: "inline-block" }}
      >
        <InstagramLogoIcon width={24} height={24} className="text-zinc-300 hover:text-zinc-200" />
      </motion.a>
    </motion.footer>
  );
}