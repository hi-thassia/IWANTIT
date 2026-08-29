import type { AlertRepository } from '../../database/repositories/alert-repository.js';
import type { AlertCandidate } from './alert-engine.js';

export interface NotificationChannel { readonly name: string; deliver(alert: AlertCandidate): Promise<void>; }
export class InAppNotificationChannel implements NotificationChannel { readonly name = 'in_app'; constructor(private readonly alerts: AlertRepository) {} async deliver(alert: AlertCandidate) { await this.alerts.createOnce(alert); } }
export class NotificationDispatcher { constructor(private readonly channels: NotificationChannel[]) {} async dispatch(alerts: AlertCandidate[]) { for (const alert of alerts) for (const channel of this.channels) await channel.deliver(alert); } }
