import { and, desc, eq, inArray, isNull, lt, or } from 'drizzle-orm';
import type { Database } from '../client.js';
import { marketplaces, type NewWish, wishes, wishMarketplaces } from '../schema/index.js';

export class WishRepository {
  constructor(private readonly db: Database) {}

  async create(input: NewWish, marketplaceIds: string[]) {
    return this.db.transaction(async (tx) => {
      const [wish] = await tx.insert(wishes).values(input).returning();
      if (!wish) throw new Error('Wish insert did not return a row');
      if (marketplaceIds.length) {
        await tx.insert(wishMarketplaces).values([...new Set(marketplaceIds)].map((marketplaceId) => ({ wishId: wish.id, marketplaceId })));
      }
      return wish;
    });
  }

  async findByUser(userId: string) {
    return this.db.select().from(wishes).where(eq(wishes.userId, userId)).orderBy(desc(wishes.createdAt));
  }

  async findOwnedById(id: string, userId: string) {
    const [wish] = await this.db.select().from(wishes).where(and(eq(wishes.id, id), eq(wishes.userId, userId))).limit(1);
    return wish ?? null;
  }

  async marketplaces() { return this.db.select().from(marketplaces).where(eq(marketplaces.enabled, true)).orderBy(marketplaces.name); }
  async marketplaceIdsForWish(wishId: string) { return this.db.select().from(wishMarketplaces).where(eq(wishMarketplaces.wishId, wishId)); }
  async marketplacesForWish(wishId: string) { return this.db.select({ id: marketplaces.id, name: marketplaces.name, slug: marketplaces.slug }).from(wishMarketplaces).innerJoin(marketplaces, eq(wishMarketplaces.marketplaceId, marketplaces.id)).where(and(eq(wishMarketplaces.wishId, wishId), eq(marketplaces.enabled, true))); }
  async validMarketplaceIds(ids: string[]) { if (!ids.length) return []; return this.db.select({ id: marketplaces.id }).from(marketplaces).where(and(inArray(marketplaces.id, ids), eq(marketplaces.enabled, true))); }

  async update(id: string, userId: string, input: Partial<NewWish>, marketplaceIds: string[]) {
    return this.db.transaction(async (tx) => {
      const [wish] = await tx.update(wishes).set({ ...input, updatedAt: new Date() }).where(and(eq(wishes.id, id), eq(wishes.userId, userId))).returning();
      if (!wish) return null;
      await tx.delete(wishMarketplaces).where(eq(wishMarketplaces.wishId, id));
      if (marketplaceIds.length) await tx.insert(wishMarketplaces).values([...new Set(marketplaceIds)].map((marketplaceId) => ({ wishId: id, marketplaceId })));
      return wish;
    });
  }

  async setStatus(id: string, userId: string, status: 'active' | 'paused') {
    const [wish] = await this.db.update(wishes).set({ status, updatedAt: new Date() }).where(and(eq(wishes.id, id), eq(wishes.userId, userId))).returning(); return wish ?? null;
  }
  async delete(id: string, userId: string) { const rows = await this.db.delete(wishes).where(and(eq(wishes.id, id), eq(wishes.userId, userId))).returning({ id: wishes.id }); return Boolean(rows[0]); }
  async dueActiveIds(dueBefore: Date, staleBefore: Date, limit: number) { return this.db.select({ id: wishes.id }).from(wishes).where(and(eq(wishes.status, 'active'), or(isNull(wishes.lastCheckedAt), lt(wishes.lastCheckedAt, dueBefore)), or(isNull(wishes.monitoringStartedAt), lt(wishes.monitoringStartedAt, staleBefore)))).orderBy(wishes.lastCheckedAt).limit(limit); }
  async claimMonitoring(id: string, now: Date, dueBefore: Date, staleBefore: Date) { const [wish] = await this.db.update(wishes).set({ monitoringStartedAt: now }).where(and(eq(wishes.id, id), eq(wishes.status, 'active'), or(isNull(wishes.lastCheckedAt), lt(wishes.lastCheckedAt, dueBefore)), or(isNull(wishes.monitoringStartedAt), lt(wishes.monitoringStartedAt, staleBefore)))).returning(); return wish ?? null; }
  async finishMonitoring(id: string, checkedAt: Date) { await this.db.update(wishes).set({ lastCheckedAt: checkedAt, monitoringStartedAt: null }).where(eq(wishes.id, id)); }
  async releaseMonitoring(id: string) { await this.db.update(wishes).set({ monitoringStartedAt: null }).where(eq(wishes.id, id)); }
}
