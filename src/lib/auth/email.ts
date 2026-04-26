import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import dns from "node:dns";
import net from "node:net";
import tls from "node:tls";
import { verificationEmailTemplate, welcomeEmailTemplate, raffleWinnerEmailTemplate } from "./templates";

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
    const { subject, html } = verificationEmailTemplate(code);
    await getTransporter().sendMail({
      from: getFromAddress(),
      to: email,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error("Erro ao enviar email de verificação:", error);
    return false;
  }
}

export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  if (!isSmtpConfigured()) {
    console.warn("SMTP não configurado. Ignorando envio de e-mail de boas-vindas.");
    return false;
  }

  try {
    const { subject, html } = welcomeEmailTemplate(name);
    await getTransporter().sendMail({
      from: getFromAddress(),
      to: email,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error("Erro ao enviar email de boas-vindas:", error);
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
    const { subject, html } = raffleWinnerEmailTemplate({ clientName, raffleName, ticketNumber });
    await getTransporter().sendMail({
      from: getFromAddress(),
      to: email,
      subject,
      html,
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