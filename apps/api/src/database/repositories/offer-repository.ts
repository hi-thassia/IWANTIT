import { and, asc, eq } from 'drizzle-orm';
import type { Database } from '../client.js';
import { marketplaces, type NewOffer, type NewPriceHistory, offers, priceHistory } from '../schema/index.js';

export class OfferRepository {
  constructor(private readonly db: Database) {}

  async createWithPriceSnapshot(offerInput: NewOffer) {
    return this.db.transaction(async (tx) => {
      const [offer] = await tx.insert(offers).values(offerInput).returning();
      if (!offer) throw new Error('Offer insert did not return a row');
      await tx.insert(priceHistory).values({
        offerId: offer.id,
        price: offer.price,
        shippingPrice: offer.shippingPrice,
        totalPrice: offer.totalPrice,
        recordedAt: offer.checkedAt,
      });
      return offer;
    });
  }

  async addPriceSnapshot(input: NewPriceHistory) {
    const [snapshot] = await this.db.insert(priceHistory).values(input).returning();
    return snapshot;
  }

  async findByWish(wishId: string) {
    return this.db.select().from(offers).where(eq(offers.wishId, wishId)).orderBy(asc(offers.totalPrice));
  }

  async saveObservation(input: NewOffer) {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx.select().from(offers).where(and(eq(offers.wishId, input.wishId), eq(offers.marketplaceId, input.marketplaceId), eq(offers.externalId, input.externalId))).limit(1);
      if (!existing) {
        const [created] = await tx.insert(offers).values(input).returning(); if (!created) throw new Error('Offer insert did not return a row');
        await tx.insert(priceHistory).values({ offerId: created.id, price: created.price, shippingPrice: created.shippingPrice, totalPrice: created.totalPrice, recordedAt: created.checkedAt });
        return { offer: created, snapshotCreated: true };
      }
      const [updated] = await tx.update(offers).set({ ...input, updatedAt: input.checkedAt ?? new Date() }).where(eq(offers.id, existing.id)).returning(); if (!updated) throw new Error('Offer update did not return a row');
      await tx.insert(priceHistory).values({ offerId: updated.id, price: updated.price, shippingPrice: updated.shippingPrice, totalPrice: updated.totalPrice, recordedAt: updated.checkedAt });
      return { offer: updated, snapshotCreated: true };
    });
  }

  async findDetailedByWish(wishId: string) { return this.db.select({ offer: offers, marketplaceName: marketplaces.name, marketplaceSlug: marketplaces.slug }).from(offers).innerJoin(marketplaces, eq(offers.marketplaceId, marketplaces.id)).where(eq(offers.wishId, wishId)); }
  async historyByWish(wishId: string) { return this.db.select({ snapshot: priceHistory, marketplaceName: marketplaces.name }).from(priceHistory).innerJoin(offers, eq(priceHistory.offerId, offers.id)).innerJoin(marketplaces, eq(offers.marketplaceId, marketplaces.id)).where(eq(offers.wishId, wishId)).orderBy(asc(priceHistory.recordedAt)); }
}
