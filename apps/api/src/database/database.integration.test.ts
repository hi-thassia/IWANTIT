import { PGlite } from '@electric-sql/pglite';
import { count, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from './client.js';
import { OfferRepository, UserRepository, WishRepository } from './repositories/index.js';
import { marketplaces, notificationPreferences, offers, priceHistory, users, wishes } from './schema/index.js';
import * as schema from './schema/index.js';

const client = new PGlite();
const testDb = drizzle(client, { schema });
const db = testDb as unknown as Database;
const usersRepository = new UserRepository(db);
const wishesRepository = new WishRepository(db);
const offersRepository = new OfferRepository(db);

beforeAll(async () => {
  const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));
  await migrate(testDb, { migrationsFolder });
});

afterAll(async () => client.close());

describe('database schema and repositories', () => {
  it('applies migrations and installs canonical marketplaces', async () => {
    const rows = await db.select().from(marketplaces);
    expect(rows.map(({ slug }) => slug).sort()).toEqual(['mercado-livre', 'shein', 'shopee']);
  });

  it('persists the complete user → wish → offer → history graph', async () => {
    const user = await usersRepository.create({
      name: 'Pessoa Teste',
      email: 'PESSOA@EXAMPLE.COM',
      passwordHash: 'argon2id:test-only-hash',
    });
    const [preferences] = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, user.id));
    expect(preferences).toMatchObject({ priceTargetAlert: true, stockAlert: true });
    expect(user.email).toBe('pessoa@example.com');

    const [marketplace] = await db.select().from(marketplaces).where(eq(marketplaces.slug, 'mercado-livre'));
    expect(marketplace).toBeDefined();
    const wish = await wishesRepository.create({
      userId: user.id,
      name: 'Tênis branco',
      category: 'Calçados',
      targetPrice: '450.00',
      initialPrice: '699.00',
    }, [marketplace!.id]);

    const offer = await offersRepository.createWithPriceSnapshot({
      wishId: wish.id,
      marketplaceId: marketplace!.id,
      externalId: 'MLB-123',
      title: 'Tênis branco tamanho 36',
      url: 'https://example.com/offers/MLB-123',
      price: '480.00',
      shippingPrice: '10.00',
      totalPrice: '490.00',
      availability: 'available',
      matchScore: '94.00',
    });

    const history = await db.select().from(priceHistory).where(eq(priceHistory.offerId, offer.id));
    expect(await wishesRepository.findOwnedById(wish.id, user.id)).toMatchObject({ name: 'Tênis branco' });
    expect(await offersRepository.findByWish(wish.id)).toHaveLength(1);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ totalPrice: '490.00' });
  });

  it('enforces uniqueness and monetary constraints', async () => {
    await expect(usersRepository.create({
      name: 'Duplicada',
      email: 'pessoa@example.com',
      passwordHash: 'argon2id:test-only-hash',
    })).rejects.toThrow();

    const [user] = await db.select().from(users).where(eq(users.email, 'pessoa@example.com'));
    await expect(db.insert(wishes).values({
      userId: user!.id,
      name: 'Preço inválido',
      category: 'Teste',
      targetPrice: '-1.00',
    })).rejects.toThrow();
  });

  it('cascades ownership deletion through wishes, offers and history', async () => {
    const [user] = await db.select().from(users).where(eq(users.email, 'pessoa@example.com'));
    await db.delete(users).where(eq(users.id, user!.id));

    const [wishCount] = await db.select({ value: count() }).from(wishes);
    const [offerCount] = await db.select({ value: count() }).from(offers);
    const [historyCount] = await db.select({ value: count() }).from(priceHistory);
    expect([wishCount!.value, offerCount!.value, historyCount!.value]).toEqual([0, 0, 0]);
  });
});
