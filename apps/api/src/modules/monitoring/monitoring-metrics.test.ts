import type { Offer, PriceHistory, Wish } from '../../database/schema/index.js';
import { describe, expect, it } from 'vitest';
import { monitoringView } from './monitoring-metrics.js';

describe('monitoringView', () => {
  it('calculates current, historical extrema and the lowest offer per monitoring cycle', () => {
    const wish = { id: 'wish', targetPrice: '450.00', initialPrice: '699.00', lastCheckedAt: new Date('2026-08-29T12:00:00Z') } as Wish;
    const base = { wishId: 'wish', marketplaceId: 'market', url: 'https://example.com', imageUrl: null, seller: null, attributes: {}, shippingPrice: null, matchScore: '90.00', availability: 'available', createdAt: new Date(), updatedAt: new Date() } as const;
    const first = { ...base, id: 'one', externalId: '1', title: 'Oferta 1', price: '489.00', totalPrice: null, checkedAt: new Date('2026-08-29T12:00:00Z') } as Offer;
    const second = { ...base, id: 'two', externalId: '2', title: 'Oferta 2', price: '480.00', shippingPrice: '20.00', totalPrice: '500.00', checkedAt: new Date('2026-08-29T12:00:00Z') } as Offer;
    const unavailable = { ...base, id: 'three', externalId: '3', title: 'Sem estoque', price: '100.00', totalPrice: '100.00', availability: 'unavailable', checkedAt: new Date('2026-08-29T12:00:00Z') } as Offer;
    const history = [snapshot('a', 'one', '599.00', '2026-08-28T12:00:00Z'), snapshot('b', 'two', '620.00', '2026-08-28T12:00:00Z'), snapshot('c', 'one', '489.00', '2026-08-29T12:00:00Z'), snapshot('d', 'two', '500.00', '2026-08-29T12:00:00Z')];
    const view = monitoringView(wish, [{ offer: first, marketplaceName: 'Mercado Livre', marketplaceSlug: 'mercado-livre' }, { offer: second, marketplaceName: 'Mercado Livre', marketplaceSlug: 'mercado-livre' }, { offer: unavailable, marketplaceName: 'Mercado Livre', marketplaceSlug: 'mercado-livre' }], history.map((item) => ({ snapshot: item, marketplaceName: 'Mercado Livre' })));
    expect(view).toMatchObject({ currentLowestPrice: '489.00', historicalLowestPrice: '489.00', historicalHighestPrice: '599.00', initialPrice: '699.00', targetPrice: '450.00' });
    expect(view.history).toEqual([{ recordedAt: '2026-08-28T12:00:00.000Z', lowestPrice: '599.00' }, { recordedAt: '2026-08-29T12:00:00.000Z', lowestPrice: '489.00' }]);
  });
});
function snapshot(id: string, offerId: string, price: string, date: string) { return { id, offerId, price, shippingPrice: null, totalPrice: price, recordedAt: new Date(date) } as PriceHistory; }
