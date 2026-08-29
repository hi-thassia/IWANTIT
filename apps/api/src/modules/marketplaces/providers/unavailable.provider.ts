import type { MarketplaceProviderInfo, MarketplaceSlug } from '@iwantit/shared';
import type { MarketplaceProvider } from '../marketplace-provider.js';

export class UnavailableMarketplaceProvider implements MarketplaceProvider {
  constructor(readonly slug: MarketplaceSlug, readonly name: string, private readonly reason: string) {}
  info(): MarketplaceProviderInfo { return { marketplace: this.slug, marketplaceName: this.name, source: 'unavailable', available: false, message: this.reason }; }
  async search() { return []; }
}
