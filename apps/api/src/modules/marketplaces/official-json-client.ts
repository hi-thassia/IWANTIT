import { MarketplaceProviderError } from './marketplace-provider.js';

export type MarketplaceHttpClient = (url: string, init?: RequestInit) => Promise<Response>;

export async function officialJson<T>(http: MarketplaceHttpClient, url: string, token: string, timeoutMs = 8_000): Promise<T> {
  let response: Response;
  try { response = await http(url, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }, redirect: 'error', signal: AbortSignal.timeout(timeoutMs) }); }
  catch (cause) {
    const timeout = cause instanceof DOMException && cause.name === 'TimeoutError';
    throw new MarketplaceProviderError(timeout ? 'timeout' : 'external_error', timeout ? 'A consulta excedeu o tempo limite.' : 'Não foi possível acessar a API oficial.');
  }
  if (response.status === 429) throw new MarketplaceProviderError('rate_limited', 'A plataforma limitou temporariamente as consultas.', retryAfter(response.headers.get('retry-after')));
  if (!response.ok) throw new MarketplaceProviderError('external_error', response.status === 401 || response.status === 403 ? 'A credencial da integração foi recusada pela plataforma.' : 'A plataforma está indisponível ou recusou a consulta.');
  const length = Number(response.headers.get('content-length') ?? 0);
  if (length > 2_000_000) throw new MarketplaceProviderError('external_error', 'A resposta externa excedeu o tamanho permitido.');
  const body = await response.text();
  if (body.length > 2_000_000) throw new MarketplaceProviderError('external_error', 'A resposta externa excedeu o tamanho permitido.');
  try { return JSON.parse(body) as T; } catch { throw new MarketplaceProviderError('external_error', 'A plataforma retornou uma resposta inválida.'); }
}

function retryAfter(value: string | null) { if (!value) return null; const seconds = Number(value); if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds); const date = Date.parse(value); return Number.isNaN(date) ? null : Math.max(0, Math.ceil((date - Date.now()) / 1000)); }
