import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Winzy | Prêmios e Sorteios",
  description: "Participe de sorteios e rifas incríveis na Winzy. Uma plataforma rápida, segura e transparente para você concorrer a grandes prêmios.",
  icons: {
    icon: "/winzy_logo.png",
    shortcut: "/winzy_logo.png",
    apple: "/winzy_logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`flex flex-col min-h-screen ${geistSans.variable} ${geistMono.variable}`}>
        <main className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
