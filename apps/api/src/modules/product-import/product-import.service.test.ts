import { describe, expect, it, vi } from 'vitest';
import { AuthError } from '../auth/auth.errors.js';
import { ProductImportService } from './product-import.service.js';

describe('ProductImportService', () => {
  it('imports only real fields returned by the Mercado Livre official API', async () => {
    const http = vi.fn()
      .mockResolvedValueOnce(json({ id: 'MLB1234567890', title: 'Tênis Runner', price: 499.9, category_id: 'MLB123', seller_id: 42, pictures: [{ secure_url: 'https://http2.mlstatic.com/item.jpg' }], attributes: [{ id: 'BRAND', name: 'Marca', value_name: 'Acme' }, { id: 'COLOR', name: 'Cor', value_name: 'Branco' }], variations: [{ id: 7, attribute_combinations: [{ id: 'SIZE', name: 'Tamanho', value_name: '38' }] }] }))
      .mockResolvedValueOnce(json({ name: 'Calçados' }))
      .mockResolvedValueOnce(json({ nickname: 'LOJA_OFICIAL' }));
    const result = await new ProductImportService(http).import('https://produto.mercadolivre.com.br/MLB-1234567890-tenis-_JM');
    expect(result).toMatchObject({ status: 'imported', source: 'official_api', title: 'Tênis Runner', price: '499.90', brand: 'Acme', color: 'Branco', size: '38', category: 'Calçados', seller: 'LOJA_OFICIAL', imageUrl: 'https://http2.mlstatic.com/item.jpg' });
    expect(result.variations).toEqual([{ id: '7', attributes: { Tamanho: '38' } }]);
    expect(http.mock.calls.map(([url]) => url)).toEqual(['https://api.mercadolibre.com/items/MLB1234567890', 'https://api.mercadolibre.com/categories/MLB123', 'https://api.mercadolibre.com/users/42']);
  });

  it.each([
    'not a url', 'http://produto.mercadolivre.com.br/MLB-1234567890',
    'https://localhost/MLB-1234567890', 'https://mercadolivre.com.br.evil.example/MLB-1234567890',
    'https://user:secret@mercadolivre.com.br/MLB-1234567890', 'https://mercadolivre.com.br:444/MLB-1234567890',
  ])('rejects invalid or SSRF-oriented URL %s', async (url) => {
    const http = vi.fn();
    await expect(new ProductImportService(http).import(url)).rejects.toBeInstanceOf(AuthError);
    expect(http).not.toHaveBeenCalled();
  });

  it('rejects a Mercado Livre URL without a verifiable item id', async () => {
    await expect(new ProductImportService(vi.fn()).import('https://www.mercadolivre.com.br/produto-sem-id')).rejects.toMatchObject({ statusCode: 400 });
  });

  it.each([
    ['https://shopee.com.br/produto-i.123.456', 'shopee'],
    ['https://br.shein.com/item-p-123.html', 'shein'],
  ] as const)('recognizes %s without scraping or inventing data', async (url, marketplace) => {
    const http = vi.fn(); const result = await new ProductImportService(http).import(url);
    expect(result).toMatchObject({ marketplace, status: 'manual_required', source: 'unavailable', title: null, price: null, attributes: {} });
    expect(http).not.toHaveBeenCalled();
  });

  it('converts external failures and missing products into explicit errors', async () => {
    const unavailable = new ProductImportService(vi.fn().mockRejectedValue(new Error('timeout')));
    await expect(unavailable.import('https://produto.mercadolivre.com.br/MLB-1234567890-x')).rejects.toMatchObject({ statusCode: 502 });
    const missing = new ProductImportService(vi.fn().mockResolvedValue(new Response('{}', { status: 404 })));
    await expect(missing.import('https://produto.mercadolivre.com.br/MLB-1234567890-x')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('keeps optional enrichment empty when complementary calls fail', async () => {
    const http = vi.fn().mockResolvedValueOnce(json({ title: 'Produto real', price: 10, category_id: 'MLB1', seller_id: 2 })).mockResolvedValue(new Response('{}', { status: 503 }));
    const result = await new ProductImportService(http).import('https://mercadolivre.com.br/MLB-1234567890-x');
    expect(result).toMatchObject({ title: 'Produto real', category: null, seller: null, brand: null, imageUrl: null });
  });
});

function json(value: unknown) { return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } }); }
