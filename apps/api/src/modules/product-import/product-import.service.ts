import type { ProductImportResult } from '@iwantit/shared';
import { AuthError } from '../auth/auth.errors.js';

type HttpClient = (url: string, init?: RequestInit) => Promise<Response>;
type Marketplace = ProductImportResult['marketplace'];

type MercadoLivreItem = {
  id?: unknown; title?: unknown; price?: unknown; currency_id?: unknown; category_id?: unknown;
  seller_id?: unknown; thumbnail?: unknown; pictures?: Array<{ secure_url?: unknown; url?: unknown }>;
  attributes?: Array<{ id?: unknown; name?: unknown; value_name?: unknown }>;
  variations?: Array<{ id?: unknown; attribute_combinations?: Array<{ id?: unknown; name?: unknown; value_name?: unknown }> }>;
};

const marketplaces: Array<{ marketplace: Marketplace; name: string; hosts: string[] }> = [
  { marketplace: 'mercado-livre', name: 'Mercado Livre', hosts: ['mercadolivre.com.br', 'mercadolibre.com.br'] },
  { marketplace: 'shopee', name: 'Shopee', hosts: ['shopee.com.br'] },
  { marketplace: 'shein', name: 'SHEIN', hosts: ['shein.com.br', 'shein.com'] },
];

export class ProductImportService {
  constructor(private readonly http: HttpClient = fetch) {}

  async import(rawUrl: string): Promise<ProductImportResult> {
    const url = safeMarketplaceUrl(rawUrl);
    const match = marketplaces.find(({ hosts }) => hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)));
    if (!match) throw new AuthError(400, 'Use um link do Mercado Livre, Shopee ou SHEIN.');

    const referenceUrl = url.toString();
    if (match.marketplace !== 'mercado-livre') return manualResult(match.marketplace, match.name, referenceUrl);

    const itemId = mercadoLivreItemId(url);
    if (!itemId) throw new AuthError(400, 'Não foi possível identificar o anúncio nesse link do Mercado Livre. Use a URL completa da página do produto.');
    return this.fromMercadoLivre(itemId, referenceUrl);
  }

  private async fromMercadoLivre(itemId: string, referenceUrl: string): Promise<ProductImportResult> {
    const item = await this.officialJson<MercadoLivreItem>(`https://api.mercadolibre.com/items/${itemId}`, 'Não foi possível consultar esse anúncio no Mercado Livre.');
    if (typeof item.title !== 'string' || !item.title.trim()) throw new AuthError(502, 'O Mercado Livre retornou dados incompletos para esse anúncio. Preencha o formulário manualmente.');

    const attributes = attributeMap(item.attributes);
    const category = typeof item.category_id === 'string'
      ? await this.optionalName(`https://api.mercadolibre.com/categories/${encodeURIComponent(item.category_id)}`)
      : null;
    const seller = typeof item.seller_id === 'number' || typeof item.seller_id === 'string'
      ? await this.optionalNickname(`https://api.mercadolibre.com/users/${encodeURIComponent(String(item.seller_id))}`)
      : null;

    const variations = (Array.isArray(item.variations) ? item.variations : []).slice(0, 100).map((variation) => ({
      id: typeof variation.id === 'string' || typeof variation.id === 'number' ? String(variation.id) : null,
      attributes: attributeMap(variation.attribute_combinations),
    }));
    return {
      marketplace: 'mercado-livre', marketplaceName: 'Mercado Livre', status: 'imported', source: 'official_api',
      message: 'Dados obtidos pela API oficial do Mercado Livre. Revise tudo antes de salvar; o link será apenas uma referência inicial.',
      referenceUrl, title: item.title.trim(), imageUrl: image(item), price: money(item.price),
      brand: pick(attributes, ['Marca', 'BRAND']), category, seller,
      color: pick(attributes, ['Cor', 'COLOR', 'Cor principal', 'MAIN_COLOR']) ?? uniqueVariationValue(variations, ['Cor', 'COLOR', 'Cor principal', 'MAIN_COLOR']),
      size: pick(attributes, ['Tamanho', 'SIZE', 'Tamanho do calçado', 'FOOTWEAR_SIZE']) ?? uniqueVariationValue(variations, ['Tamanho', 'SIZE', 'Tamanho do calçado', 'FOOTWEAR_SIZE']),
      variations,
      attributes,
    };
  }

  private async optionalName(url: string) { try { const value = await this.officialJson<{ name?: unknown }>(url, ''); return typeof value.name === 'string' ? value.name : null; } catch { return null; } }
  private async optionalNickname(url: string) { try { const value = await this.officialJson<{ nickname?: unknown }>(url, ''); return typeof value.nickname === 'string' ? value.nickname : null; } catch { return null; } }

  private async officialJson<T>(url: string, failureMessage: string): Promise<T> {
    let response: Response;
    try { response = await this.http(url, { headers: { Accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(8_000) }); }
    catch { throw new AuthError(502, failureMessage || 'Falha ao consultar um dado complementar.'); }
    if (!response.ok) {
      if (response.status === 404) throw new AuthError(404, 'O anúncio não foi encontrado ou não está mais disponível.');
      throw new AuthError(502, failureMessage || 'Falha ao consultar um dado complementar.');
    }
    const declaredSize = Number(response.headers.get('content-length') ?? 0);
    if (declaredSize > 1_000_000) throw new AuthError(502, failureMessage || 'Resposta externa muito grande.');
    const body = await response.text();
    if (body.length > 1_000_000) throw new AuthError(502, failureMessage || 'Resposta externa muito grande.');
    try { return JSON.parse(body) as T; } catch { throw new AuthError(502, failureMessage || 'Resposta externa inválida.'); }
  }
}

