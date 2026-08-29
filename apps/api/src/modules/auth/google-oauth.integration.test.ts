import { PGlite } from '@electric-sql/pglite';
import { count, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import type { Database } from '../../database/client.js';
import { users } from '../../database/schema/index.js';
import * as schema from '../../database/schema/index.js';
import type { GoogleIdentity, GoogleOAuthProvider } from './google-oauth.js';
import type { PasswordResetMailer } from './mailer.js';
import { encryptSecret, generateTotp, generateTotpSecret } from './totp.js';

class FakeGoogle implements GoogleOAuthProvider {
  identity: GoogleIdentity = { subject: 'google-1', email: 'google@example.com', emailVerified: true, name: 'Pessoa Google' };
  last?: { state: string; nonce: string; codeVerifier: string }; exchanged?: { state: string; nonce: string; codeVerifier: string }; exchanges = 0;
  async createAuthorizationUrl(input: { state: string; nonce: string; codeVerifier: string }) { this.last = input; return new URL(`https://accounts.google.test/auth?state=${input.state}`); }
  async exchange(input: { callbackUrl: URL; state: string; nonce: string; codeVerifier: string }) { this.exchanges += 1; this.exchanged = input; return this.identity; }
}

const client = new PGlite(); const pgliteDb = drizzle(client, { schema }); const db = pgliteDb as unknown as Database; const google = new FakeGoogle();
const mailer: PasswordResetMailer = { sendPasswordReset: async () => undefined }; const app = buildApp({ db, mailer, googleOAuth: google });

beforeAll(async () => { await migrate(pgliteDb, { migrationsFolder: fileURLToPath(new URL('../../../drizzle', import.meta.url)) }); await app.ready(); });
afterAll(async () => { await app.close(); await client.close(); });

describe('Google OpenID Connect flow', () => {
  it('creates a user and session from a verified Google identity', async () => {
    const flow = await begin(); const callback = await complete(flow);
    expect(callback.statusCode).toBe(302); expect(callback.headers.location).toBe('http://localhost:5173/app');
    expect(cookie(callback, 'iwantit_session')).toBeTruthy();
    expect(google.exchanged).toMatchObject({ state: google.last!.state, nonce: google.last!.nonce, codeVerifier: google.last!.codeVerifier });
    const [user] = await db.select().from(users).where(eq(users.googleId, 'google-1'));
    expect(user).toMatchObject({ email: 'google@example.com', passwordHash: null });
  });

  it('reuses the Google subject without creating a duplicate account', async () => {
    const before = await db.select({ value: count() }).from(users); await complete(await begin()); const after = await db.select({ value: count() }).from(users);
    expect(after[0]!.value).toBe(before[0]!.value);
  });

  it('securely links a verified Google identity to an existing password account', async () => {
    google.identity = { subject: 'google-link', email: 'linked@example.com', emailVerified: true, name: 'Linked' };
    await app.inject({ method: 'POST', url: '/api/auth/register', payload: { name: 'Conta Existente', email: 'linked@example.com', password: 'Senha1234' } });
    const before = await db.select({ value: count() }).from(users); await complete(await begin()); const after = await db.select({ value: count() }).from(users);
    expect(after[0]!.value).toBe(before[0]!.value);
    const [linked] = await db.select().from(users).where(eq(users.email, 'linked@example.com'));
    expect(linked).toMatchObject({ googleId: 'google-link' }); expect(linked!.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it('rejects unverified e-mail and consumes state only once', async () => {
    google.identity = { subject: 'unverified', email: 'unverified@example.com', emailVerified: false, name: 'Unverified' };
    const flow = await begin(); const rejected = await complete(flow); expect(rejected.headers.location).toContain('oauth=error');
    const replay = await complete(flow); expect(replay.headers.location).toContain('oauth=error');
    const [missing] = await db.select().from(users).where(eq(users.email, 'unverified@example.com')); expect(missing).toBeUndefined();
  });

  it('does not overwrite an e-mail already linked to a different Google subject', async () => {
    google.identity = { subject: 'different-google-subject', email: 'linked@example.com', emailVerified: true, name: 'Intruder' };
    const response = await complete(await begin()); expect(response.headers.location).toContain('oauth=error');
    const [linked] = await db.select().from(users).where(eq(users.email, 'linked@example.com')); expect(linked!.googleId).toBe('google-link');
  });

  it('handles provider cancellation without exchanging a code', async () => {
    const flow = await begin(); const exchanges = google.exchanges;
    const response = await app.inject({ method: 'GET', url: `/api/auth/google/callback?error=access_denied&state=${flow.state}`, headers: { cookie: flow.cookie } });
    expect(response.headers.location).toContain('oauth=cancelled'); expect(google.exchanges).toBe(exchanges);
  });

  it('keeps local 2FA in the Google login path', async () => {
    google.identity = { subject: 'google-2fa', email: 'twofactor@example.com', emailVerified: true, name: 'Two Factor' };
    await app.inject({ method: 'POST', url: '/api/auth/register', payload: { name: 'Two Factor', email: 'twofactor@example.com', password: 'Senha1234' } });
    const secret = generateTotpSecret(); await db.update(users).set({ googleId: 'google-2fa', twoFactorEnabled: true, twoFactorSecretEncrypted: encryptSecret(secret) }).where(eq(users.email, 'twofactor@example.com'));
    const callback = await complete(await begin()); expect(callback.headers.location).toContain('oauth=two_factor');
    const challengeCookie = cookie(callback, 'iwantit_oauth_2fa'); expect(challengeCookie).toBeTruthy();
    const verified = await app.inject({ method: 'POST', url: '/api/auth/google/2fa', headers: { cookie: challengeCookie }, payload: { code: generateTotp(secret).code } });
    expect(verified.statusCode).toBe(200); expect(cookie(verified, 'iwantit_session')).toBeTruthy();
  });
});

async function begin() {
  const response = await app.inject({ method: 'GET', url: '/api/auth/google' });
  const state = new URL(response.headers.location!).searchParams.get('state')!;
  return { state, cookie: cookie(response, 'iwantit_oauth_binding') };
}
async function complete(flow: { state: string; cookie: string }) { return app.inject({ method: 'GET', url: `/api/auth/google/callback?code=test-code&state=${flow.state}`, headers: { cookie: flow.cookie } }); }
function cookie(response: { headers: Record<string, string | string[] | number | undefined> }, name: string) { const header = response.headers['set-cookie']; const values = Array.isArray(header) ? header : [typeof header === 'string' ? header : undefined]; const value = values.find((item) => item?.startsWith(`${name}=`)); return value?.split(';')[0] ?? ''; }
