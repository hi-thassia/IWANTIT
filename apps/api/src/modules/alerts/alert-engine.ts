import type { WishMonitoringView } from '@iwantit/shared';
import type { NotificationPreference, Wish } from '../../database/schema/index.js';

export type AvailabilityTransition = { offerId: string; offerUrl: string; marketplaceName: string; previous: 'available' | 'unavailable' | 'unknown' | null; current: 'available' | 'unavailable' | 'unknown'; price: string };
export type AlertCandidate = { userId: string; wishId: string; offerId: string | null; type: 'price_target' | 'price_drop' | 'new_low' | 'back_in_stock'; title: string; message: string; eventKey: string; metadata: Record<string, string | number | boolean | null>; createdAt: Date };

export class AlertEngine {
  evaluate(wish: Wish, preferences: NotificationPreference, before: WishMonitoringView, after: WishMonitoringView, transitions: AvailabilityTransition[], createdAt: Date): AlertCandidate[] {
    const candidates: AlertCandidate[] = []; const current = after.currentLowestPrice ? Number(after.currentLowestPrice) : null; const target = Number(wish.targetPrice); const best = after.offers.find(({ availability }) => availability !== 'unavailable') ?? null;
    if (wish.alertType === 'price_target' && preferences.priceTargetAlert && current !== null && current <= target && best) {
      const exact = current === target; candidates.push(candidate(wish, best.id, 'price_target', exact ? 'Preço desejado atingido!' : 'Preço abaixo do seu objetivo!', exact ? `${wish.name} chegou a ${money(current)}, exatamente o valor desejado.` : `${wish.name} está por ${money(current)}, ${money(target - current)} abaixo do seu objetivo de ${money(target)}.`, `price_target:${wish.id}:${exact ? 'reached' : 'below'}:${cents(current)}`, { currentPrice: current, targetPrice: target, marketplace: best.marketplaceName, offerUrl: best.url }, createdAt));
    }
    const previousCurrent = before.currentLowestPrice ? Number(before.currentLowestPrice) : null;
    if (wish.alertType === 'price_drop' && preferences.priceDropAlert && current !== null && previousCurrent !== null && current < previousCurrent && best) { const percentage = (previousCurrent - current) / previousCurrent * 100; if (percentage >= 10) candidates.push(candidate(wish, best.id, 'price_drop', 'Seu desejo ficou mais barato!', `${wish.name} caiu de ${money(previousCurrent)} para ${money(current)} (${percentage.toFixed(1)}%).`, `price_drop:${wish.id}:${cents(previousCurrent)}:${cents(current)}`, { previousPrice: previousCurrent, currentPrice: current, dropPercentage: Number(percentage.toFixed(2)), marketplace: best.marketplaceName, offerUrl: best.url }, createdAt)); }
    const previousLow = before.historicalLowestPrice ? Number(before.historicalLowestPrice) : null;
    if (wish.alertType === 'new_low' && preferences.newLowAlert && current !== null && previousLow !== null && current < previousLow && best) candidates.push(candidate(wish, best.id, 'new_low', 'Novo menor preço encontrado!', `${wish.name} passou de ${money(previousLow)} para ${money(current)}, o menor valor registrado até agora.`, `new_low:${wish.id}:${cents(current)}`, { previousPrice: previousLow, currentPrice: current, marketplace: best.marketplaceName, offerUrl: best.url }, createdAt));
    if (wish.alertType === 'back_in_stock' && preferences.stockAlert) for (const transition of transitions) if (transition.previous === 'unavailable' && transition.current === 'available') candidates.push(candidate(wish, transition.offerId, 'back_in_stock', 'Produto disponível novamente!', `${wish.name} voltou a ficar disponível por ${money(Number(transition.price))} em ${transition.marketplaceName}.`, `back_in_stock:${wish.id}:${transition.offerId}:${createdAt.toISOString()}`, { currentPrice: Number(transition.price), marketplace: transition.marketplaceName, offerUrl: transition.offerUrl }, createdAt));
    return candidates;
  }
}
function candidate(wish: Wish, offerId: string | null, type: AlertCandidate['type'], title: string, message: string, eventKey: string, metadata: AlertCandidate['metadata'], createdAt: Date): AlertCandidate { return { userId: wish.userId, wishId: wish.id, offerId, type, title, message, eventKey, metadata, createdAt }; }
function money(value: number) { return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function cents(value: number) { return Math.round(value * 100); }
