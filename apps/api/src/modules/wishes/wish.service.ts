import type { MarketplaceOption, WishView } from '@iwantit/shared';
import type { Database } from '../../database/client.js';
import { WishRepository } from '../../database/repositories/wish-repository.js';
import { OfferRepository } from '../../database/repositories/offer-repository.js';
import type { Wish } from '../../database/schema/wishes.js';
import type { AuthService } from '../auth/auth.service.js';
import { AuthError } from '../auth/auth.errors.js';
import type { WishInput } from './wish.schemas.js';

export class WishService {
  private readonly wishes: WishRepository; private readonly offers: OfferRepository;
  constructor(db: Database, private readonly auth: AuthService) { this.wishes = new WishRepository(db); this.offers = new OfferRepository(db); }
  async marketplaceOptions(): Promise<MarketplaceOption[]> { return (await this.wishes.marketplaces()).map(({ id, name, slug }) => ({ id, name, slug })); }
  async list(token?: string) { const user = await this.auth.authenticate(token); return Promise.all((await this.wishes.findByUser(user.id)).map((wish) => this.view(wish))); }
  async get(token: string | undefined, id: string) { const user = await this.auth.authenticate(token); const wish = await this.wishes.findOwnedById(id, user.id); if (!wish) throw notFound(); return this.view(wish); }
  async create(token: string | undefined, input: WishInput) { const user = await this.auth.authenticate(token); await this.validateMarketplaces(input.marketplaceIds); return this.view(await this.wishes.create({ userId: user.id, ...fields(input) }, input.marketplaceIds)); }
  async update(token: string | undefined, id: string, input: WishInput) { const user = await this.auth.authenticate(token); await this.validateMarketplaces(input.marketplaceIds); const wish = await this.wishes.update(id, user.id, fields(input), input.marketplaceIds); if (!wish) throw notFound(); return this.view(wish); }
  async status(token: string | undefined, id: string, status: 'active' | 'paused') { const user = await this.auth.authenticate(token); const wish = await this.wishes.setStatus(id, user.id, status); if (!wish) throw notFound(); return this.view(wish); }
  async delete(token: string | undefined, id: string) { const user = await this.auth.authenticate(token); if (!await this.wishes.delete(id, user.id)) throw notFound(); }
  private async validateMarketplaces(ids: string[]) { if ((await this.wishes.validMarketplaceIds([...new Set(ids)])).length !== new Set(ids).size) throw new AuthError(400, 'Um dos marketplaces selecionados é inválido.'); }
  private async view(wish: Wish): Promise<WishView> { const options = await this.marketplaceOptions(); const ids = (await this.wishes.marketplaceIdsForWish(wish.id)).map(({ marketplaceId }) => marketplaceId); const offers = (await this.offers.findDetailedByWish(wish.id)).filter(({ offer }) => offer.availability !== 'unavailable').sort((a, b) => Number(a.offer.totalPrice ?? a.offer.price) - Number(b.offer.totalPrice ?? b.offer.price)); const lowest = offers[0]; return { ...wish, createdAt: undefined, updatedAt: undefined, monitoringStartedAt: undefined, lastCheckedAt: undefined, marketplaceIds: ids, marketplaces: options.filter(({ id }) => ids.includes(id)), lowestPrice: lowest ? lowest.offer.totalPrice ?? lowest.offer.price : null, lowestMarketplace: lowest?.marketplaceName ?? null, lastUpdatedAt: wish.lastCheckedAt?.toISOString() ?? null, offerCount: offers.length } as unknown as WishView; }
}
function fields(input: WishInput) { const { marketplaceIds: _, ...rest } = input; return rest; }
function notFound() { return new AuthError(404, 'Desejo não encontrado.'); }
