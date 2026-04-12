"use client";

import { useMemo, type PointerEvent } from "react";
import Image from "next/image";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  Code2,
  Compass,
  Cpu,
  Gem,
  Layers,
  Rocket,
  Shield,
  Sparkles,
  Wrench,
} from "lucide-react";

type IconComponent = typeof Sparkles;

const services = [
  {
    title: "Landing Pages",
    description: "Páginas de alta performance projetadas para maximizar conversão e estabelecer autoridade imediata.",
    icon: Rocket,
  },
  {
    title: "Sites Institucionais",
    description: "Estruturas digitais modernas que comunicam a visão da sua empresa com clareza e elegância.",
    icon: Gem,
  },
  {
    title: "Páginas de Conversão",
    description: "Funis de vendas e páginas de destino focadas em métricas, preparadas para campanhas de tráfego pago.",
    icon: Compass,
  },
  {
    title: "Suporte & Evolução",
    description: "Acompanhamento contínuo e otimizações técnicas para garantir que seu ativo digital nunca fique obsoleto.",
    icon: Wrench,
  },
];

const floatingOrbs = [
  { size: 260, top: "8%", left: "6%", delay: 0, duration: 12, opacity: 0.22 },
  { size: 180, top: "26%", right: "8%", delay: 1.5, duration: 10, opacity: 0.2 },
  { size: 320, bottom: "-7%", left: "38%", delay: 0.8, duration: 15, opacity: 0.16 },
  { size: 140, bottom: "18%", right: "18%", delay: 0.2, duration: 9, opacity: 0.18 },
];

const processSteps = [
  {
    number: "01",
    title: "Estratégia",
    description: "Análise de mercado, definição de objetivos e arquitetura de conversão."
  },
  {
    number: "02",
    title: "Design",
    description: "Interface sofisticada focada em experiência do usuário e autoridade de marca."
  },
  {
    number: "03",
    title: "Desenvolvimento",
    description: "Código limpo, otimizado para SEO e com carregamento instantâneo."
  },
  {
    number: "04",
    title: "Entrega",
    description: "Lançamento assistido, monitoramento de métricas e suporte contínuo."
  },
];

const highlights = [
  { title: "Performance Obsessiva", icon: Cpu },
  { title: "Foco em Conversão", icon: Rocket },
  { title: "Arquitetura Escalável", icon: Layers },
  { title: "Experiência Premium", icon: Shield },
];

const revealVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: "easeOut" as const,
    },
  },
};

