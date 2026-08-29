import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';

const apps: ReturnType<typeof buildApp>[] = [];
afterEach(async () => Promise.all(apps.map((app) => app.close())));

describe('health route', () => {
  it('reports the API status', async () => {
    const app = buildApp();
    apps.push(app);
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', service: 'iwantit-api' });
  });
});
