import { describe, expect, it } from 'vitest';
import type { MarketplaceProvider } from './marketplace-provider.js';
import { MarketplaceSearchService } from './marketplace-search.service.js';
import { UnavailableMarketplaceProvider } from './providers/unavailable.provider.js';

describe('MarketplaceSearchService', () => {
  it('isolates providers and reports unavailable integrations honestly', async () => {
    const available: MarketplaceProvider = { slug: 'mercado-livre', name: 'Mercado Livre', info: () => ({ marketplace: 'mercado-livre', marketplaceName: 'Mercado Livre', source: 'official_api', available: true, message: null }), search: async () => [] };
    const service = new MarketplaceSearchService([available, new UnavailableMarketplaceProvider('shopee', 'Shopee', 'Sem API autorizada.'), new UnavailableMarketplaceProvider('shein', 'SHEIN', 'Sem API autorizada.')]);
    const results = await service.search({ query: 'tênis', limit: 10, marketplaces: ['mercado-livre', 'shopee', 'shein'] });
    expect(results.map(({ state }) => state)).toEqual(['ok', 'unavailable', 'unavailable']);
    expect(results[1]).toMatchObject({ offers: [], source: 'unavailable', message: 'Sem API autorizada.' });
  });
});
