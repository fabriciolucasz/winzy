/**
 * Base layout compartilhado por todos os templates de email Winzy.
 * Tema light — compatível com Gmail, Outlook, Apple Mail.
 */
const APP_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")) ||
  "https://www.winzy.com.br";

const LOGO_URL = `${APP_URL}/winzy_logo.png`;

export function baseEmailLayout(content: string, previewText?: string): string {
  const preview = previewText
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;color:#f9fafb;font-size:1px;">${previewText}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Winzy</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
${preview}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

      <!-- Header -->
      <tr>
        <td style="background:#ffffff;border-radius:16px 16px 0 0;padding:20px 32px;border-bottom:1px solid #e2e8f0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <a href="${APP_URL}" style="text-decoration:none;display:block;">
                  <img src="${LOGO_URL}" alt="Winzy" width="96" height="auto"
                    style="display:block;border:0;height:auto;max-height:40px;width:auto;max-width:120px;" />
                </a>
              </td>
              <td align="right">
                <span style="font-size:11px;color:#94a3b8;letter-spacing:0.08em;text-transform:uppercase;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Plataforma de Rifas</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="background:#ffffff;padding:32px;line-height:1.6;">
          ${content}
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f8fafc;border-radius:0 0 16px 16px;padding:20px 32px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
            Este e-mail foi enviado pela <strong style="color:#64748b;">Winzy</strong>.<br />
            Caso não reconheça esta ação, ignore esta mensagem com segurança.<br />
            <a href="https://www.winzy.com.br" style="color:#10b981;text-decoration:none;">winzy.com.br</a>
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}
