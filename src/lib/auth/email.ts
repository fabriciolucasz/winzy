import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import dns from "node:dns";
import net from "node:net";
import tls from "node:tls";

function getNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getBooleanEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (!raw) return fallback;

  const normalized = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

const SMTP_CONNECTION_TIMEOUT_MS = getNumberEnv("SMTP_CONNECTION_TIMEOUT_MS", 15000);
const SMTP_GREETING_TIMEOUT_MS = getNumberEnv("SMTP_GREETING_TIMEOUT_MS", 15000);
const SMTP_SOCKET_TIMEOUT_MS = getNumberEnv("SMTP_SOCKET_TIMEOUT_MS", 20000);

const smtpPort = getNumberEnv("SMTP_PORT", 465);
const smtpSecure = getBooleanEnv("SMTP_SECURE", smtpPort === 465);
const smtpForceIpv4 = getBooleanEnv("SMTP_FORCE_IPV4", true);
const smtpRejectUnauthorized = getBooleanEnv("SMTP_TLS_REJECT_UNAUTHORIZED", true);

let cachedTransporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null;

function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getFromAddress(): string {
  return process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@incherry.com.br";
}

function getTransporter(): nodemailer.Transporter<SMTPTransport.SentMessageInfo> {
  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: smtpSecure,
    connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    greetingTimeout: SMTP_GREETING_TIMEOUT_MS,
    socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      servername: process.env.SMTP_HOST,
      rejectUnauthorized: smtpRejectUnauthorized,
      minVersion: "TLSv1.2",
    },
    name: process.env.SMTP_HELO_NAME || process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") || "localhost",
    ...(smtpForceIpv4 ? { family: 4 as const } : {}),
  });

  return cachedTransporter;
}

function baseEmailLayout(content: string): string {
  return `
    <div style="font-family:Segoe UI,Roboto,Arial,sans-serif;background:#0b0b0f;padding:24px;color:#e4e4e7;">
      <div style="max-width:620px;margin:0 auto;border:1px solid rgba(148,163,184,.22);border-radius:16px;background:linear-gradient(145deg,rgba(15,15,19,.9),rgba(15,15,19,.72));overflow:hidden;">
        <div style="padding:16px 20px;border-bottom:1px solid rgba(148,163,184,.16);">
          <strong style="letter-spacing:.12em;font-size:12px;color:#93c5fd;">INCHERRY AWARDS</strong>
        </div>
        <div style="padding:22px 20px;line-height:1.55;font-size:15px;color:#e4e4e7;">
          ${content}
        </div>
      </div>
    </div>
  `;
}

export async function verifyEmailConnection(): Promise<{ ok: boolean; message: string }> {
  if (!isSmtpConfigured()) {
    return { ok: false, message: "SMTP nao configurado. Defina SMTP_HOST, SMTP_PORT, SMTP_USER e SMTP_PASS." };
  }

  try {
    await getTransporter().verify();
    return { ok: true, message: "Conexao SMTP validada com sucesso." };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "erro desconhecido";
    return { ok: false, message: `Falha ao validar SMTP: ${detail}` };
  }
}

export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  if (!isSmtpConfigured()) {
    console.warn("SMTP não configurado. Ignorando envio de e-mail de verificação.");
    return false;
  }

  try {
    await getTransporter().sendMail({
      from: getFromAddress(),
      to: email,
      subject: "Código de Verificação - InCherry Awards",
      html: baseEmailLayout(`
        <h2 style="margin:0 0 12px;font-size:22px;color:#ffffff;">Codigo de verificacao</h2>
        <p style="margin:0 0 14px;">Use o codigo abaixo para continuar sua autenticacao:</p>
        <div style="display:inline-block;padding:10px 14px;border-radius:10px;background:#111827;border:1px solid rgba(59,130,246,.35);font-size:20px;font-weight:700;letter-spacing:.08em;color:#bfdbfe;">
          ${code}
        </div>
      `),
    });
    return true;
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    return false;
  }
}

export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  if (!isSmtpConfigured()) {
    console.warn("SMTP não configurado. Ignorando envio de e-mail de boas-vindas.");
    return false;
  }

  try {
    await getTransporter().sendMail({
      from: getFromAddress(),
      to: email,
      subject: "Bem-vindo ao InCherry Awards!",
      html: baseEmailLayout(`
        <h2 style="margin:0 0 12px;font-size:22px;color:#ffffff;">Bem-vindo, ${name}!</h2>
        <p style="margin:0 0 10px;">Sua conta foi criada com sucesso.</p>
        <p style="margin:0;">Agora voce ja pode acessar seus recursos e acompanhar suas rifas.</p>
      `),
    });
    return true;
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    return false;
  }
}

