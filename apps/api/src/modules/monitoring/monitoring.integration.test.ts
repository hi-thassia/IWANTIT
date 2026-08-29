import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../app.js';
import type { Database } from '../../database/client.js';
import * as schema from '../../database/schema/index.js';
import { MarketplaceSearchService } from '../marketplaces/marketplace-search.service.js';
import type { MarketplaceProvider } from '../marketplaces/marketplace-provider.js';

const client = new PGlite(); const db = drizzle(client, { schema });
let price = 599; let clock = new Date('2026-08-29T12:00:00Z');
const search = vi.fn(async () => [{ marketplace: 'mercado-livre' as const, externalId: 'MLB123', title: 'Fone Wave Pro', url: 'https://produto.mercadolivre.com.br/MLB-123', imageUrl: null, seller: 'LOJA', price: price.toFixed(2), shippingPrice: '0.00', totalPrice: price.toFixed(2), availability: 'available' as const, attributes: { Marca: 'Acme' }, checkedAt: clock.toISOString() }]);
const provider: MarketplaceProvider = { slug: 'mercado-livre', name: 'Mercado Livre', info: () => ({ marketplace: 'mercado-livre', marketplaceName: 'Mercado Livre', source: 'official_api', available: true, message: null }), search };
const app = buildApp({ db: db as unknown as Database, marketplaceSearch: new MarketplaceSearchService([provider]), monitoringNow: () => clock, monitoringIntervalMinutes: 30 });
let cookie = ''; let wishId = '';

beforeAll(async () => {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../../../drizzle', import.meta.url)) }); await app.ready();
  const registration = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { name: 'Pessoa', email: 'monitor@example.com', password: 'senha1234' } }); cookie = cookieHeader(registration.headers['set-cookie']);
  const marketplaces = (await app.inject({ method: 'GET', url: '/api/marketplaces' })).json().marketplaces; const mercadoLivre = marketplaces.find((item: { slug: string }) => item.slug === 'mercado-livre');
  const created = await app.inject({ method: 'POST', url: '/api/wishes', headers: { cookie }, payload: { name: 'Fone Wave Pro', referenceUrl: null, referenceImage: null, targetPrice: '450.00', initialPrice: '699.00', category: 'Eletrônicos', brand: 'Acme', color: null, size: null, notes: null, marketplaceIds: [mercadoLivre.id], alertType: 'price_target', exactMatchOnly: false } }); wishId = created.json().wish.id;
});
afterAll(async () => { await app.close(); await client.close(); });

describe('periodic monitoring and price history', () => {
  it('stores matched offers and shows a price even above the target', async () => {
    const run = await request('POST', `/api/wishes/${wishId}/monitor`); expect(run.json().run).toMatchObject({ state: 'completed', acceptedOffers: 1 });
    const monitoring = (await request('GET', `/api/wishes/${wishId}/monitoring`)).json().monitoring;
    expect(monitoring).toMatchObject({ initialPrice: '699.00', targetPrice: '450.00', currentLowestPrice: '599.00', historicalLowestPrice: '599.00', historicalHighestPrice: '599.00', lastCheckedAt: '2026-08-29T12:00:00.000Z' });
    expect(monitoring.offers).toHaveLength(1); expect(monitoring.history).toEqual([{ recordedAt: '2026-08-29T12:00:00.000Z', lowestPrice: '599.00' }]);
    const wish = (await request('GET', `/api/wishes/${wishId}`)).json().wish; expect(wish).toMatchObject({ lowestPrice: '599.00', lowestMarketplace: 'Mercado Livre', offerCount: 1 });
  });
  it('records only changed prices and computes evolution and extrema', async () => {
    clock = new Date('2026-08-29T12:31:00Z'); price = 489;
    expect((await request('POST', `/api/wishes/${wishId}/monitor`)).json().run.state).toBe('completed');
    const monitoring = (await request('GET', `/api/wishes/${wishId}/monitoring`)).json().monitoring;
    expect(monitoring).toMatchObject({ currentLowestPrice: '489.00', historicalLowestPrice: '489.00', historicalHighestPrice: '599.00' }); expect(monitoring.history).toHaveLength(2);
  });
  it('skips duplicate monitoring inside the configured interval', async () => {
    const calls = search.mock.calls.length; const run = await request('POST', `/api/wishes/${wishId}/monitor`); expect(run.json().run.state).toBe('skipped'); expect(search).toHaveBeenCalledTimes(calls);
    expect((await request('GET', `/api/wishes/${wishId}/monitoring`)).json().monitoring.history).toHaveLength(2);
  });
});
function request(method: 'GET' | 'POST', url: string) { return app.inject({ method, url, headers: { cookie } }); }
function cookieHeader(value: string|string[]|undefined) { const header = Array.isArray(value) ? value[0] : value; if (!header) throw new Error('Expected cookie'); return header.split(';')[0]!; }
