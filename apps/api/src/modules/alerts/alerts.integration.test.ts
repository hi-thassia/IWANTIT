import { PGlite } from '@electric-sql/pglite';
import type { NormalizedOffer } from '@iwantit/shared';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../app.js';
import type { Database } from '../../database/client.js';
import * as schema from '../../database/schema/index.js';
import type { MarketplaceProvider } from '../marketplaces/marketplace-provider.js';
import { MarketplaceSearchService } from '../marketplaces/marketplace-search.service.js';

const client = new PGlite();
const db = drizzle(client, { schema });
let clock = new Date('2026-08-29T12:00:00Z');
let price = 430;
const provider: MarketplaceProvider = {
  slug: 'mercado-livre', name: 'Mercado Livre',
  info: () => ({ marketplace: 'mercado-livre', marketplaceName: 'Mercado Livre', source: 'official_api', available: true, message: null }),
  search: vi.fn(async (): Promise<NormalizedOffer[]> => [{
    marketplace: 'mercado-livre', externalId: 'MLB1', title: 'Tênis Runner', url: 'https://produto.mercadolivre.com.br/MLB-1',
    imageUrl: null, seller: 'LOJA', price: price.toFixed(2), shippingPrice: '0.00', totalPrice: price.toFixed(2),
    availability: 'available', attributes: { Marca: 'Acme' }, checkedAt: clock.toISOString(),
  }]),
};
const app = buildApp({ db: db as unknown as Database, marketplaceSearch: new MarketplaceSearchService([provider]), monitoringNow: () => clock, monitoringIntervalMinutes: 30 });
let owner = ''; let stranger = ''; let wishId = '';

beforeAll(async () => {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../../../drizzle', import.meta.url)) });
  await app.ready();
  owner = await register('alerts@example.com'); stranger = await register('stranger-alerts@example.com');
  const markets = (await app.inject({ method: 'GET', url: '/api/marketplaces' })).json().marketplaces;
  const mercado = markets.find((item: { slug: string }) => item.slug === 'mercado-livre');
  const created = await request('POST', '/api/wishes', owner, {
    name: 'Tênis Runner', referenceUrl: null, referenceImage: null, targetPrice: '450.00', initialPrice: '699.00',
    category: 'Calçados', brand: 'Acme', color: null, size: null, notes: null,
    marketplaceIds: [mercado.id], alertType: 'price_target', exactMatchOnly: false,
  });
  wishId = created.json().wish.id;
});
afterAll(async () => { await app.close(); await client.close(); });

describe('in-app alerts', () => {
  it('creates a real unread alert with wish and offer links', async () => {
    await request('POST', `/api/wishes/${wishId}/monitor`, owner);
    const result = await request('GET', '/api/alerts', owner);
    expect(result.json().unreadCount).toBe(1);
    expect(result.json().alerts[0]).toMatchObject({ title: 'Preço abaixo do seu objetivo!', wishId, wishName: 'Tênis Runner', offerUrl: 'https://produto.mercadolivre.com.br/MLB-1', readAt: null, metadata: { currentPrice: 430, targetPrice: 450 } });
  });
  it('does not duplicate the exact event and price on a later cycle', async () => {
    clock = new Date('2026-08-29T12:31:00Z'); await request('POST', `/api/wishes/${wishId}/monitor`, owner);
    expect((await request('GET', '/api/alerts', owner)).json().alerts).toHaveLength(1);
  });
  it('respects disabled preferences even for a new qualifying price', async () => {
    await request('PATCH', '/api/profile/notifications', owner, { priceTargetAlert: false, priceDropAlert: true, newLowAlert: true, stockAlert: true });
    clock = new Date('2026-08-29T13:02:00Z'); price = 420; await request('POST', `/api/wishes/${wishId}/monitor`, owner);
    expect((await request('GET', '/api/alerts', owner)).json().alerts).toHaveLength(1);
  });
  it('marks alerts read and never exposes another user’s alert', async () => {
    const alert = (await request('GET', '/api/alerts', owner)).json().alerts[0];
    expect((await request('GET', '/api/alerts', stranger)).json().alerts).toEqual([]);
    expect((await request('PATCH', `/api/alerts/${alert.id}/read`, stranger)).statusCode).toBe(404);
    await request('PATCH', `/api/alerts/${alert.id}/read`, owner);
    expect((await request('GET', '/api/alerts', owner)).json().unreadCount).toBe(0);
  });
});

async function register(email: string) { const response = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { name: 'Pessoa', email, password: 'senha1234' } }); return cookieHeader(response.headers['set-cookie']); }
function request(method: 'GET' | 'POST' | 'PATCH', url: string, cookie: string, payload?: object) { return app.inject({ method, url, headers: { cookie }, payload }); }
function cookieHeader(value: string | string[] | undefined) { const header = Array.isArray(value) ? value[0] : value; if (!header) throw new Error('Expected cookie'); return header.split(';')[0]!; }
