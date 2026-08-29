import type { FastifyInstance } from 'fastify';
import type { WishService } from './wish.service.js';
import { wishIdSchema, wishInputSchema, wishStatusSchema } from './wish.schemas.js';

const cookie = process.env.NODE_ENV === 'production' ? '__Host-iwantit_session' : 'iwantit_session';
export async function wishRoutes(app: FastifyInstance, service: WishService) {
  app.get('/marketplaces', async () => ({ marketplaces: await service.marketplaceOptions() }));
  app.get('/wishes', async (request) => ({ wishes: await service.list(request.cookies[cookie]) }));
  app.post('/wishes', { bodyLimit: 750_000 }, async (request, reply) => { const wish = await service.create(request.cookies[cookie], wishInputSchema.parse(request.body)); reply.code(201); return { wish }; });
  app.get('/wishes/:id', async (request) => ({ wish: await service.get(request.cookies[cookie], wishIdSchema.parse(request.params).id) }));
  app.put('/wishes/:id', { bodyLimit: 750_000 }, async (request) => ({ wish: await service.update(request.cookies[cookie], wishIdSchema.parse(request.params).id, wishInputSchema.parse(request.body)) }));
  app.patch('/wishes/:id/status', async (request) => ({ wish: await service.status(request.cookies[cookie], wishIdSchema.parse(request.params).id, wishStatusSchema.parse(request.body).status) }));
  app.delete('/wishes/:id', async (request, reply) => { await service.delete(request.cookies[cookie], wishIdSchema.parse(request.params).id); reply.code(204).send(); });
}