export async function sendRaffleWinnerEmail(params: {
  email: string;
  clientName: string;
  raffleName: string;
  ticketNumber: number;
}): Promise<boolean> {
  if (!isSmtpConfigured()) {
    console.warn("SMTP nao configurado. Ignorando envio de e-mail ao ganhador da rifa.");
    return false;
  }

  const { email, clientName, raffleName, ticketNumber } = params;

  try {
    await getTransporter().sendMail({
      from: getFromAddress(),
      to: email,
      subject: `Voce ganhou a rifa ${raffleName}!`,
      html: baseEmailLayout(`
        <h2 style="margin:0 0 12px;font-size:22px;color:#ffffff;">Parabens, ${clientName}!</h2>
        <p style="margin:0 0 10px;">Voce foi sorteado na rifa <strong>${raffleName}</strong>.</p>
        <p style="margin:0 0 10px;">Bilhete vencedor: <strong>${ticketNumber}</strong>.</p>
        <p style="margin:0;">Nossa equipe entrara em contato com as proximas instrucoes.</p>
      `),
    });
    return true;
  } catch (error) {
    console.error("Erro ao enviar email do ganhador da rifa:", error);
    return false;
  }
}

type SmtpDiagnostics = {
  host: string;
  port: number;
  dnsRecords: Array<{ address: string; family: number }>;
  tcpReachable: boolean;
  tlsReachable: boolean;
  hint?: string;
};

function isCloudflareAddress(address: string): boolean {
  return (
    address.startsWith("104.16.") ||
    address.startsWith("104.17.") ||
    address.startsWith("104.18.") ||
    address.startsWith("104.19.") ||
    address.startsWith("104.20.") ||
    address.startsWith("104.21.") ||
    address.startsWith("104.22.") ||
    address.startsWith("104.23.") ||
    address.startsWith("104.24.") ||
    address.startsWith("104.25.") ||
    address.startsWith("104.26.") ||
    address.startsWith("104.27.") ||
    address.startsWith("172.64.") ||
    address.startsWith("172.65.") ||
    address.startsWith("172.66.") ||
    address.startsWith("172.67.") ||
    address.startsWith("188.114.") ||
    address.startsWith("190.93.") ||
    address.startsWith("197.234.") ||
    address.startsWith("198.41.") ||
    address.startsWith("2606:4700:")
  );
}

function testTcpConnectivity(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port, timeout: timeoutMs }, () => {
      socket.end();
      resolve(true);
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });

    socket.on("error", () => resolve(false));
  });
}

function testTlsConnectivity(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      {
        host,
        port,
        servername: host,
        rejectUnauthorized: false,
        timeout: timeoutMs,
      },
      () => {
        socket.end();
        resolve(true);
      }
    );

    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });

    socket.on("error", () => resolve(false));
  });
}

export async function diagnoseEmailConnection(): Promise<SmtpDiagnostics | null> {
  if (!process.env.SMTP_HOST) return null;

  const host = process.env.SMTP_HOST;
  const port = smtpPort;

  const dnsRecords = await new Promise<Array<{ address: string; family: number }>>((resolve) => {
    dns.lookup(host, { all: true }, (error, addresses) => {
      if (error || !addresses) {
        resolve([]);
        return;
      }
      resolve(addresses.map((item) => ({ address: item.address, family: item.family })));
    });
  });

  const tcpReachable = await testTcpConnectivity(host, port, 10_000);
  const tlsReachable = await testTlsConnectivity(host, port, 12_000);

  const hasCloudflareIp = dnsRecords.some((record) => isCloudflareAddress(record.address));

  let hint: string | undefined;
  if (hasCloudflareIp) {
    hint = "SMTP host resolvendo para Cloudflare. Para email funcionar, o subdominio de mail deve estar em DNS only (sem proxy laranja).";
  } else if (!tcpReachable) {
    hint = "Porta SMTP bloqueada ou indisponivel (465). Verifique firewall, provedor e rota de saida.";
  } else if (!tlsReachable) {
    hint = "TCP responde, mas TLS falha. Verifique certificado/SNI e parametro SMTP_TLS_REJECT_UNAUTHORIZED.";
  }

  return {
    host,
    port,
    dnsRecords,
    tcpReachable,
    tlsReachable,
    hint,
  };
}