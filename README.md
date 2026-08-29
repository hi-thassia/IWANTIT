# I Want It

Wishlist inteligente que representa o produto desejado independentemente do anúncio original, pesquisa ofertas compatíveis, registra histórico e alerta quando as condições configuradas forem atingidas.

## Stack e requisitos

- React 19, Vite e TypeScript no frontend
- Fastify, Drizzle ORM e PostgreSQL na API
- Node.js 22+ e npm 10+
- Docker 24+ e Compose v2, opcional

## Desenvolvimento local

```bash
npm install
copy .env.example .env
npm run db:migrate -w @iwantit/api
npm run dev
```

O frontend fica em `http://localhost:5173`, a API em `http://localhost:3333` e o health check em `http://localhost:3333/health`. Também é possível iniciar o ambiente de desenvolvimento com `docker compose up --build`.

## Verificações

```bash
npm run typecheck
npm test
npm run test:e2e -w @iwantit/web
npm run build
npm run db:check -w @iwantit/api
npm audit --omit=dev
```

O E2E usa Chromium em viewport desktop e mobile. Na primeira execução, instale o navegador com `npx playwright install chromium`.

## Funcionalidades

- Cadastro, login, logout, recuperação de senha e sessões opacas em cookie `HttpOnly`.
- Login Google por OpenID Connect com PKCE, state, nonce e confirmação local de 2FA.
- TOTP com segredo AES-256-GCM, proteção contra repetição de código e gestão de sessões.
- Onboarding persistido, temas claro/escuro/sistema, perfil, avatar e preferências.
- CRUD de desejos, upload validado e importação segura por URL.
- Providers modulares, matcher com proteção de variantes e monitor assíncrono com claim atômico.
- Ofertas normalizadas, histórico, métricas, gráfico e alertas internos deduplicados.
- Home e central de notificações alimentadas por dados reais do usuário autenticado.

## Segurança

A API aplica Argon2id, validação Zod estrita, limite de corpo, Helmet, CORS restrito, verificação de origem em mutações, rate limit e atraso progressivo após falhas de login. Tokens de sessão e recuperação são persistidos somente como hash. Eventos de autenticação não armazenam senha, token ou segredo.

Consultas por URL nunca acessam o endereço fornecido: somente hosts autorizados são reconhecidos e a API oficial do marketplace é chamada por endpoints fixos, mitigando SSRF. Todas as consultas, alterações e alertas que contêm dados pessoais validam a sessão e o proprietário no banco. Respostas de recurso alheio usam `404` para não revelar sua existência.

Em múltiplas réplicas, substitua o rate limiter em memória por um store compartilhado, como Redis. A proteção progressiva de login e o claim do monitoramento já usam PostgreSQL.

## Variáveis de ambiente

Consulte [.env.example](.env.example). Em produção são obrigatórias:

- `DATABASE_URL`
- `PUBLIC_WEB_ORIGIN` no Compose e `WEB_ORIGIN` na API
- `TWO_FACTOR_ENCRYPTION_KEY`, base64 de 32 bytes ou segredo aleatório com pelo menos 32 caracteres

Todas as URLs públicas de autenticação e recuperação devem usar HTTPS em produção. Gere a chave 2FA com:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Não versione `.env`, credenciais, tokens OAuth, SMTP ou marketplace. Rotacione segredos antes do lançamento se eles já tiverem sido compartilhados fora do gerenciador de segredos.

## Integrações externas

- Mercado Livre: requer `MERCADO_LIVRE_ACCESS_TOKEN`; usa API oficial.
- Google Login: integração opcional; requer `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`, cliente OAuth Web, tela de consentimento e redirect URI HTTPS cadastrada. Sem essas credenciais, a API permanece operacional e informa que o login Google está indisponível.
- Recuperação de senha: integração opcional; o envio de e-mail requer SMTP em produção. Sem SMTP, a solicitação continua retornando uma resposta genérica, mas nenhum e-mail é enviado.
- Shopee e SHEIN: abstrações registradas, mas indisponíveis até existir acesso oficial/autorizado. Não há scraping, bypass de CAPTCHA ou resultados falsos.

Frete desconhecido permanece `null`; preço total não é inventado. Similaridade visual avançada não faz parte deste MVP.

## Implantação com Docker

1. Copie `.env.example` para um arquivo de ambiente seguro e preencha todos os valores de produção.
2. Defina `DATABASE_URL` com host `postgres` e credenciais percent-encoded.
3. Execute:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
```

O serviço web fica na porta `WEB_PORT` (8080 por padrão), serve a SPA, encaminha `/api` para a API e aplica headers de segurança e cache de assets. Coloque-o atrás de um proxy/load balancer com certificado TLS. A API não é publicada diretamente. O serviço `migrate` aplica as migrations antes de iniciar a API.

Antes de atualizar produção, faça backup do PostgreSQL. Para rollback de aplicação, mantenha a imagem anterior; migrations destrutivas devem sempre ter um plano específico de reversão.

## Operação

- `MONITORING_ENABLED=true` ativa o scheduler.
- `MONITORING_INTERVAL_MINUTES` define o intervalo mínimo por desejo.
- `MONITORING_BATCH_SIZE` limita o lote de cada ciclo.
- `/health` serve para liveness; monitore também erros estruturados da API e métricas de execução do scheduler.
- Use somente uma réplica com scheduler habilitado ou preserve o claim compartilhado ao escalar. O claim atual evita processamento simultâneo do mesmo desejo.

Dados de marketplaces dependem da disponibilidade e dos limites das APIs externas. Timeouts, rate limits, respostas incompletas e indisponibilidade são apresentados sem fabricar ofertas.
