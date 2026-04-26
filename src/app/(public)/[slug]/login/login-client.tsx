"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { TenantLogoHeader } from "@/components/tenant/tenant-logo-header";
import { LoginProcessingDialog } from "@/components/tenant/login-processing-dialog";
import { formatCPFInput, formatPhoneInput, onlyDigits } from "@/lib/utils";

type AuthResponse = {
  success: boolean;
  client?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    cpf: string;
    nickname?: string | null;
    avatar?: string | null;
  };
  error?: string;
};

type ClientLoginViewProps = {
  slug: string;
  returnTo?: string;
  tenant?: {
    name?: string;
    logoUrl?: string | null;
    faviconUrl?: string | null;
  };
};

export function ClientLoginView({ slug, returnTo, tenant }: ClientLoginViewProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProcessingDialog, setShowProcessingDialog] = useState(false);
  const [processingTimer, setProcessingTimer] = useState<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (processingTimer) clearTimeout(processingTimer);
    };
  }, [processingTimer]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim() || !cpf.trim()) {
      setError("E-mail e CPF sao obrigatorios.");
      return;
    }

    if (mode === "register" && (!name.trim() || !phone.trim())) {
      setError("Nome e telefone sao obrigatorios no cadastro.");
      return;
    }

    setIsSubmitting(true);
    setShowProcessingDialog(true);

    const timer = setTimeout(async () => {
      try {
        const endpoint = mode === "register" ? "/api/public/client/register" : "/api/public/client/login";
        const payload =
          mode === "register"
            ? { slug, name, email, phone: onlyDigits(phone), cpf: onlyDigits(cpf) }
            : { slug, email, cpf: onlyDigits(cpf) };

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = (await response.json()) as AuthResponse;
        if (!response.ok || !data.success || !data.client) {
          setError(data.error || "Nao foi possivel autenticar.");
          setShowProcessingDialog(false);
          return;
        }

        setSuccess(mode === "register" ? "Cadastro realizado! Redirecionando..." : "Login realizado! Redirecionando...");
        router.replace(returnTo || `/${slug}`);
        router.refresh();
      } catch {
        setError("Erro de conexao. Tente novamente.");
        setShowProcessingDialog(false);
      } finally {
        setIsSubmitting(false);
      }
    }, 1000);

    setProcessingTimer(timer);
  }

  return (
    <>
      <LoginProcessingDialog isOpen={showProcessingDialog} />
      <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center px-4 py-10">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full rounded-2xl border border-slate-500/5 bg-slate-800/40 p-6 shadow-lg backdrop-blur-xl md:p-8"
        >
          <TenantLogoHeader
            href={`/${slug}`}
            logoUrl={tenant?.logoUrl}
            faviconUrl={tenant?.faviconUrl}
            tenantName={tenant?.name}
          />

          <div className="mb-5 border-b border-white/10 pb-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Acesso do participante</p>
            <h1 className="mt-2 text-2xl font-bold uppercase text-zinc-100">
              {mode === "register" ? "Crie sua conta gratuita" : "Acesse seus bilhetes"}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {mode === "register"
                ? "Cadastro gratuito. Participe agora e concorra a prêmios."
                : "Entre e acompanhe todas as suas rifas em um só lugar."}
            </p>
          </div>

          <div className="mb-4 inline-flex rounded-xl border border-slate-500/10 bg-slate-900/55 p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-lg px-3 py-1.5 text-sm ${mode === "login" ? "bg-emerald-500 text-[#0B1120]" : "text-slate-300"}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`rounded-lg px-3 py-1.5 text-sm ${mode === "register" ? "bg-emerald-500 text-[#0B1120]" : "text-slate-300"}`}
            >
              Cadastro
            </button>
          </div>

          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="grid gap-3"
            onSubmit={handleSubmit}
          >
            {mode === "register" && (
              <>
                <motion.input
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nome completo"
                  className="rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2 text-sm text-zinc-100"
                />
                <motion.input
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  value={phone}
                  onChange={(event) => setPhone(formatPhoneInput(event.target.value))}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  className="rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2 text-sm text-zinc-100"
                />
              </>
            )}

            <motion.input
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: mode === "register" ? 0.35 : 0.25 }}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="E-mail"
              className="rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2 text-sm text-zinc-100"
            />
            <motion.input
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: mode === "register" ? 0.4 : 0.3 }}
              value={cpf}
              onChange={(event) => setCpf(formatCPFInput(event.target.value))}
              placeholder="000.000.000-00"
              maxLength={14}
              className="rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2 text-sm text-zinc-100"
            />

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-red-400"
              >
                {error}
              </motion.p>
            )}
            {success && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-emerald-400"
              >
                {success}
              </motion.p>
            )}

            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: mode === "register" ? 0.45 : 0.35 }}
              type="submit"
              disabled={isSubmitting}
              className="mt-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-[#0B1120] transition-colors hover:bg-emerald-400 disabled:opacity-70"
            >
              {isSubmitting
                ? "Aguarde..."
                : mode === "register"
                  ? "Criar conta e participar"
                  : "Entrar e ver meus bilhetes"}
            </motion.button>
          </motion.form>
        </motion.section>
      </main>
    </>
  );
}
