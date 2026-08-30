import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import type { ApiStatus } from '@iwantit/shared';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { createDatabase, type Database } from './database/client.js';
import { AuthError } from './modules/auth/auth.errors.js';
import { authRoutes, privateRoutes } from './modules/auth/auth.routes.js';
import { AuthService } from './modules/auth/auth.service.js';
import { createPasswordResetMailer, type PasswordResetMailer } from './modules/auth/mailer.js';
import { validateTwoFactorConfiguration } from './modules/auth/totp.js';
import { createGoogleOAuthProvider, type GoogleOAuthProvider } from './modules/auth/google-oauth.js';
import { WishService } from './modules/wishes/wish.service.js';
import { wishRoutes } from './modules/wishes/wish.routes.js';
import { productImportRoutes } from './modules/product-import/product-import.routes.js';
import { ProductImportService } from './modules/product-import/product-import.service.js';
import { marketplaceSearchRoutes } from './modules/marketplaces/marketplace-search.routes.js';
import { MarketplaceSearchService } from './modules/marketplaces/marketplace-search.service.js';
import { MonitoringService } from './modules/monitoring/monitoring.service.js';
import { monitoringRoutes } from './modules/monitoring/monitoring.routes.js';
import { MonitoringScheduler } from './modules/monitoring/monitoring.scheduler.js';
import { AlertService } from './modules/alerts/alert.service.js';
import { alertRoutes } from './modules/alerts/alert.routes.js';

type AppOptions = { db?: Database; mailer?: PasswordResetMailer; googleOAuth?: GoogleOAuthProvider; productImport?: ProductImportService; marketplaceSearch?: MarketplaceSearchService; monitoringNow?: () => Date; monitoringIntervalMinutes?: number; closeDatabase?: () => Promise<void> };

export function buildApp(options: AppOptions = {}) {
  validateTwoFactorConfiguration();
  const app = Fastify({ logger: env.NODE_ENV !== 'test', bodyLimit: 16_384, requestTimeout: 15_000, trustProxy: env.NODE_ENV === 'production' ? (_address: string, hop: number) => hop === 0 : false });
  const database = options.db ? { db: options.db, close: options.closeDatabase } : createDatabase();
  const authService = new AuthService(database.db, options.mailer ?? createPasswordResetMailer(), options.googleOAuth ?? createGoogleOAuthProvider());
  const wishService = new WishService(database.db, authService);
  const productImportService = options.productImport ?? new ProductImportService(undefined, env.MERCADO_LIVRE_ACCESS_TOKEN);
  const marketplaceSearchService = options.marketplaceSearch ?? new MarketplaceSearchService();
  const alertService = new AlertService(database.db, authService, undefined, options.monitoringNow);
  const monitoringService = new MonitoringService(database.db, authService, marketplaceSearchService, undefined, options.monitoringIntervalMinutes ?? env.MONITORING_INTERVAL_MINUTES, options.monitoringNow, alertService);
  const monitoringScheduler = new MonitoringScheduler(monitoringService, env.MONITORING_INTERVAL_MINUTES, env.MONITORING_BATCH_SIZE, (error) => app.log.error(error));

  app.register(cors, { origin: env.WEB_ORIGIN, credentials: true });
  app.register(helmet, { global: true });
  app.register(rateLimit, { global: true, max: 100, timeWindow: '1 minute', ipv6Subnet: 64, errorResponseBuilder: (_request, context) => ({ statusCode: 429, message: `Muitas solicitações. Tente novamente em ${context.after}.` }) });
  app.register(cookie);
  app.addHook('onRequest', async (request, reply) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return;
    const origin = request.headers.origin;
    if (origin && origin !== env.WEB_ORIGIN) return reply.code(403).send({ message: 'Origem da solicitação não permitida.' });
  });
  app.register((instance) => authRoutes(instance, authService), { prefix: '/api/auth' });
  app.register((instance) => privateRoutes(instance, authService), { prefix: '/api' });
  app.register((instance) => wishRoutes(instance, wishService), { prefix: '/api' });
  app.register((instance) => productImportRoutes(instance, productImportService, authService), { prefix: '/api' });
  app.register((instance) => marketplaceSearchRoutes(instance, marketplaceSearchService, authService), { prefix: '/api' });
  app.register((instance) => monitoringRoutes(instance, monitoringService), { prefix: '/api' });
  app.register((instance) => alertRoutes(instance, alertService), { prefix: '/api' });
  app.get('/health', async (): Promise<ApiStatus> => ({ status: 'ok', service: 'iwantit-api' }));

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      const flattened = error.flatten();
      return reply.code(400).send({ message: 'Revise os campos informados.', fieldErrors: flattened.fieldErrors });
    }
    if (error instanceof AuthError) { if (error.retryAfter) reply.header('Retry-After', error.retryAfter); return reply.code(error.statusCode).send({ message: error.message }); }
    app.log.error(error);
    return reply.code(500).send({ message: 'Não foi possível concluir agora. Tente novamente.' });
  });

  if (env.MONITORING_ENABLED) app.addHook('onReady', async () => monitoringScheduler.start());
  app.addHook('onClose', async () => monitoringScheduler.stop());
  if (database.close) app.addHook('onClose', database.close);

  return app;
}
