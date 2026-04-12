"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { formatCPFInput, formatPhoneInput, onlyDigits } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type LoginApiResponse = {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
  };
  tenants?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  error?: string;
};

export function Login({ mode = "login" }: { mode?: "login" | "register" }) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const submitLabel = useMemo(() => {
    if (isSubmitting) return isRegister ? "Registrando..." : "Entrando...";
    return isRegister ? "Registrar" : "Entrar";
  }, [isRegister, isSubmitting]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !password) {
      setError("Preencha e-mail e senha.");
      return;
    }

    if (isRegister && (!name || !phone || !cpf)) {
      setError("Preencha todos os campos obrigatórios para cadastro.");
      return;
    }

    if (isRegister && password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = isRegister
        ? { email, password, name, phone: onlyDigits(phone), cpf: onlyDigits(cpf) }
        : { email, password };

      const response = await fetch(`/api/auth/${isRegister ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as LoginApiResponse;

      if (!response.ok || !data.success) {
        setError(data.error || "Não foi possível autenticar. Tente novamente.");
        return;
      }

      setSuccess(isRegister ? "Conta criada com sucesso!" : "Login realizado com sucesso!");

      if (!isRegister) {
        setIsRedirecting(true);
      }

      router.replace(isRegister ? "/login" : "/dashboard/organizations");
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center">
      {isRedirecting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070d18]/75 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900 px-5 py-4 text-sm text-slate-200 shadow-xl">
            <Loader2 className="h-4 w-4 animate-spin" />
            Entrando no painel...
          </div>
        </div>
      ) : null}

      <Logo className="absolute top-4 left-4 md:top-6 md:left-6" />
      <div className="w-full max-w-md rounded-[1.25rem] bg-slate-800/40 p-6 shadow-lg mx-4 sm:mx-0 sm:p-8">
        <h2 className="mb-6 text-center text-lg sm:text-xl font-mono uppercase font-bold text-zinc-200 border-b border-slate-500/5 pb-2">
          {isRegister ? "Crie uma nova conta" : "Faça login na sua conta"}
        </h2>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <label className="block mb-2 text-sm font-mono font-medium text-gray-300">Nome completo</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="p-2 block w-full rounded-2xl border border-white/5 bg-slate-800/40 text-sm text-gray-300 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Seu nome"
                autoComplete="name"
              />

              <label className="block mb-2 text-sm font-mono font-medium text-gray-300">Telefone</label>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(formatPhoneInput(event.target.value))}
                className="p-2 block w-full rounded-2xl border border-white/5 bg-slate-800/40 text-sm text-gray-300 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="(00) 00000-0000"
                autoComplete="tel"
                maxLength={15}
              />

              <label className="block mb-2 text-sm font-mono font-medium text-gray-300">CPF</label>
              <input
                type="text"
                value={cpf}
                onChange={(event) => setCpf(formatCPFInput(event.target.value))}
                className="p-2 block w-full rounded-2xl border border-white/5 bg-slate-800/40 text-sm text-gray-300 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="000.000.000-00"
                autoComplete="off"
                maxLength={14}
              />
            </>
          )}

          <label className="block mb-2 text-sm font-mono font-medium text-gray-300">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="p-2 block w-full rounded-2xl border border-white/5 bg-slate-800/40 text-sm text-gray-300 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="seu.email@exemplo.com"
            autoComplete="email"
          />

          <label className="block mb-2 text-sm font-mono font-medium text-gray-300">Senha</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="p-2 block w-full rounded-2xl border border-white/5 bg-slate-800/40 text-sm text-gray-300 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="sua.senha@exemplo.com"
            autoComplete={isRegister ? "new-password" : "current-password"}
          />

          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && <p className="text-sm text-emerald-400">{success}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 w-full rounded-2xl bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitLabel}
          </button>

          <Link href={`/${isRegister ? "login" : "register"}`} className="text-sm text-blue-500 hover:underline">
            {isRegister ? "Já tem uma conta? Faça login" : "Não tem uma conta? Registre-se"}
          </Link>
        </form>
      </div>
    </div>
  )
}