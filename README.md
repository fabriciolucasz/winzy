# InCherry Awards

Plataforma multi-tenant para campanhas, rifas e experiencias de conversao.

## Stack

- Next.js (App Router)
- TypeScript
- Prisma
- PostgreSQL
- Nodemailer
- Motion + Tailwind CSS

## Requisitos

- Node.js 22+
- Banco PostgreSQL

## Setup local

1. Instale dependencias:

```bash
npm install
```

2. Configure o ambiente em `.env`.

3. Gere o client Prisma:

```bash
npx prisma generate
```

4. Rode o projeto:

```bash
npm run dev
```

Aplicacao local: http://localhost:3000

## Scripts

- `npm run dev`: ambiente de desenvolvimento
- `npm run build`: build de producao
- `npm run start`: sobe app em producao
- `npm run lint`: lint
- `npm run email:test`: valida SMTP e envia emails de teste

## Variaveis de ambiente importantes

### Banco e app

- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `APP_ROOT_DOMAIN`
- `JWT_SECRET`

### SMTP (emails)

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE` (opcional: `true` ou `false`; se ausente usa auto por porta)
- `SMTP_FORCE_IPV4` (opcional, default `true`)
- `SMTP_TLS_REJECT_UNAUTHORIZED` (opcional, default `true`)
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM` (opcional)
- `SMTP_TEST_TO` (opcional, usado no script de teste)
- `SMTP_CONNECTION_TIMEOUT_MS` (opcional)
- `SMTP_GREETING_TIMEOUT_MS` (opcional)
- `SMTP_SOCKET_TIMEOUT_MS` (opcional)

## Teste de email (Nodemailer)

Arquivo de teste: [src/scripts/test-email.ts](src/scripts/test-email.ts)

O script faz:

1. Verificacao de conexao SMTP (`transporter.verify()`)
2. Envio de template de verificacao
3. Envio de template de boas-vindas
4. Envio de template de ganhador de rifa

### Exemplos

Todos os templates:

```bash
npm run email:test -- --to=destinatario@dominio.com --mode=all
```

Somente verificacao:

```bash
npm run email:test -- --to=destinatario@dominio.com --mode=verify --code=654321
```

Somente boas-vindas:

```bash
npm run email:test -- --to=destinatario@dominio.com --mode=welcome --name="Cliente Teste"
```

Somente ganhador:

```bash
npm run email:test -- --to=destinatario@dominio.com --mode=winner --name="Cliente Teste" --raffle="Rifa Premium" --ticket=2401
```

Se `--to` nao for enviado, o script usa `SMTP_TEST_TO`.

## Troubleshooting SMTP (cPanel)

Para configuracao mostrada no cPanel (SSL/TLS + SMTP 465):

- `SMTP_HOST=mail.winzy.com.br`
- `SMTP_PORT=465`
- `SMTP_SECURE=true`
- `SMTP_USER=noreply@winzy.com.br`
- `SMTP_PASS=<senha_da_conta_de_email>`

Se ocorrer `Connection timeout`:

1. Verifique se o subdominio de email esta em DNS only no Cloudflare (sem proxy laranja).
2. Confirme que a porta 465 esta liberada para saida no servidor onde roda a aplicacao.
3. Rode `npm run email:test -- --mode=verify --to=seu-email@dominio.com` e observe o bloco de diagnostico DNS/TCP/TLS.
4. Se TCP ok e TLS falhar por certificado, teste temporariamente `SMTP_TLS_REJECT_UNAUTHORIZED=false` para diagnostico.
5. Mantenha `SMTP_FORCE_IPV4=true` quando houver problema de rota IPv6.

## Modulo de email

Arquivo principal: [src/lib/auth/email.ts](src/lib/auth/email.ts)

Funcoes disponiveis:

- `verifyEmailConnection()`
- `sendVerificationEmail(email, code)`
- `sendWelcomeEmail(email, name)`
- `sendRaffleWinnerEmail({ email, clientName, raffleName, ticketNumber })`

## Observacoes de seguranca

- Nao commite credenciais SMTP reais.
- Prefira contas de envio dedicadas (ex.: `noreply@...`).
- Em producao, mantenha segredos em provider seguro (env vars da plataforma).
