import type { MarketplaceProviderResult, MarketplaceSlug, MonitoringRunResult, ProductMatchWish } from '@iwantit/shared';
import type { Database } from '../../database/client.js';
import { OfferRepository } from '../../database/repositories/offer-repository.js';
import { WishRepository } from '../../database/repositories/wish-repository.js';
import type { AuthService } from '../auth/auth.service.js';
import { AuthError } from '../auth/auth.errors.js';
import { MarketplaceSearchService } from '../marketplaces/marketplace-search.service.js';
import { ProductMatcher } from '../matching/product-matcher.js';
import { monitoringView } from './monitoring-metrics.js';
import type { AlertService } from '../alerts/alert.service.js';
import type { AvailabilityTransition } from '../alerts/alert-engine.js';

export class MonitoringService {
  private readonly wishes: WishRepository; private readonly offers: OfferRepository;
  constructor(db: Database, private readonly auth: AuthService, private readonly search: MarketplaceSearchService, private readonly matcher = new ProductMatcher(), private readonly intervalMinutes = 30, private readonly now: () => Date = () => new Date(), private readonly alerts?: AlertService) { this.wishes = new WishRepository(db); this.offers = new OfferRepository(db); }

  async viewOwned(token: string | undefined, id: string) { const user = await this.auth.authenticate(token); const wish = await this.wishes.findOwnedById(id, user.id); if (!wish) throw new AuthError(404, 'Desejo não encontrado.'); return monitoringView(wish, await this.offers.findDetailedByWish(id), await this.offers.historyByWish(id)); }
  async runOwned(token: string | undefined, id: string) { const user = await this.auth.authenticate(token); if (!await this.wishes.findOwnedById(id, user.id)) throw new AuthError(404, 'Desejo não encontrado.'); return this.runWish(id); }
  async runDue(limit = 50) { const now = this.now(); const due = await this.wishes.dueActiveIds(this.dueBefore(now), this.staleBefore(now), limit); const results: MonitoringRunResult[] = []; let cursor = 0; await Promise.all(Array.from({ length: Math.min(3, due.length) }, async () => { while (cursor < due.length) { const item = due[cursor++]; if (item) results.push(await this.runWish(item.id)); } })); return results; }

  async runWish(id: string): Promise<MonitoringRunResult> {
    const checkedAt = this.now(); const wish = await this.wishes.claimMonitoring(id, checkedAt, this.dueBefore(checkedAt), this.staleBefore(checkedAt));
    if (!wish) return { wishId: id, state: 'skipped', checkedAt: null, acceptedOffers: 0, providerStates: [] };
    try {
      const beforeOfferRows = await this.offers.findDetailedByWish(id); const before = monitoringView(wish, beforeOfferRows, await this.offers.historyByWish(id));
      const selected = await this.wishes.marketplacesForWish(id); const slugs = selected.map(({ slug }) => slug).filter(isSlug);
      const providerStates = slugs.length ? await this.search.search({ query: [wish.name, wish.brand].filter(Boolean).join(' '), limit: 30, marketplaces: slugs }) : [];
      let acceptedOffers = 0; const marketplaceIds = new Map(selected.map(({ slug, id: marketplaceId }) => [slug, marketplaceId]));
      for (const provider of providerStates) for (const offer of provider.offers) { const match = this.matcher.match(toMatchWish(wish), offer); if (!match.accepted) continue; const marketplaceId = marketplaceIds.get(offer.marketplace); if (!marketplaceId) continue; await this.offers.saveObservation({ wishId: wish.id, marketplaceId, externalId: offer.externalId, title: offer.title, url: offer.url, imageUrl: offer.imageUrl, seller: offer.seller, attributes: offer.attributes, price: offer.price, shippingPrice: offer.shippingPrice, totalPrice: offer.totalPrice, availability: offer.availability, matchScore: match.matchScore.toFixed(2), checkedAt }); acceptedOffers++; }
      const afterOfferRows = await this.offers.findDetailedByWish(id); const afterWish = { ...wish, lastCheckedAt: checkedAt }; const after = monitoringView(afterWish, afterOfferRows, await this.offers.historyByWish(id));
      if (this.alerts) await this.alerts.processMonitoring(wish, before, after, availabilityTransitions(beforeOfferRows, afterOfferRows), checkedAt);
      await this.wishes.finishMonitoring(id, checkedAt);
      return { wishId: id, state: 'completed', checkedAt: checkedAt.toISOString(), acceptedOffers, providerStates: summarizeProviders(providerStates) };
    } catch (error) { await this.wishes.releaseMonitoring(id); throw error; }
  }
  private dueBefore(now: Date) { return new Date(now.getTime() - this.intervalMinutes * 60_000); }
  private staleBefore(now: Date) { return new Date(now.getTime() - 15 * 60_000); }
}

function toMatchWish(wish: { name: string; category: string; brand: string | null; color: string | null; size: string | null; exactMatchOnly: boolean; referenceUrl: string | null; referenceImage: string | null }): ProductMatchWish { return wish; }
function isSlug(value: string): value is MarketplaceSlug { return ['mercado-livre', 'shopee', 'shein'].includes(value); }
function summarizeProviders(results: MarketplaceProviderResult[]) { return results.map((result) => ({ ...result, offers: [] })); }
function availabilityTransitions(before: Awaited<ReturnType<OfferRepository['findDetailedByWish']>>, after: Awaited<ReturnType<OfferRepository['findDetailedByWish']>>): AvailabilityTransition[] { const previous = new Map(before.map(({ offer, marketplaceSlug }) => [`${marketplaceSlug}:${offer.externalId}`, offer.availability])); return after.map(({ offer, marketplaceName, marketplaceSlug }) => ({ offerId: offer.id, offerUrl: offer.url, marketplaceName, previous: previous.get(`${marketplaceSlug}:${offer.externalId}`) ?? null, current: offer.availability, price: offer.totalPrice ?? offer.price })); }
