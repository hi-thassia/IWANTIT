import type { MarketplaceProviderInfo, MarketplaceProviderResult, MarketplaceSlug, NormalizedOffer } from '@iwantit/shared';

export type MarketplaceSearchInput = { query: string; limit: number };

export interface MarketplaceProvider {
  readonly slug: MarketplaceSlug;
  readonly name: string;
  info(): MarketplaceProviderInfo;
  search(input: MarketplaceSearchInput): Promise<NormalizedOffer[]>;
}

export class MarketplaceProviderError extends Error {
  constructor(public readonly state: 'timeout' | 'rate_limited' | 'external_error', message: string, public readonly retryAfterSeconds: number | null = null) { super(message); }
}

export function providerResult(provider: MarketplaceProvider, offers: NormalizedOffer[], discardedResults = 0): MarketplaceProviderResult {
  return { marketplace: provider.slug, marketplaceName: provider.name, state: 'ok', source: 'official_api', message: discardedResults ? `${discardedResults} resultado(s) incompleto(s) foram descartados.` : null, offers, discardedResults, retryAfterSeconds: null };
}
