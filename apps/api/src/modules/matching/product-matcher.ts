import type { NormalizedOffer, ProductMatchResult, ProductMatchWish } from '@iwantit/shared';

const stopWords = new Set(['a', 'as', 'com', 'da', 'das', 'de', 'do', 'dos', 'e', 'em', 'kit', 'o', 'os', 'para', 'produto', 'sem']);
const colorWords = ['amarelo', 'azul', 'bege', 'branco', 'cinza', 'dourado', 'laranja', 'marrom', 'prata', 'preto', 'rosa', 'roxo', 'verde', 'vermelho'];
const variantKeys = {
  brand: ['brand', 'marca'], model: ['model', 'modelo'], size: ['size', 'tamanho', 'tamanho do calcado', 'numero', 'numeracao'],
  color: ['color', 'cor', 'cor principal'], capacity: ['capacity', 'capacidade', 'armazenamento', 'memoria interna'],
};

export class ProductMatcher {
  match(wish: ProductMatchWish, offer: NormalizedOffer): ProductMatchResult {
    const reasons: string[] = []; const hardConflicts: string[] = [];
    const wishText = normalize(wish.name); const offerText = normalize(offer.title); const titleSimilarity = similarity(tokens(wishText), tokens(offerText));
    const wishAttributes = normalizedAttributes(wish.attributes ?? {}); const offerAttributes = normalizedAttributes(offer.attributes);

    const brand = compare(single(wish.brand) ?? pick(wishAttributes, variantKeys.brand), pick(offerAttributes, variantKeys.brand) ?? containedValue(wish.brand, offerText));
    const category = compareBySimilarity(wish.category, pick(offerAttributes, ['categoria', 'category']));
    const wishModel = single(wish.model) ?? pick(wishAttributes, variantKeys.model); const offerModel = pick(offerAttributes, variantKeys.model);
    let model = compare(wishModel, offerModel);
    if (model === 'unknown') model = numericModelComparison(wish, offer);
    const wishSizes = values(single(wish.size) ?? pick(wishAttributes, variantKeys.size)); const offerSizes = values(pick(offerAttributes, variantKeys.size) ?? titleVariant(offerText, /(?:tam(?:anho)?|num(?:ero|eracao)?)\s*([a-z]{1,3}|\d{1,3}(?:[.,]\d)?)/));
    const size = compareSets(wishSizes, offerSizes);
    const wishCapacities = capacities([wish.capacity, pick(wishAttributes, variantKeys.capacity), wish.name]); const offerCapacities = capacities([pick(offerAttributes, variantKeys.capacity), offer.title]);
    const capacity = compareSets(wishCapacities, offerCapacities);
    const wishColors = colors([wish.color, pick(wishAttributes, variantKeys.color), wish.name]); const offerColors = colors([pick(offerAttributes, variantKeys.color), offer.title]);
    const color = compareSets(wishColors, offerColors);
    const identifierMatch = identifiers(wish).has(normalizeIdentifier(offer.externalId));
    const imageMatch = Boolean(wish.referenceImage && offer.imageUrl && wish.referenceImage === offer.imageUrl);

    if (capacity === 'mismatch') hardConflicts.push('A capacidade da oferta é diferente da desejada.');
    if (size === 'mismatch') hardConflicts.push('O tamanho da oferta é diferente do desejado.');
    if (color === 'mismatch') hardConflicts.push('A cor da oferta é diferente da desejada.');
    if (wish.exactMatchOnly && model === 'mismatch') hardConflicts.push('O modelo da oferta é diferente do produto exato.');
    if (wish.exactMatchOnly && brand === 'mismatch') hardConflicts.push('A marca da oferta é diferente do produto exato.');
    if (wish.exactMatchOnly && wishSizes.size && size === 'unknown') hardConflicts.push('A oferta não informa o tamanho necessário para confirmar o produto exato.');
    if (wish.exactMatchOnly && wishCapacities.size && capacity === 'unknown') hardConflicts.push('A oferta não informa a capacidade necessária para confirmar o produto exato.');
    if (wish.exactMatchOnly && wishColors.size && color === 'unknown') hardConflicts.push('A oferta não informa a cor necessária para confirmar o produto exato.');
    if (!identifierMatch && titleSimilarity < (wish.exactMatchOnly ? 0.55 : 0.35)) hardConflicts.push('Título insuficientemente relacionado ao produto desejado.');
    if (hardConflicts.length) return result(false, 0, 'rejected', hardConflicts, evidence());

    let score = titleSimilarity * 50;
    score += wish.brand ? points(brand, 15, 2) : 10;
    score += category === 'match' ? 10 : category === 'unknown' ? 5 : 0;
    const specifiedVariants = [[wishSizes, size], [wishColors, color], [wishCapacities, capacity]] as const;
    const activeVariants = specifiedVariants.filter(([expected]) => expected.size);
    score += activeVariants.length ? activeVariants.reduce((sum, [, state]) => sum + points(state, 20 / activeVariants.length, 20 / activeVariants.length * 0.25), 0) : 20;
    score += wishModel ? points(model, 5, 0) : 5;
    if (identifierMatch) score += 5;
    else if (imageMatch) score += 3;
    score = Math.max(0, Math.min(100, Math.round(score * 100) / 100));

    if (brand === 'match') reasons.push('Marca compatível.'); else if (brand === 'mismatch') reasons.push('Marca diferente; permitido apenas como produto semelhante.');
    if (model === 'match') reasons.push('Modelo compatível.'); else if (model === 'mismatch') reasons.push('Modelo diferente; a oferta não é considerada exata.');
    if (size === 'match') reasons.push('Tamanho compatível.'); if (color === 'match') reasons.push('Cor compatível.'); if (capacity === 'match') reasons.push('Capacidade compatível.');
    if (identifierMatch) reasons.push('Identificador do anúncio coincide com a referência.'); if (imageMatch) reasons.push('A mesma imagem de referência foi encontrada.');
    const exact = titleSimilarity >= 0.75 && brand !== 'mismatch' && model !== 'mismatch' && [size, color, capacity].every((state) => state !== 'mismatch');
    const threshold = wish.exactMatchOnly ? 82 : 62; const accepted = score >= threshold && (!wish.exactMatchOnly || exact);
    if (!accepted) reasons.push(`Confiança abaixo do mínimo de ${threshold}% para esta preferência.`);
    return result(accepted, score, accepted ? exact ? 'exact' : 'similar' : 'rejected', reasons, evidence());

    function evidence(): ProductMatchResult['evidence'] { return { titleSimilarity: Math.round(titleSimilarity * 10000) / 100, brand, category, model, size, color, capacity, identifierMatch, imageMatch }; }
  }
  matchMany(wish: ProductMatchWish, offers: NormalizedOffer[]) { return offers.map((offer) => ({ offer, match: this.match(wish, offer) })); }
}

