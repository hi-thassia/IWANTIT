import type { MonitoredOfferView, PriceHistoryPoint, WishMonitoringView } from '@iwantit/shared';
import type { Offer, PriceHistory, Wish } from '../../database/schema/index.js';

type DetailedOffer = { offer: Offer; marketplaceName: string; marketplaceSlug: string };
type HistoryRow = { snapshot: PriceHistory; marketplaceName: string };

export function monitoringView(wish: Wish, offerRows: DetailedOffer[], historyRows: HistoryRow[]): WishMonitoringView {
  const offers = offerRows.map(({ offer, marketplaceName, marketplaceSlug }) => ({
    id: offer.id, marketplace: marketplaceSlug as MonitoredOfferView['marketplace'], marketplaceName, externalId: offer.externalId, title: offer.title, url: offer.url,
    imageUrl: offer.imageUrl, seller: offer.seller, price: offer.price, shippingPrice: offer.shippingPrice, totalPrice: offer.totalPrice,
    effectivePrice: offer.totalPrice ?? offer.price, availability: offer.availability, attributes: offer.attributes, checkedAt: offer.checkedAt.toISOString(), matchScore: offer.matchScore ?? '0.00',
  })).sort((left, right) => Number(left.effectivePrice) - Number(right.effectivePrice));
  const available = offers.filter(({ availability }) => availability !== 'unavailable'); const current = available[0] ?? null;
  const history = aggregateHistory(historyRows); const values = history.map(({ lowestPrice }) => Number(lowestPrice));
  return { wishId: wish.id, targetPrice: wish.targetPrice, initialPrice: wish.initialPrice, currentLowestPrice: current?.effectivePrice ?? null, currentLowestMarketplace: current?.marketplaceName ?? null, historicalLowestPrice: values.length ? Math.min(...values).toFixed(2) : null, historicalHighestPrice: values.length ? Math.max(...values).toFixed(2) : null, lastCheckedAt: wish.lastCheckedAt?.toISOString() ?? null, offers, history };
}

function aggregateHistory(rows: HistoryRow[]): PriceHistoryPoint[] {
  const byRun = new Map<string, number>();
  for (const { snapshot } of rows) { const key = snapshot.recordedAt.toISOString(); const value = Number(snapshot.totalPrice ?? snapshot.price); const current = byRun.get(key); if (current === undefined || value < current) byRun.set(key, value); }
  return [...byRun].map(([recordedAt, value]) => ({ recordedAt, lowestPrice: value.toFixed(2) })).sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
}
