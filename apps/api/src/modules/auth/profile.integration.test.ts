import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import type { Database } from '../../database/client.js';
import * as schema from '../../database/schema/index.js';

const client = new PGlite();
const pgliteDb = drizzle(client, { schema });
const app = buildApp({ db: pgliteDb as unknown as Database });
let cookie = ''; let otherCookie = '';

beforeAll(async () => {
  await migrate(pgliteDb, { migrationsFolder: fileURLToPath(new URL('../../../drizzle', import.meta.url)) }); await app.ready();
  const register = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { name: 'Maria Lima', email: 'maria@example.com', password: 'senha1234' } }); cookie = cookieHeader(register.headers['set-cookie']);
  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'maria@example.com', password: 'senha1234' } }); otherCookie = cookieHeader(login.headers['set-cookie']);
});
afterAll(async () => { await app.close(); await client.close(); });

describe('profile and settings', () => {
  it('loads and persists profile, avatar, theme and notification preferences', async () => {
    const initial = await app.inject({ method: 'GET', url: '/api/profile', headers: { cookie } });
    expect(initial.json()).toMatchObject({ user: { theme: 'system', loginMethods: ['password'] }, notifications: { priceTargetAlert: true } });
    expect((await patch('/api/profile/name', { name: 'Maria Silva' })).json().user.name).toBe('Maria Silva');
    const avatar = 'data:image/png;base64,iVBORw0KGgo=';
    expect((await patch('/api/profile/avatar', { avatarUrl: avatar })).json().user.avatarUrl).toBe(avatar);
    expect((await patch('/api/profile/theme', { theme: 'dark' })).json().user.theme).toBe('dark');
    const preferences = { priceTargetAlert: false, priceDropAlert: true, newLowAlert: false, stockAlert: true };
    expect((await patch('/api/profile/notifications', preferences)).json().notifications).toEqual(preferences);
    expect((await patch('/api/profile/avatar', { avatarUrl: null })).json().user.avatarUrl).toBeNull();
  });

  it('requires reauthentication for e-mail and password and revokes other sessions', async () => {
    expect((await app.inject({ method: 'POST', url: '/api/profile/email', headers: { cookie }, payload: { email: 'nova@example.com', password: 'errada' } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/api/profile/email', headers: { cookie }, payload: { email: 'nova@example.com', password: 'senha1234' } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: '/api/profile/password', headers: { cookie }, payload: { currentPassword: 'errada', newPassword: 'novaSenha5678' } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/api/profile/password', headers: { cookie }, payload: { currentPassword: 'senha1234', newPassword: 'novaSenha5678' } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/api/auth/session', headers: { cookie: otherCookie } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/api/auth/session', headers: { cookie } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'nova@example.com', password: 'novaSenha5678' } })).statusCode).toBe(200);
  });
});

async function patch(url: string, payload: Record<string, unknown>) { return app.inject({ method: 'PATCH', url, headers: { cookie }, payload }); }
function cookieHeader(value: string | string[] | undefined) { const header = Array.isArray(value) ? value[0] : value; if (!header) throw new Error('Expected cookie'); return header.split(';')[0]!; }
