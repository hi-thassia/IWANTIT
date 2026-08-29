import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import type { Database } from '../../database/client.js';
import * as schema from '../../database/schema/index.js';
import { authEvents, users } from '../../database/schema/index.js';

const client = new PGlite();
const pgliteDb = drizzle(client, { schema });
const db = pgliteDb as unknown as Database;
const app = buildApp({ db });
let cookie = '';

beforeAll(async () => {
  await migrate(pgliteDb, { migrationsFolder: fileURLToPath(new URL('../../../drizzle', import.meta.url)) });
  await app.ready();
  const register = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { name: 'Lia Costa', email: 'lia@example.com', password: 'segura123' } });
  cookie = cookieHeader(register.headers['set-cookie']);
});

afterAll(async () => { await app.close(); await client.close(); });

describe('onboarding persistence', () => {
  it('starts as incomplete and requires an authenticated session', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/auth/session', headers: { cookie } })).json().user.onboardingCompleted).toBe(false);
    expect((await app.inject({ method: 'POST', url: '/api/onboarding/complete' })).statusCode).toBe(401);
  });

  it('persists completion and remains idempotent', async () => {
    expect((await app.inject({ method: 'POST', url: '/api/onboarding/complete', headers: { cookie } })).statusCode).toBe(200);
    const [completed] = await db.select().from(users).where(eq(users.email, 'lia@example.com'));
    expect(completed!.onboardingCompletedAt).toBeInstanceOf(Date);
    expect((await app.inject({ method: 'GET', url: '/api/auth/session', headers: { cookie } })).json().user.onboardingCompleted).toBe(true);

    expect((await app.inject({ method: 'POST', url: '/api/onboarding/complete', headers: { cookie } })).statusCode).toBe(200);
    const [again] = await db.select().from(users).where(eq(users.email, 'lia@example.com'));
    expect(again!.onboardingCompletedAt?.getTime()).toBe(completed!.onboardingCompletedAt?.getTime());
    const events = await db.select().from(authEvents).where(eq(authEvents.type, 'onboarding_completed'));
    expect(events).toHaveLength(1);
  });
});

function cookieHeader(value: string | string[] | undefined) {
  const header = Array.isArray(value) ? value[0] : value;
  if (!header) throw new Error('Expected a Set-Cookie header');
  return header.split(';')[0]!;
}
