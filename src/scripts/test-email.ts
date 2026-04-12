import "dotenv/config";
import {
  diagnoseEmailConnection,
  sendRaffleWinnerEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
  verifyEmailConnection,
} from "../lib/auth/email";

type TestMode = "verify" | "welcome" | "winner" | "all";

type CliArgs = {
  to: string;
  mode: TestMode;
  name: string;
  code: string;
  raffle: string;
  ticket: number;
};

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

function buildArgs(): CliArgs {
  const mode = (parseArg("mode") || "all") as TestMode;

  if (!["verify", "welcome", "winner", "all"].includes(mode)) {
    throw new Error("Modo invalido. Use --mode=verify|welcome|winner|all");
  }

  const to = parseArg("to") || process.env.SMTP_TEST_TO || "";
  if (!to) {
    throw new Error("Informe o destinatario com --to=email@dominio.com ou SMTP_TEST_TO no .env");
  }

  const ticketRaw = parseArg("ticket") || "1001";
  const ticket = Number(ticketRaw);
  if (!Number.isFinite(ticket) || ticket <= 0) {
    throw new Error("Ticket invalido. Use --ticket=1001");
  }

  return {
    to,
    mode,
    name: parseArg("name") || "Cliente Teste",
    code: parseArg("code") || "123456",
    raffle: parseArg("raffle") || "Rifa de Teste",
    ticket,
  };
}

function mask(value: string | undefined): string {
  if (!value) return "(nao definido)";
  if (value.length <= 4) return "****";
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

async function run(): Promise<void> {
  const args = buildArgs();

  console.log("\n[EMAIL TEST] Iniciando validacao SMTP...");
  console.log(`[EMAIL TEST] Host: ${process.env.SMTP_HOST || "(nao definido)"}`);
  console.log(`[EMAIL TEST] Porta: ${process.env.SMTP_PORT || "(nao definido)"}`);
  console.log(`[EMAIL TEST] Secure: ${process.env.SMTP_SECURE || "auto"}`);
  console.log(`[EMAIL TEST] Usuario: ${mask(process.env.SMTP_USER)}`);
  console.log(`[EMAIL TEST] Senha: ${mask(process.env.SMTP_PASS)}`);
  console.log(`[EMAIL TEST] De: ${process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@incherry.com.br"}`);

  const diagnostics = await diagnoseEmailConnection();
  if (diagnostics) {
    console.log("[EMAIL TEST] Diagnostico de conectividade:");
    console.log(`- Host: ${diagnostics.host}`);
    console.log(`- Porta: ${diagnostics.port}`);
    console.log(`- DNS: ${diagnostics.dnsRecords.map((r) => `${r.address}(v${r.family})`).join(", ") || "sem resposta"}`);
    console.log(`- TCP: ${diagnostics.tcpReachable ? "OK" : "FALHOU"}`);
    console.log(`- TLS: ${diagnostics.tlsReachable ? "OK" : "FALHOU"}`);
    if (diagnostics.hint) {
      console.log(`- Dica: ${diagnostics.hint}`);
    }
  }

  const verification = await verifyEmailConnection();
  if (!verification.ok) {
    console.error(`\n[EMAIL TEST] ERRO: ${verification.message}`);
    process.exit(1);
  }

  console.log(`[EMAIL TEST] OK: ${verification.message}`);
  console.log(`[EMAIL TEST] Destinatario: ${args.to}`);
  console.log(`[EMAIL TEST] Modo: ${args.mode}`);

  const results: Array<{ label: string; ok: boolean }> = [];

  if (args.mode === "verify" || args.mode === "all") {
    const ok = await sendVerificationEmail(args.to, args.code);
    results.push({ label: "sendVerificationEmail", ok });
  }

  if (args.mode === "welcome" || args.mode === "all") {
    const ok = await sendWelcomeEmail(args.to, args.name);
    results.push({ label: "sendWelcomeEmail", ok });
  }

  if (args.mode === "winner" || args.mode === "all") {
    const ok = await sendRaffleWinnerEmail({
      email: args.to,
      clientName: args.name,
      raffleName: args.raffle,
      ticketNumber: args.ticket,
    });
    results.push({ label: "sendRaffleWinnerEmail", ok });
  }

  console.log("\n[EMAIL TEST] Resultado:");
  for (const result of results) {
    console.log(`- ${result.label}: ${result.ok ? "OK" : "FALHOU"}`);
  }

  const hasFailure = results.some((item) => !item.ok);
  if (hasFailure) {
    process.exit(1);
  }

  console.log("\n[EMAIL TEST] Todos os envios solicitados foram concluidos com sucesso.");
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n[EMAIL TEST] Erro inesperado: ${message}`);
  process.exit(1);
});
