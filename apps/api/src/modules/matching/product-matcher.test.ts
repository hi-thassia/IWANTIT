import type { NormalizedOffer, ProductMatchWish } from '@iwantit/shared';
import { describe, expect, it } from 'vitest';
import { ProductMatcher } from './product-matcher.js';

const matcher = new ProductMatcher();
const baseWish: ProductMatchWish = { name: 'Apple iPhone 15', category: 'Celulares e Smartphones', brand: 'Apple', color: 'Preto', size: null, capacity: '128 GB', model: 'iPhone 15', exactMatchOnly: true, referenceUrl: null, referenceImage: null };

describe('ProductMatcher', () => {
  it('accepts the same exact product and produces high confidence', () => {
    const match = matcher.match(baseWish, offer('Apple iPhone 15 128 GB Preto', { Marca: 'Apple', Modelo: 'iPhone 15', Armazenamento: '128 GB', Cor: 'Preto' }));
    expect(match).toMatchObject({ accepted: true, classification: 'exact' });
    expect(match.matchScore).toBeGreaterThanOrEqual(85);
    expect(match.evidence).toMatchObject({ brand: 'match', model: 'match', capacity: 'match', color: 'match' });
  });

  it('rejects 256 GB when the wish requires 128 GB even if every other field matches', () => {
    const match = matcher.match(baseWish, offer('Apple iPhone 15 256 GB Preto', { Marca: 'Apple', Modelo: 'iPhone 15', Armazenamento: '256 GB', Cor: 'Preto' }));
    expect(match).toMatchObject({ accepted: false, matchScore: 0, classification: 'rejected' });
    expect(match.reasons).toContain('A capacidade da oferta é diferente da desejada.');
  });

  it.each([['36', '38'], ['P', 'G']])('rejects size %s versus %s', (wanted, found) => {
    const wish = { ...baseWish, name: 'Tênis esportivo', brand: null, color: null, capacity: null, model: null, size: wanted };
    const match = matcher.match(wish, offer('Tênis esportivo', { Tamanho: found }));
    expect(match.accepted).toBe(false); expect(match.reasons).toContain('O tamanho da oferta é diferente do desejado.');
  });

  it('rejects a conflicting selected color', () => {
    const match = matcher.match(baseWish, offer('Apple iPhone 15 128 GB Azul', { Marca: 'Apple', Modelo: 'iPhone 15', Armazenamento: '128 GB', Cor: 'Azul' }));
    expect(match.accepted).toBe(false); expect(match.evidence.color).toBe('mismatch');
  });

  it('does not call a different model exact', () => {
    const wish = { ...baseWish, name: 'Samsung Galaxy A54', brand: 'Samsung', color: null, capacity: null, model: 'Galaxy A54' };
    const match = matcher.match(wish, offer('Samsung Galaxy A55', { Marca: 'Samsung', Modelo: 'Galaxy A55' }));
    expect(match.accepted).toBe(false); expect(match.reasons).toContain('O modelo da oferta é diferente do produto exato.');
  });

  it('can classify a model alternative as similar only when the user permits it', () => {
    const wish = { ...baseWish, name: 'Samsung Galaxy A54', brand: 'Samsung', color: null, capacity: null, model: 'Galaxy A54', exactMatchOnly: false };
    const match = matcher.match(wish, offer('Samsung Galaxy A55', { Marca: 'Samsung', Modelo: 'Galaxy A55' }));
    expect(match).toMatchObject({ accepted: true, classification: 'similar' });
    expect(match.matchScore).toBeGreaterThanOrEqual(62);
  });

  it('rejects a clearly unrelated offer', () => {
    const match = matcher.match(baseWish, offer('Fritadeira elétrica sem óleo 5 litros', { Marca: 'Kitchen' }));
    expect(match).toMatchObject({ accepted: false, classification: 'rejected', matchScore: 0 });
  });

  it('requires a critical variant to be present for exact matching', () => {
    const match = matcher.match(baseWish, offer('Apple iPhone 15 Preto', { Marca: 'Apple', Modelo: 'iPhone 15', Cor: 'Preto' }));
    expect(match.accepted).toBe(false); expect(match.reasons).toContain('A oferta não informa a capacidade necessária para confirmar o produto exato.');
  });

  it('uses matching identifiers and identical image only as positive evidence', () => {
    const wish = { ...baseWish, capacity: null, color: null, referenceUrl: 'https://produto.mercadolivre.com.br/MLB-1234567890-x', referenceImage: 'https://http2.mlstatic.com/a.jpg' };
    const match = matcher.match(wish, { ...offer('Apple iPhone 15', { Marca: 'Apple', Modelo: 'iPhone 15' }), externalId: 'MLB1234567890', imageUrl: 'https://http2.mlstatic.com/a.jpg' });
    expect(match.accepted).toBe(true); expect(match.evidence).toMatchObject({ identifierMatch: true, imageMatch: true });
  });

  it('matches a batch without filtering rejected offers or persisting anything', () => {
    const matches = matcher.matchMany(baseWish, [offer('Apple iPhone 15 128 GB Preto', { Marca: 'Apple', Modelo: 'iPhone 15', Armazenamento: '128 GB', Cor: 'Preto' }), offer('Liquidificador', {})]);
    expect(matches).toHaveLength(2); expect(matches.map(({ match }) => match.accepted)).toEqual([true, false]);
  });
});

function offer(title: string, attributes: Record<string, string>): NormalizedOffer { return { marketplace: 'mercado-livre', externalId: 'MLB1', title, url: 'https://produto.mercadolivre.com.br/MLB-1', imageUrl: null, seller: null, price: '100.00', shippingPrice: null, totalPrice: null, availability: 'available', attributes, checkedAt: '2026-08-29T12:00:00.000Z' }; }
