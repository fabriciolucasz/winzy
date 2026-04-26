import { baseEmailLayout } from "./base-layout";

/**
 * Template: Boas-vindas ao novo usuário.
 * Objetivo: onboarding AIDA — engajamento + CTA para acessar a plataforma.
 */
export function welcomeEmailTemplate(name: string): { subject: string; html: string; previewText: string } {
  const firstName = name.split(" ")[0];
  const previewText = `Bem-vindo à Winzy, ${firstName}! Sua conta está pronta para participar.`;

  const html = baseEmailLayout(
    `
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:900;color:#111827;letter-spacing:-0.5px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
      Seja bem-vindo, ${firstName}!
    </h1>
    <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
      Sua conta foi criada com sucesso. Você já pode participar de rifas, acompanhar seus bilhetes e concorrer a prêmios incríveis.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr>
        <td width="44" valign="top" style="padding-right:16px;padding-bottom:16px;">
          <div style="width:40px;height:40px;background:#f0fdf4;border-radius:10px;text-align:center;line-height:40px;font-size:20px;">🎟️</div>
        </td>
        <td valign="top" style="padding-bottom:16px;">
          <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#111827;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Escolha sua rifa</p>
          <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Navegue pelas rifas disponíveis e escolha a sua.</p>
        </td>
      </tr>
      <tr>
        <td width="44" valign="top" style="padding-right:16px;padding-bottom:16px;">
          <div style="width:40px;height:40px;background:#f0fdf4;border-radius:10px;text-align:center;line-height:40px;font-size:20px;">⚡</div>
        </td>
        <td valign="top" style="padding-bottom:16px;">
          <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#111827;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Pague com PIX em segundos</p>
          <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Pagamento instantâneo, bilhetes confirmados na hora.</p>
        </td>
      </tr>
      <tr>
        <td width="44" valign="top" style="padding-right:16px;">
          <div style="width:40px;height:40px;background:#f0fdf4;border-radius:10px;text-align:center;line-height:40px;font-size:20px;">🏆</div>
        </td>
        <td valign="top">
          <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#111827;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Acompanhe o sorteio ao vivo</p>
          <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Transparência total — você sabe exatamente o que está acontecendo.</p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <a href="https://www.winzy.com.br" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 40px;border-radius:10px;letter-spacing:0.02em;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
            Acessar minha conta →
          </a>
        </td>
      </tr>
    </table>
    `,
    previewText,
  );

  return {
    subject: `Bem-vindo, ${firstName}! Sua conta está pronta 🎯`,
    html,
    previewText,
  };
}
