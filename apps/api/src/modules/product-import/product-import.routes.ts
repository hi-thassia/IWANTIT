import type { FastifyInstance } from 'fastify';
import type { AuthService } from '../auth/auth.service.js';
import { productImportInputSchema } from './product-import.schemas.js';
import type { ProductImportService } from './product-import.service.js';

const cookie = process.env.NODE_ENV === 'production' ? '__Host-iwantit_session' : 'iwantit_session';

export async function productImportRoutes(app: FastifyInstance, service: ProductImportService, auth: AuthService) {
  app.post('/product-imports', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request) => {
    await auth.authenticate(request.cookies[cookie]);
    const input = productImportInputSchema.parse(request.body);
    return { product: await service.import(input.url) };
  });
}