function result(accepted: boolean, matchScore: number, classification: ProductMatchResult['classification'], reasons: string[], evidence: ProductMatchResult['evidence']): ProductMatchResult { return { accepted, matchScore, classification, reasons, evidence }; }
function normalize(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/(\d)\s*(tb|gb)\b/g, '$1$2').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' '); }
function single(value: string | null | undefined) { const normalized = value ? normalize(value) : ''; return normalized || null; }
function tokens(value: string) { return new Set(value.split(' ').filter((token) => token.length > 1 && !stopWords.has(token))); }
function similarity(left: Set<string>, right: Set<string>) { if (!left.size || !right.size) return 0; let intersection = 0; for (const token of left) if (right.has(token)) intersection++; return 0.65 * (intersection / left.size) + 0.35 * (intersection / right.size); }
function normalizedAttributes(attributes: Record<string, string>) { return Object.fromEntries(Object.entries(attributes).map(([key, value]) => [normalize(key), normalize(value)])); }
function pick(attributes: Record<string, string>, keys: string[]) { for (const key of keys) if (attributes[normalize(key)]) return attributes[normalize(key)]!; return null; }
function containedValue(expected: string | null | undefined, text: string) { const value = single(expected); return value && text.includes(value) ? value : null; }
function compare(expected: string | null, actual: string | null): ProductMatchResult['evidence']['brand'] { if (!expected || !actual) return 'unknown'; return expected === actual || tokens(expected).size > 0 && similarity(tokens(expected), tokens(actual)) >= 0.8 ? 'match' : 'mismatch'; }
function compareBySimilarity(expected: string | null, actual: string | null) { if (!expected || !actual) return 'unknown' as const; return similarity(tokens(normalize(expected)), tokens(normalize(actual))) >= 0.6 ? 'match' as const : 'mismatch' as const; }
function values(value: string | null) { return new Set(value ? value.split(/\s*(?:,|\/|\||;)\s*/).map(normalize).filter(Boolean) : []); }
function compareSets(expected: Set<string>, actual: Set<string>): 'match' | 'mismatch' | 'unknown' { if (!expected.size || !actual.size) return 'unknown'; for (const value of expected) if (actual.has(value)) return 'match'; return 'mismatch'; }
function titleVariant(title: string, pattern: RegExp) { return title.match(pattern)?.[1] ?? null; }
function capacities(inputs: Array<string | null | undefined>) { const result = new Set<string>(); for (const input of inputs) for (const match of normalize(input ?? '').matchAll(/\b(\d+(?:[.,]\d+)?)\s*(gb|tb)\b/g)) result.add(`${Number(match[1]!.replace(',', '.')) * (match[2] === 'tb' ? 1024 : 1)}gb`); return result; }
function colors(inputs: Array<string | null | undefined>) { const result = new Set<string>(); for (const input of inputs) { const text = normalize(input ?? ''); for (const color of colorWords) if (new RegExp(`\\b${color}\\b`).test(text)) result.add(color); } return result; }
function numericModelComparison(wish: ProductMatchWish, offer: NormalizedOffer): 'match' | 'mismatch' | 'unknown' { const ignoredWish = new Set([...capacities([wish.name])].map((value) => value.replace('gb', ''))); if (wish.size) ignoredWish.add(normalize(wish.size)); const expected = new Set([...normalize(wish.name).matchAll(/\b[a-z]*\d+[a-z0-9-]*\b/g)].map(([value]) => value).filter((value) => !ignoredWish.has(value))); const actual = new Set([...normalize(offer.title).matchAll(/\b[a-z]*\d+[a-z0-9-]*\b/g)].map(([value]) => value)); if (!expected.size || !actual.size) return 'unknown'; for (const value of expected) if (actual.has(value)) return 'match'; return 'mismatch'; }
function identifiers(wish: ProductMatchWish) { const values = new Set((wish.identifiers ?? []).map(normalizeIdentifier)); if (wish.referenceUrl) { const match = wish.referenceUrl.match(/\b(MLB)-?(\d{6,15})\b/i); if (match) values.add(`${match[1]!.toUpperCase()}${match[2]}`); } return values; }
function normalizeIdentifier(value: string) { return value.replace(/[^a-z0-9]/gi, '').toUpperCase(); }
function points(state: 'match' | 'mismatch' | 'unknown', matched: number, unknown: number) { return state === 'match' ? matched : state === 'unknown' ? unknown : 0; }
