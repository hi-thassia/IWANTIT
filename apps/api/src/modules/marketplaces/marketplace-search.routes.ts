import type { FastifyInstance } from 'fastify';
import type { AuthService } from '../auth/auth.service.js';
import { marketplaceSearchSchema } from './marketplace-search.schemas.js';
import type { MarketplaceSearchService } from './marketplace-search.service.js';

const cookie = process.env.NODE_ENV === 'production' ? '__Host-iwantit_session' : 'iwantit_session';
export async function marketplaceSearchRoutes(app: FastifyInstance, service: MarketplaceSearchService, auth: AuthService) {
  app.get('/marketplace-providers', async (request) => { await auth.authenticate(request.cookies[cookie]); return { providers: service.info() }; });
  app.post('/marketplace-searches', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request) => { await auth.authenticate(request.cookies[cookie]); const input = marketplaceSearchSchema.parse(request.body); return { results: await service.search(input) }; });
}
