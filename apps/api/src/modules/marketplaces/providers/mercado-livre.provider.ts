import type { MarketplaceProviderInfo, NormalizedOffer } from '@iwantit/shared';
import { officialJson, type MarketplaceHttpClient } from '../official-json-client.js';
import type { MarketplaceProvider, MarketplaceSearchInput } from '../marketplace-provider.js';

type SearchItem = { id?: unknown; title?: unknown; permalink?: unknown; thumbnail?: unknown; secure_thumbnail?: unknown; price?: unknown; seller?: { nickname?: unknown }; available_quantity?: unknown; shipping?: { free_shipping?: unknown }; attributes?: Array<{ id?: unknown; name?: unknown; value_name?: unknown }> };
type SearchResponse = { results?: unknown[] };

export class MercadoLivreProvider implements MarketplaceProvider {
  readonly slug = 'mercado-livre' as const; readonly name = 'Mercado Livre';
  private discarded = 0;
  constructor(private readonly token: string | undefined, private readonly http: MarketplaceHttpClient = fetch, private readonly now: () => Date = () => new Date()) {}
  info(): MarketplaceProviderInfo { return { marketplace: this.slug, marketplaceName: this.name, source: this.token ? 'official_api' : 'unavailable', available: Boolean(this.token), message: this.token ? null : 'Configure MERCADO_LIVRE_ACCESS_TOKEN para habilitar buscas pela API oficial.' }; }
  async search(input: MarketplaceSearchInput) {
    if (!this.token) return [];
    this.discarded = 0;
    const params = new URLSearchParams({ q: input.query, limit: String(input.limit) });
    const payload = await officialJson<SearchResponse>(this.http, `https://api.mercadolibre.com/sites/MLB/search?${params}`, this.token);
    const checkedAt = this.now().toISOString(); const offers: NormalizedOffer[] = [];
    for (const raw of Array.isArray(payload.results) ? payload.results.slice(0, input.limit) : []) { const offer = normalize(raw as SearchItem, checkedAt); if (offer) offers.push(offer); else this.discarded++; }
    return offers;
  }
  takeDiscardedCount() { const value = this.discarded; this.discarded = 0; return value; }
}

function normalize(item: SearchItem, checkedAt: string): NormalizedOffer | null {
  if (typeof item.id !== 'string' || typeof item.title !== 'string' || !item.title.trim() || typeof item.permalink !== 'string' || !safeHttps(item.permalink) || typeof item.price !== 'number' || !Number.isFinite(item.price) || item.price < 0) return null;
  const freeShipping = item.shipping?.free_shipping === true; const price = item.price.toFixed(2);
  return { marketplace: 'mercado-livre', externalId: item.id, title: item.title.trim(), url: item.permalink, imageUrl: image(item), seller: typeof item.seller?.nickname === 'string' ? item.seller.nickname : null, price, shippingPrice: freeShipping ? '0.00' : null, totalPrice: freeShipping ? price : null, availability: typeof item.available_quantity === 'number' ? item.available_quantity > 0 ? 'available' : 'unavailable' : 'unknown', attributes: attributes(item.attributes), checkedAt };
}
function image(item: SearchItem) { for (const candidate of [item.secure_thumbnail, item.thumbnail]) if (typeof candidate === 'string' && safeHttps(candidate)) return candidate; return null; }
function attributes(values: SearchItem['attributes']) { const result: Record<string, string> = {}; for (const item of Array.isArray(values) ? values.slice(0, 100) : []) { if (typeof item.value_name !== 'string' || !item.value_name.trim()) continue; const key = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : typeof item.id === 'string' ? item.id : ''; if (key) result[key] = item.value_name.trim(); } return result; }
function safeHttps(value: string) { try { return new URL(value).protocol === 'https:'; } catch { return false; } }
