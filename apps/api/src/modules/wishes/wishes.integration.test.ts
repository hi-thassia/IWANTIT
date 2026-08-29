import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import type { Database } from '../../database/client.js';
import * as schema from '../../database/schema/index.js';

const client = new PGlite(); const db = drizzle(client, { schema }); const app = buildApp({ db: db as unknown as Database });
let owner = ''; let stranger = ''; let marketplaceId = ''; let wishId = '';
const base = { name: 'Tênis branco', referenceUrl: 'https://example.com/produto', referenceImage: 'data:image/png;base64,iVBORw0KGgo=', targetPrice: '399.90', initialPrice: '599.00', category: 'Calçados', brand: 'Marca', color: 'Branco', size: '38', notes: 'Sem couro', marketplaceIds: [] as string[], alertType: 'price_target', exactMatchOnly: true };
beforeAll(async () => { await migrate(db, { migrationsFolder: fileURLToPath(new URL('../../../drizzle', import.meta.url)) }); await app.ready(); owner = await register('dono@example.com'); stranger = await register('outro@example.com'); marketplaceId = (await app.inject({ method: 'GET', url: '/api/marketplaces' })).json().marketplaces[0].id; base.marketplaceIds = [marketplaceId]; });
afterAll(async () => { await app.close(); await client.close(); });

describe('authenticated wishes CRUD', () => {
  it('creates, lists and reads a real wish without invented offers', async () => { const created = await request('POST', '/api/wishes', owner, base); expect(created.statusCode).toBe(201); wishId = created.json().wish.id; expect(created.json().wish).toMatchObject({ lowestPrice: null, lowestMarketplace: null, status: 'active', marketplaceIds: [marketplaceId] }); const list = await request('GET', '/api/wishes', owner); expect(list.json().wishes).toHaveLength(1); expect((await request('GET', `/api/wishes/${wishId}`, owner)).statusCode).toBe(200); });
  it('validates the uploaded image signature', async () => { const invalid = await request('POST', '/api/wishes', owner, { ...base, name: 'Imagem falsa', referenceImage: 'data:image/png;base64,ZmFrZQ==' }); expect(invalid.statusCode).toBe(400); });
  it('updates and pauses/reactivates the owned wish', async () => { const updated = await request('PUT', `/api/wishes/${wishId}`, owner, { ...base, name: 'Tênis atualizado', exactMatchOnly: false, alertType: 'price_drop' }); expect(updated.json().wish).toMatchObject({ name: 'Tênis atualizado', exactMatchOnly: false, alertType: 'price_drop' }); expect((await request('PATCH', `/api/wishes/${wishId}/status`, owner, { status: 'paused' })).json().wish.status).toBe('paused'); expect((await request('PATCH', `/api/wishes/${wishId}/status`, owner, { status: 'active' })).json().wish.status).toBe('active'); });
  it('never exposes or mutates another user’s wish', async () => { expect((await request('GET', `/api/wishes/${wishId}`, stranger)).statusCode).toBe(404); expect((await request('PUT', `/api/wishes/${wishId}`, stranger, base)).statusCode).toBe(404); expect((await request('PATCH', `/api/wishes/${wishId}/status`, stranger, { status: 'paused' })).statusCode).toBe(404); expect((await request('DELETE', `/api/wishes/${wishId}`, stranger)).statusCode).toBe(404); expect((await request('GET', '/api/wishes', stranger)).json().wishes).toEqual([]); });
  it('deletes the owned wish', async () => { expect((await request('DELETE', `/api/wishes/${wishId}`, owner)).statusCode).toBe(204); expect((await request('GET', `/api/wishes/${wishId}`, owner)).statusCode).toBe(404); });
});
async function register(email: string) { const response = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { name: 'Pessoa', email, password: 'senha1234' } }); return cookieHeader(response.headers['set-cookie']); }
function request(method: 'GET'|'POST'|'PUT'|'PATCH'|'DELETE', url: string, cookie: string, payload?: object) { return app.inject({ method, url, headers: { cookie }, payload }); }
function cookieHeader(value: string|string[]|undefined) { const header = Array.isArray(value) ? value[0] : value; if (!header) throw new Error('Expected cookie'); return header.split(';')[0]!; }