export default function Home() {
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const cardRotateX = useTransform(pointerY, [0, 1], [7, -7]);
  const cardRotateY = useTransform(pointerX, [0, 1], [-10, 10]);
  const springX = useSpring(pointerX, { stiffness: 120, damping: 22 });
  const springY = useSpring(pointerY, { stiffness: 120, damping: 22 });
  const orbX = useTransform(springX, [0, 1], [-20, 20]);
  const orbY = useTransform(springY, [0, 1], [-16, 16]);

  const radialGlow = useMotionTemplate`radial-gradient(720px circle at ${useTransform(
    springX,
    [0, 1],
    ["10%", "90%"]
  )} ${useTransform(springY, [0, 1], ["8%", "92%"])}, rgba(37,99,235,0.24), transparent 44%), radial-gradient(520px circle at ${useTransform(
    springY,
    [0, 1],
    ["88%", "16%"]
  )} ${useTransform(springX, [0, 1], ["12%", "82%"])}, rgba(124,58,237,0.2), transparent 48%)`;

  const { scrollYProgress } = useScroll();
  const headerBlur = useTransform(scrollYProgress, [0, 0.15], [10, 20]);
  const headerBackground = useTransform(scrollYProgress, [0, 0.2], [0.58, 0.84]);
  const headerBackdrop = useMotionTemplate`blur(${headerBlur}px)`;
  const headerBgColor = useMotionTemplate`rgba(15, 15, 19, ${headerBackground})`;

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - rect.left) / rect.width);
    pointerY.set((event.clientY - rect.top) / rect.height);
  };

  const processWithIcons = useMemo(
    () =>
      processSteps.map((step) => ({
        ...step,
        icon: step.number === "01" ? Sparkles : step.number === "02" ? Cpu : step.number === "03" ? Code2 : ArrowRight,
      })),
    []
  );

  return (
    <div
      className="relative min-h-screen overflow-x-clip bg-[#0B0B0F] text-slate-100"
      onPointerMove={handlePointerMove}
    >
      <div className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_700px_at_15%_-10%,rgba(37,99,235,0.24),transparent_48%),radial-gradient(900px_560px_at_85%_0%,rgba(124,58,237,0.24),transparent_45%),linear-gradient(180deg,#09090D_0%,#0B0B0F_54%,#0F0F13_100%)]" />
        <motion.div
          className="absolute inset-0"
          style={{ backgroundImage: radialGlow }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-[size:46px_46px]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,11,15,0.1),rgba(11,11,15,0.88))]" />

        {!reduceMotion &&
          floatingOrbs.map((orb, index) => (
            <motion.div
              key={index}
              className="absolute rounded-full bg-gradient-to-br from-[#2563EB]/45 to-[#7C3AED]/35 blur-2xl"
              style={{
                width: orb.size,
                height: orb.size,
                top: orb.top,
                left: orb.left,
                right: orb.right,
                bottom: orb.bottom,
                opacity: orb.opacity,
                x: orbX,
                y: orbY,
              }}
              animate={{ y: [-8, 10, -8], x: [-6, 8, -6] }}
              transition={{ duration: orb.duration, repeat: Infinity, repeatType: "mirror", delay: orb.delay }}
            />
          ))}
      </div>

      <motion.header
        className="sticky top-0 z-40 border-b border-white/10"
        style={{
          backdropFilter: headerBackdrop,
          backgroundColor: headerBgColor,
        }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:px-10">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5"
          >
            <Image src="/winzy_logo.png" alt="Winzy" width={24} height={24} className="rounded-sm object-contain" />
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-100">WINZY</span>
          </motion.div>

          <nav className="hidden items-center gap-7 text-sm text-slate-300 md:flex">
            <a href="#servicos" className="transition hover:text-white">Serviços</a>
            <a href="#processo" className="transition hover:text-white">Processo</a>
            <a href="#contato" className="transition hover:text-white">Contato</a>
          </nav>

          <a
            href="#contato"
            className="liquid-glass inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-100"
          >
            Iniciar projeto
            <ArrowRight className="size-3.5" />
          </a>
        </div>
      </motion.header>

      <main className="relative mx-auto max-w-7xl px-6 md:px-10">
        <section className="relative flex min-h-[84vh] flex-col items-center justify-center py-16 md:py-24">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="w-full max-w-5xl"
          >
            <div className="mb-8 flex justify-center">
              <div className="liquid-glass inline-flex items-center gap-2 rounded-full px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-[#2563EB] animate-pulse" />
                <span className="text-xs uppercase tracking-[0.22em] text-slate-300">
                  Disponível para novos projetos
                </span>
              </div>
            </div>

            <h1 className="text-center text-5xl font-medium leading-tight md:text-7xl">
              <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Engenharia e estratégia
              </span>
              <br />
              <span className="bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-[#7C3AED] bg-clip-text text-transparent">
                para sua presença digital
              </span>
            </h1>

            <p className="mx-auto mb-12 mt-6 max-w-2xl text-center text-base text-slate-400 md:text-lg">
              Não apenas criamos páginas, mas construímos ativos digitais estratégicos preparados para escala.
              Cada projeto une engenharia de software e design orientado a dados.
            </p>

            <motion.div
              className="liquid-glass-strong mb-12 overflow-hidden rounded-3xl"
              whileHover={reduceMotion ? undefined : { y: -4 }}
              style={{
                rotateX: reduceMotion ? 0 : cardRotateX,
                rotateY: reduceMotion ? 0 : cardRotateY,
                transformPerspective: 1200,
              }}
              transition={{ type: "spring", stiffness: 220, damping: 22 }}
            >
              <div className="flex items-center gap-2 border-b border-white/10 px-6 py-4">
                <Code2 className="h-4 w-4 text-[#2563EB]" />
                <span className="text-xs font-mono text-slate-400">winzy-core.ts</span>
              </div>
              <pre className="overflow-x-auto p-6">
                <code className="font-mono text-sm">
                  {`import { Scalability } from '@winzy/core';

export const Product = () => {
  return new Future({
    performance: '100%',
    design: 'Premium',
    scale: Infinity
  });
};`}
                </code>
              </pre>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {highlights.map((item, index) => {
                const Icon = item.icon as IconComponent;
                return (
                  <motion.div
                    key={item.title}
                    className="liquid-glass rounded-xl p-4 text-center"
                    whileHover={reduceMotion ? undefined : { y: -4, scale: 1.02 }}
                    initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                    whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.36, delay: index * 0.06 }}
                  >
                    <div className="mb-2 inline-flex rounded-lg border border-white/15 bg-[#0F0F13]/70 p-2">
                      <Icon className="h-4 w-4 text-[#7C3AED]" />
                    </div>
                    <p className="text-xs font-medium text-slate-300">{item.title}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </section>

        <section id="servicos" className="border-t border-white/10 py-20">
          <div className="max-w-6xl mx-auto">
            <motion.div
              className="mb-16"
              variants={revealVariants}
              initial={reduceMotion ? false : "hidden"}
              whileInView={reduceMotion ? undefined : "visible"}
              viewport={{ once: true, margin: "-80px" }}
            >
              <p className="mb-4 text-xs uppercase tracking-[0.22em] text-[#2563EB]">Serviços</p>
              <h2 className="mb-6 text-4xl font-medium md:text-5xl">
                <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  Construímos soluções digitais
                </span>
                <br />
                <span className="text-slate-400">orientadas a conversão e autoridade</span>
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {services.map((service, index) => {
                const Icon = service.icon as IconComponent;
                return (
                  <motion.article
                    key={service.title}
                    className="liquid-glass group rounded-2xl p-8"
                    whileHover={reduceMotion ? undefined : { y: -6 }}
                    initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.98 }}
                    whileInView={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.4, delay: index * 0.08 }}
                  >
                    <div className="mb-4 inline-flex rounded-2xl border border-white/15 bg-[#0F0F13]/70 p-3">
                      <Icon className="h-5 w-5 text-[#2563EB]" />
                    </div>
                    <h3 className="text-xl font-medium mb-3 text-white">{service.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{service.description}</p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 py-20">
          <motion.div
            className="max-w-5xl mx-auto"
            variants={revealVariants}
            initial={reduceMotion ? false : "hidden"}
            whileInView={reduceMotion ? undefined : "visible"}
            viewport={{ once: true, margin: "-80px" }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <p className="mb-4 text-xs uppercase tracking-[0.22em] text-[#7C3AED]">Diferencial</p>
                <h2 className="text-4xl font-medium mb-6 text-white leading-tight">
                  Infraestrutura digital preparada para o crescimento
                </h2>
                <p className="text-slate-400 leading-relaxed mb-6">
                  Não apenas criamos páginas, mas construímos ativos digitais estratégicos preparados para escala.
                  Nossa abordagem une engenharia de software e design orientado a dados.
                </p>
                <p className="text-sm text-slate-500">
                  Cada projeto é desenvolvido com foco absoluto em métricas de negócio, garantindo que sua
                  presença digital seja uma ferramenta ativa de aquisição de clientes.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  "Performance Obsessiva",
                  "Foco em Conversão",
                  "Arquitetura Escalável",
                  "Experiência Profissional",
                ].map((item, index) => (
                  <motion.div
                    key={item}
                    className="liquid-glass flex items-center gap-3 rounded-xl p-4"
                    whileHover={reduceMotion ? undefined : { x: 4 }}
                    initial={reduceMotion ? false : { opacity: 0, x: -10 }}
                    whileInView={reduceMotion ? undefined : { opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.35, delay: index * 0.06 }}
                  >
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-[#2563EB]" />
                    <span className="text-sm font-medium text-slate-300">{item}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        <section id="processo" className="border-t border-white/10 py-20">
          <div className="max-w-6xl mx-auto">
            <motion.div
              className="mb-16"
              variants={revealVariants}
              initial={reduceMotion ? false : "hidden"}
              whileInView={reduceMotion ? undefined : "visible"}
              viewport={{ once: true, margin: "-80px" }}
            >
              <p className="mb-4 text-xs uppercase tracking-[0.22em] text-[#2563EB]">Processo</p>
              <h2 className="text-4xl md:text-5xl font-medium text-white">
                Metodologia ágil focada em qualidade e prazos precisos
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {processWithIcons.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.number} className="relative">
                    <motion.div
                      className="liquid-glass h-full rounded-2xl p-8"
                      whileHover={reduceMotion ? undefined : { y: -5 }}
                      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.36, delay: index * 0.05 }}
                    >
                      <div className="mb-4 inline-flex rounded-lg border border-white/15 bg-[#0F0F13]/70 p-2">
                        <Icon className="h-4 w-4 text-[#7C3AED]" />
                      </div>
                      <div className="mb-4 text-xs font-mono uppercase tracking-widest text-[#2563EB]">
                        {step.number}
                      </div>
                      <h3 className="mb-3 text-lg font-medium text-white">{step.title}</h3>
                      <p className="text-sm leading-relaxed text-slate-400">{step.description}</p>
                    </motion.div>
                    {index < processSteps.length - 1 && (
                      <div className="absolute right-0 top-1/2 hidden h-0.5 w-6 -translate-y-1/2 translate-x-6 bg-gradient-to-r from-[#2563EB]/50 to-transparent lg:block" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="contato" className="border-t border-white/10 py-20">
          <div className="max-w-4xl mx-auto">
            <motion.div
              className="liquid-glass-strong rounded-3xl p-12 text-center md:p-16"
              whileHover={reduceMotion ? undefined : { scale: 1.01 }}
              variants={revealVariants}
              initial={reduceMotion ? false : "hidden"}
              whileInView={reduceMotion ? undefined : "visible"}
              viewport={{ once: true, margin: "-80px" }}
            >
              <h2 className="text-3xl md:text-4xl font-medium text-white mb-6">
                Pronto para elevar o nível da sua presença digital?
              </h2>
              <p className="text-slate-400 mb-8 max-w-2xl mx-auto">
                Vamos transformar sua visão em um ativo estratégico de alta performance.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="#"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] px-8 py-3 font-medium text-white shadow-[0_10px_35px_rgba(37,99,235,0.45)] transition hover:brightness-110"
                >
                  Iniciar projeto com a Winzy
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href="#"
                  className="liquid-glass inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3 font-medium text-slate-200 transition hover:text-white"
                >
                  Solicitar consultoria grátis
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        <footer className="mt-20 border-t border-white/10 py-12">
          <div className="max-w-6xl mx-auto">
            <motion.div
              className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12 pb-12 border-b border-white/10"
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45 }}
            >
              <div>
                <h3 className="font-medium text-white mb-4">Soluções</h3>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li><a href="#" className="hover:text-emerald-400 transition">Landing Pages</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition">Sites Institucionais</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition">Páginas de Conversão</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition">Suporte & Evolução</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-white mb-4">Sobre a Winzy</h3>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li><a href="#" className="hover:text-emerald-400 transition">Contato</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition">Quem somos</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition">Onde encontrar</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition">Trabalhe conosco</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-white mb-4">Legal</h3>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li><a href="#" className="hover:text-emerald-400 transition">Privacidade</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition">Termos</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition">Cookies</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-white mb-4">Redes Sociais</h3>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li><a href="#" className="hover:text-emerald-400 transition">Instagram</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition">LinkedIn</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition">Twitter/X</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition">WhatsApp</a></li>
                </ul>
              </div>
            </motion.div>
            <div className="flex flex-col md:flex-row items-center justify-between text-sm text-slate-500">
              <p>© 2026 Winzy. Todos os direitos reservados.</p>
              <p>Desenvolvido com engenharia de software e design estratégico.</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
