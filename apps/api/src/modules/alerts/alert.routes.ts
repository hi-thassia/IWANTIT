import type { FastifyInstance } from 'fastify';
import { alertIdSchema } from './alert.schemas.js';
import type { AlertService } from './alert.service.js';
const cookie = process.env.NODE_ENV === 'production' ? '__Host-iwantit_session' : 'iwantit_session';
export async function alertRoutes(app: FastifyInstance, service: AlertService) { app.get('/alerts', async (request) => service.list(request.cookies[cookie])); app.patch('/alerts/:id/read', async (request) => service.markRead(request.cookies[cookie], alertIdSchema.parse(request.params).id)); app.patch('/alerts/read-all', async (request) => service.markAllRead(request.cookies[cookie])); }
