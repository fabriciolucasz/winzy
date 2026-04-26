import { baseEmailLayout } from "./base-layout";

/**
 * Template: Ganhador da rifa.
 * Objetivo: celebração emocional + instrução clara do próximo passo.
 */
export function raffleWinnerEmailTemplate(params: {
  clientName: string;
  raffleName: string;
  ticketNumber: number;
}): { subject: string; html: string; previewText: string } {
  const { clientName, raffleName, ticketNumber } = params;
  const firstName = clientName.split(" ")[0];
  const ticketFormatted = `#${String(ticketNumber).padStart(5, "0")}`;
  const previewText = `🏆 ${firstName}, você ganhou! Bilhete ${ticketFormatted} — ${raffleName}`;

  const html = baseEmailLayout(
    `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr>
        <td align="center">
          <div style="font-size:64px;line-height:1;margin-bottom:16px;">🏆</div>
          <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#111827;letter-spacing:-0.5px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
            Você é o ganhador!
          </h1>
          <p style="margin:0;font-size:16px;color:#475569;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
            Parabéns, <strong>${firstName}</strong>. Seu bilhete foi sorteado.
          </p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr>
        <td style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.12em;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
            Rifa vencedora
          </p>
          <p style="margin:0 0 20px;font-size:18px;font-weight:900;color:#111827;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
            ${raffleName}
          </p>
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.12em;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
            Número do bilhete
          </p>
          <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:36px;font-weight:900;color:#065f46;letter-spacing:0.12em;">
            ${ticketFormatted}
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
      Nossa equipe entrará em contato em breve com as instruções para retirada do prêmio. Fique atento ao seu e-mail e WhatsApp.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <a href="https://www.winzy.com.br" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 40px;border-radius:10px;letter-spacing:0.02em;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
            Ver minha conta →
          </a>
        </td>
      </tr>
    </table>
    `,
    previewText,
  );

  return {
    subject: `🏆 Parabéns, ${firstName}! Você ganhou a rifa ${raffleName}`,
    html,
    previewText,
  };
}
