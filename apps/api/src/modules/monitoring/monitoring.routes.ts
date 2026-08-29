import type { FastifyInstance } from 'fastify';
import { wishIdSchema } from '../wishes/wish.schemas.js';
import type { MonitoringService } from './monitoring.service.js';

const cookie = process.env.NODE_ENV === 'production' ? '__Host-iwantit_session' : 'iwantit_session';
export async function monitoringRoutes(app: FastifyInstance, service: MonitoringService) {
  app.get('/wishes/:id/monitoring', async (request) => ({ monitoring: await service.viewOwned(request.cookies[cookie], wishIdSchema.parse(request.params).id) }));
  app.post('/wishes/:id/monitor', { config: { rateLimit: { max: 3, timeWindow: '1 minute' } } }, async (request) => ({ run: await service.runOwned(request.cookies[cookie], wishIdSchema.parse(request.params).id) }));
}
