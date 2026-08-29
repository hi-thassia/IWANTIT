import type { MarketplaceProviderInfo, MarketplaceProviderResult, MarketplaceSlug } from '@iwantit/shared';
import type { MarketplaceProvider, MarketplaceSearchInput } from './marketplace-provider.js';
import { MarketplaceProviderError, providerResult } from './marketplace-provider.js';
import { MercadoLivreProvider } from './providers/mercado-livre.provider.js';
import { UnavailableMarketplaceProvider } from './providers/unavailable.provider.js';
import { env } from '../../config/env.js';

export class MarketplaceSearchService {
  private readonly providers: Map<MarketplaceSlug, MarketplaceProvider>;
  constructor(providers: MarketplaceProvider[] = defaultProviders()) { this.providers = new Map(providers.map((provider) => [provider.slug, provider])); }
  info(): MarketplaceProviderInfo[] { return [...this.providers.values()].map((provider) => provider.info()); }
  async search(input: MarketplaceSearchInput & { marketplaces: MarketplaceSlug[] }): Promise<MarketplaceProviderResult[]> {
    return Promise.all(input.marketplaces.map(async (slug) => {
      const provider = this.providers.get(slug)!; const info = provider.info();
      if (!info.available) return { marketplace: slug, marketplaceName: provider.name, state: 'unavailable', source: 'unavailable', message: info.message, offers: [], discardedResults: 0, retryAfterSeconds: null };
      try { const offers = await provider.search(input); const discarded = provider instanceof MercadoLivreProvider ? provider.takeDiscardedCount() : 0; return providerResult(provider, offers, discarded); }
      catch (cause) { const error = cause instanceof MarketplaceProviderError ? cause : new MarketplaceProviderError('external_error', 'Falha inesperada na integração.'); return { marketplace: slug, marketplaceName: provider.name, state: error.state, source: 'official_api', message: error.message, offers: [], discardedResults: 0, retryAfterSeconds: error.retryAfterSeconds }; }
    }));
  }
}

function defaultProviders(): MarketplaceProvider[] {
  return [new MercadoLivreProvider(env.MERCADO_LIVRE_ACCESS_TOKEN), new UnavailableMarketplaceProvider('shopee', 'Shopee', 'Busca indisponível: nenhuma API oficial/autorizada foi configurada para a Shopee.'), new UnavailableMarketplaceProvider('shein', 'SHEIN', 'Busca indisponível: nenhuma API oficial/autorizada foi configurada para a SHEIN.')];
}
