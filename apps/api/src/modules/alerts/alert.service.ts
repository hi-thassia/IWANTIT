import type { AlertView, WishMonitoringView } from '@iwantit/shared';
import type { Database } from '../../database/client.js';
import { AlertRepository } from '../../database/repositories/alert-repository.js';
import type { Wish } from '../../database/schema/index.js';
import type { AuthService } from '../auth/auth.service.js';
import { AuthError } from '../auth/auth.errors.js';
import { AlertEngine, type AvailabilityTransition } from './alert-engine.js';
import { InAppNotificationChannel, NotificationDispatcher } from './notification-channel.js';

export class AlertService {
  private readonly repository: AlertRepository; private readonly dispatcher: NotificationDispatcher;
  constructor(db: Database, private readonly auth: AuthService, private readonly engine = new AlertEngine(), private readonly now: () => Date = () => new Date()) { this.repository = new AlertRepository(db); this.dispatcher = new NotificationDispatcher([new InAppNotificationChannel(this.repository)]); }
  async processMonitoring(wish: Wish, before: WishMonitoringView, after: WishMonitoringView, transitions: AvailabilityTransition[], createdAt: Date) { const preferences = await this.repository.preferences(wish.userId); if (!preferences) return; await this.dispatcher.dispatch(this.engine.evaluate(wish, preferences, before, after, transitions, createdAt)); }
  async list(rawToken?: string) { const user = await this.auth.authenticate(rawToken); const rows = await this.repository.list(user.id); return { alerts: rows.map(({ alert, wishName, offerUrl }): AlertView => ({ id: alert.id, type: alert.type, title: alert.title, message: alert.message, wishId: alert.wishId, wishName, offerId: alert.offerId, offerUrl, metadata: alert.metadata, readAt: alert.readAt?.toISOString() ?? null, createdAt: alert.createdAt.toISOString() })), unreadCount: await this.repository.unreadCount(user.id) }; }
  async markRead(rawToken: string | undefined, id: string) { const user = await this.auth.authenticate(rawToken); const alert = await this.repository.markRead(id, user.id, this.now()); if (!alert) throw new AuthError(404, 'Alerta não encontrado.'); return { readAt: alert.readAt?.toISOString() ?? null }; }
  async markAllRead(rawToken?: string) { const user = await this.auth.authenticate(rawToken); const updated = await this.repository.markAllRead(user.id, this.now()); return { updated: updated.length }; }
}
