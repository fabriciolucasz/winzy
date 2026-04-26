import { baseEmailLayout } from "./base-layout";

/**
 * Template: Código de verificação.
 * Objetivo: segurança + urgência (válido por 15 min).
 */
export function verificationEmailTemplate(code: string): { subject: string; html: string; previewText: string } {
  const previewText = `${code} — Código de verificação Winzy (válido por 15 min)`;

  const html = baseEmailLayout(
    `
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:900;color:#111827;letter-spacing:-0.5px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
      Seu código de acesso
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
      Use o código abaixo para entrar na sua conta. Ele é válido por <strong>15 minutos</strong> e só você o recebeu.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td align="center">
          <div style="display:inline-block;background:#f0fdf4;border:2px solid #10b981;border-radius:12px;padding:16px 48px;">
            <span style="font-family:'Courier New',Courier,monospace;font-size:40px;font-weight:900;letter-spacing:0.2em;color:#065f46;">${code}</span>
          </div>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
      Não solicitou este código? Ignore este e-mail com segurança — nenhuma ação será realizada.
    </p>
    `,
    previewText,
  );

  return {
    subject: `${code} é seu código de acesso Winzy`,
    html,
    previewText,
  };
}
