import { describe, expect, it, vi } from 'vitest';
import { MarketplaceProviderError } from '../marketplace-provider.js';
import { MercadoLivreProvider } from './mercado-livre.provider.js';

describe('MercadoLivreProvider', () => {
  it('normalizes complete and partial official results without inventing shipping', async () => {
    const http = vi.fn().mockResolvedValue(json({ results: [
      { id: 'MLB1', title: 'Celular 128 GB', permalink: 'https://produto.mercadolivre.com.br/MLB-1', secure_thumbnail: 'https://http2.mlstatic.com/a.jpg', price: 1000, seller: { nickname: 'LOJA' }, available_quantity: 2, shipping: { free_shipping: true }, attributes: [{ name: 'Armazenamento', value_name: '128 GB' }] },
      { id: 'MLB2', title: 'Celular sem frete conhecido', permalink: 'https://produto.mercadolivre.com.br/MLB-2', price: 900 },
      { id: 'MLB3', title: '', permalink: 'javascript:alert(1)', price: 1 },
    ] }));
    const provider = new MercadoLivreProvider('token', http, () => new Date('2026-08-29T12:00:00Z'));
    const offers = await provider.search({ query: 'celular', limit: 20 });
    expect(http).toHaveBeenCalledWith('https://api.mercadolibre.com/sites/MLB/search?q=celular&limit=20', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token' }), redirect: 'error' }));
    expect(offers).toHaveLength(2);
    expect(offers[0]).toEqual({ marketplace: 'mercado-livre', externalId: 'MLB1', title: 'Celular 128 GB', url: 'https://produto.mercadolivre.com.br/MLB-1', imageUrl: 'https://http2.mlstatic.com/a.jpg', seller: 'LOJA', price: '1000.00', shippingPrice: '0.00', totalPrice: '1000.00', availability: 'available', attributes: { Armazenamento: '128 GB' }, checkedAt: '2026-08-29T12:00:00.000Z' });
    expect(offers[1]).toMatchObject({ shippingPrice: null, totalPrice: null, availability: 'unknown' });
    expect(provider.takeDiscardedCount()).toBe(1);
  });
  it('is unavailable without an authorized token', async () => { const http = vi.fn(); const provider = new MercadoLivreProvider(undefined, http); expect(provider.info()).toMatchObject({ available: false, source: 'unavailable' }); expect(await provider.search({ query: 'x', limit: 1 })).toEqual([]); expect(http).not.toHaveBeenCalled(); });
  it.each([[429, 'rate_limited'], [401, 'external_error'], [503, 'external_error']] as const)('maps HTTP %s to %s', async (status, state) => { const headers = status === 429 ? { 'retry-after': '30' } : undefined; const provider = new MercadoLivreProvider('token', vi.fn().mockResolvedValue(new Response('{}', { status, headers }))); await expect(provider.search({ query: 'x', limit: 1 })).rejects.toMatchObject({ state, retryAfterSeconds: status === 429 ? 30 : null }); });
  it('maps timeout and malformed responses', async () => { const timeout = new MercadoLivreProvider('token', vi.fn().mockRejectedValue(new DOMException('timeout', 'TimeoutError'))); await expect(timeout.search({ query: 'x', limit: 1 })).rejects.toMatchObject({ state: 'timeout' }); const invalid = new MercadoLivreProvider('token', vi.fn().mockResolvedValue(new Response('not-json', { status: 200 }))); await expect(invalid.search({ query: 'x', limit: 1 })).rejects.toBeInstanceOf(MarketplaceProviderError); });
});
function json(value: unknown) { return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } }); }