function safeMarketplaceUrl(raw: string) {
  let url: URL;
  try { url = new URL(raw); } catch { throw new AuthError(400, 'Informe uma URL válida.'); }
  if (url.protocol !== 'https:') throw new AuthError(400, 'Use uma URL HTTPS segura.');
  if (url.username || url.password || url.port) throw new AuthError(400, 'A URL contém credenciais ou porta não permitida.');
  if (url.hostname.endsWith('.')) url.hostname = url.hostname.slice(0, -1);
  return url;
}

function mercadoLivreItemId(url: URL) {
  const match = `${url.pathname}${url.search}`.match(/(?:^|[^A-Z0-9])(MLB)-?(\d{6,15})(?:[^0-9]|$)/i);
  return match ? `${match[1]!.toUpperCase()}${match[2]}` : null;
}

function attributeMap(values: MercadoLivreItem['attributes'] | NonNullable<MercadoLivreItem['variations']>[number]['attribute_combinations']) {
  const result: Record<string, string> = {};
  for (const attribute of Array.isArray(values) ? values.slice(0, 100) : []) {
    if (typeof attribute.value_name !== 'string' || !attribute.value_name.trim()) continue;
    const key = typeof attribute.name === 'string' && attribute.name.trim() ? attribute.name.trim() : typeof attribute.id === 'string' ? attribute.id : '';
    if (key) result[key] = attribute.value_name.trim();
  }
  return result;
}
function pick(attributes: Record<string, string>, keys: string[]) { const entry = Object.entries(attributes).find(([key]) => keys.some((candidate) => key.localeCompare(candidate, undefined, { sensitivity: 'base' }) === 0)); return entry?.[1] ?? null; }
function uniqueVariationValue(variations: ProductImportResult['variations'], keys: string[]) { const values = new Set(variations.map(({ attributes }) => pick(attributes, keys)).filter((value): value is string => Boolean(value))); return values.size === 1 ? [...values][0]! : null; }
function image(item: MercadoLivreItem) { const first = Array.isArray(item.pictures) ? item.pictures[0] : undefined; for (const value of [first?.secure_url, first?.url, item.thumbnail]) if (typeof value === 'string' && value.startsWith('https://')) return value; return null; }
function money(value: unknown) { return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value.toFixed(2) : null; }
function manualResult(marketplace: 'shopee' | 'shein', name: string, referenceUrl: string): ProductImportResult { return { marketplace, marketplaceName: name, status: 'manual_required', source: 'unavailable', message: `${name} foi reconhecida, mas não há uma API oficial configurada para importar este anúncio com confiabilidade. Preencha os dados manualmente.`, referenceUrl, title: null, imageUrl: null, price: null, brand: null, category: null, seller: null, color: null, size: null, variations: [], attributes: {} }; }
