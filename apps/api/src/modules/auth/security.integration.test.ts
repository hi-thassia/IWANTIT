import { PGlite } from '@electric-sql/pglite';
import { count } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { InjectOptions } from 'light-my-request';
import { buildApp } from '../../app.js';
import type { Database } from '../../database/client.js';
import { authEvents } from '../../database/schema/index.js';
import * as schema from '../../database/schema/index.js';
import type { PasswordResetMailer } from './mailer.js';
import { generateTotp } from './totp.js';

const client = new PGlite(); const pgliteDb = drizzle(client, { schema }); const db = pgliteDb as unknown as Database;
const mailer: PasswordResetMailer = { sendPasswordReset: async () => undefined };
const app = buildApp({ db, mailer }); let cookie = ''; let secret = '';
const credentials = { email: 'security@example.com', password: 'SenhaSegura123' };
const inject = (options: InjectOptions, remoteAddress = '10.0.0.1') => app.inject({ ...options, remoteAddress });

beforeAll(async () => { await migrate(pgliteDb, { migrationsFolder: fileURLToPath(new URL('../../../drizzle', import.meta.url)) }); await app.ready(); });
afterAll(async () => { await app.close(); await client.close(); });

describe('advanced authentication security', () => {
  it('adds defensive headers and rejects cross-site mutations', async () => {
    const health = await inject({ method: 'GET', url: '/health' });
    expect(health.headers['x-content-type-options']).toBe('nosniff');
    const csrf = await inject({ method: 'POST', url: '/api/auth/login', headers: { origin: 'https://evil.example' }, payload: credentials });
    expect(csrf.statusCode).toBe(403);
  });

  it('applies progressive protection after three failures without locking other origins', async () => {
    await inject({ method: 'POST', url: '/api/auth/register', payload: { name: 'Conta Segura', ...credentials } });
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await inject({ method: 'POST', url: '/api/auth/login', payload: { email: credentials.email, password: 'senhaErrada' } });
      expect(response.statusCode).toBe(401);
    }
    const throttled = await inject({ method: 'POST', url: '/api/auth/login', payload: credentials });
    expect(throttled.statusCode).toBe(429); expect(Number(throttled.headers['retry-after'])).toBeGreaterThan(0);
    const differentOrigin = await inject({ method: 'POST', url: '/api/auth/login', payload: credentials }, '10.0.0.2');
    expect(differentOrigin.statusCode).toBe(200);
    cookie = getCookie(differentOrigin.headers['set-cookie']);
  });

  it('requires the password to set up TOTP and enables it with a valid code', async () => {
    const rejected = await inject({ method: 'POST', url: '/api/auth/2fa/setup', headers: { cookie }, payload: { password: 'incorreta' } }, '10.0.0.2');
    expect(rejected.statusCode).toBe(401);
    const setup = await inject({ method: 'POST', url: '/api/auth/2fa/setup', headers: { cookie }, payload: { password: credentials.password } }, '10.0.0.2');
    expect(setup.statusCode).toBe(200); secret = setup.json().secret; expect(setup.json().qrCode).toMatch(/^data:image\/png;base64,/);
    const previousCode = generateTotp(secret, Date.now() - 30_000).code;
    const enabled = await inject({ method: 'POST', url: '/api/auth/2fa/enable', headers: { cookie }, payload: { code: previousCode } }, '10.0.0.2');
    expect(enabled.statusCode).toBe(200);
  });

  it('requires and consumes a one-time TOTP challenge during login', async () => {
    await inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie } }, '10.0.0.2');
    const login = await inject({ method: 'POST', url: '/api/auth/login', payload: credentials }, '10.0.0.2');
    expect(login.statusCode).toBe(202); expect(login.json()).toMatchObject({ requiresTwoFactor: true });
    const payload = { challengeToken: login.json().challengeToken, code: generateTotp(secret).code };
    const completed = await inject({ method: 'POST', url: '/api/auth/login/2fa', payload }, '10.0.0.2');
    expect(completed.statusCode).toBe(200); cookie = getCookie(completed.headers['set-cookie']);
    const replay = await inject({ method: 'POST', url: '/api/auth/login/2fa', payload }, '10.0.0.2');
    expect(replay.statusCode).toBe(401);
  });

  it('requires password and TOTP to disable the second factor', async () => {
    const currentCode = generateTotp(secret).code;
    const wrongPassword = await inject({ method: 'POST', url: '/api/auth/2fa/disable', headers: { cookie }, payload: { password: 'incorreta', code: currentCode } }, '10.0.0.2');
    expect(wrongPassword.statusCode).toBe(401);
    const disabled = await inject({ method: 'POST', url: '/api/auth/2fa/disable', headers: { cookie }, payload: { password: credentials.password, code: currentCode } }, '10.0.0.2');
    expect(disabled.statusCode).toBe(200);
  });

  it('lists and revokes owned sessions and writes an audit trail', async () => {
    const list = await inject({ method: 'GET', url: '/api/auth/sessions', headers: { cookie } }, '10.0.0.2');
    expect(list.statusCode).toBe(200); const current = list.json().sessions.find((session: { current: boolean }) => session.current); expect(current).toBeDefined();
    const revoked = await inject({ method: 'DELETE', url: `/api/auth/sessions/${current.id}`, headers: { cookie } }, '10.0.0.2');
    expect(revoked.statusCode).toBe(204);
    const rejected = await inject({ method: 'GET', url: '/api/auth/session', headers: { cookie } }, '10.0.0.2'); expect(rejected.statusCode).toBe(401);
    const [events] = await db.select({ value: count() }).from(authEvents); expect(events!.value).toBeGreaterThanOrEqual(8);
  });

  it('rejects unknown fields instead of silently accepting input', async () => {
    const response = await inject({ method: 'POST', url: '/api/auth/register', payload: { name: 'Teste', email: 'test2@example.com', password: 'Senha1234', admin: true } });
    expect(response.statusCode).toBe(400);
  });
});

function getCookie(value: string | string[] | undefined) { const header = Array.isArray(value) ? value[0] : value; if (!header) throw new Error('Cookie missing'); return header.split(';')[0]!; }
