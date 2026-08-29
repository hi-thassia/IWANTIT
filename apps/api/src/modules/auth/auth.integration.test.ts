import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import type { Database } from '../../database/client.js';
import { loginAttempts, sessions, users } from '../../database/schema/index.js';
import * as schema from '../../database/schema/index.js';
import type { PasswordResetMailer } from './mailer.js';

class CaptureMailer implements PasswordResetMailer {
  messages: Array<{ email: string; name: string; resetUrl: string }> = [];
  async sendPasswordReset(input: { email: string; name: string; resetUrl: string }) { this.messages.push(input); }
}

const client = new PGlite();
const pgliteDb = drizzle(client, { schema });
const db = pgliteDb as unknown as Database;
const mailer = new CaptureMailer();
const app = buildApp({ db, mailer });
let sessionCookie = '';

beforeAll(async () => {
  await migrate(pgliteDb, { migrationsFolder: fileURLToPath(new URL('../../../drizzle', import.meta.url)) });
  await app.ready();
});
afterAll(async () => { await app.close(); await client.close(); });

describe('traditional authentication flow', () => {
  it('registers a user with an Argon2id hash and creates a session cookie', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { name: 'Ana Souza', email: 'ANA@EXAMPLE.COM', password: 'segura123' } });
    expect(response.statusCode).toBe(201);
    expect(response.json().user).toMatchObject({ name: 'Ana Souza', email: 'ana@example.com' });
    expect(response.headers['set-cookie']).toContain('HttpOnly');
    expect(response.headers['set-cookie']).toContain('SameSite=Strict');
    sessionCookie = cookieHeader(response.headers['set-cookie']);
    const [user] = await db.select().from(users).where(eq(users.email, 'ana@example.com'));
    expect(user!.passwordHash).toMatch(/^\$argon2id\$/);
    expect(user!.passwordHash).not.toContain('segura123');
    const [session] = await db.select().from(sessions).where(eq(sessions.userId, user!.id));
    expect(session!.tokenHash).toHaveLength(64);
    expect(session!.tokenHash).not.toBe(sessionCookie.split('=')[1]);
  });

  it('returns the authenticated session and protects private access', async () => {
    const anonymous = await app.inject({ method: 'GET', url: '/api/private' });
    expect(anonymous.statusCode).toBe(401);
    expect(anonymous.json()).toEqual({ message: 'Faça login para continuar.' });
    const authenticated = await app.inject({ method: 'GET', url: '/api/auth/session', headers: { cookie: sessionCookie } });
    expect(authenticated.statusCode).toBe(200);
    expect(authenticated.json().user.email).toBe('ana@example.com');
  });

  it('rejects invalid credentials and records the attempt', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'ana@example.com', password: 'errada' } });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ message: 'E-mail ou senha incorretos.' });
    const attempts = await db.select().from(loginAttempts).where(eq(loginAttempts.email, 'ana@example.com'));
    expect(attempts).toHaveLength(1);
    expect(attempts[0]!.successful).toBe(false);
  });

  it('logs in and logs out by revoking the server-side session', async () => {
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'ana@example.com', password: 'segura123' } });
    expect(login.statusCode).toBe(200);
    const cookie = cookieHeader(login.headers['set-cookie']);
    const logout = await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie } });
    expect(logout.statusCode).toBe(204);
    const afterLogout = await app.inject({ method: 'GET', url: '/api/auth/session', headers: { cookie } });
    expect(afterLogout.statusCode).toBe(401);
  });

  it('uses a generic forgot-password response and one-time reset token', async () => {
    const unknown = await app.inject({ method: 'POST', url: '/api/auth/forgot-password', payload: { email: 'nobody@example.com' } });
    const known = await app.inject({ method: 'POST', url: '/api/auth/forgot-password', payload: { email: 'ana@example.com' } });
    expect(unknown.statusCode).toBe(202);
    expect(known.statusCode).toBe(202);
    expect(unknown.json()).toEqual(known.json());
    expect(mailer.messages).toHaveLength(1);
    const token = new URL(mailer.messages[0]!.resetUrl).searchParams.get('token');
    expect(token).toBeTruthy();

    const reset = await app.inject({ method: 'POST', url: '/api/auth/reset-password', payload: { token, password: 'novaSenha456' } });
    expect(reset.statusCode).toBe(200);
    const reuse = await app.inject({ method: 'POST', url: '/api/auth/reset-password', payload: { token, password: 'outraSenha789' } });
    expect(reuse.statusCode).toBe(400);
    const oldSession = await app.inject({ method: 'GET', url: '/api/auth/session', headers: { cookie: sessionCookie } });
    expect(oldSession.statusCode).toBe(401);
    const oldPassword = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'ana@example.com', password: 'segura123' } });
    const newPassword = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'ana@example.com', password: 'novaSenha456' } });
    expect(oldPassword.statusCode).toBe(401);
    expect(newPassword.statusCode).toBe(200);
  });

  it('returns friendly field validation errors', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { name: '', email: 'invalid', password: '123' } });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ message: 'Revise os campos informados.' });
    expect(response.json().fieldErrors).toHaveProperty('email');
  });
});

function cookieHeader(value: string | string[] | undefined) {
  const header = Array.isArray(value) ? value[0] : value;
  if (!header) throw new Error('Expected a Set-Cookie header');
  return header.split(';')[0]!;
}
