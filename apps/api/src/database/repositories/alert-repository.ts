import { and, count, desc, eq, isNull } from 'drizzle-orm';
import type { Database } from '../client.js';
import { alerts, notificationPreferences, offers, wishes, type NewAlert } from '../schema/index.js';

export class AlertRepository {
  constructor(private readonly db: Database) {}
  async preferences(userId: string) { const [value] = await this.db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).limit(1); return value ?? null; }
  async createOnce(input: NewAlert) { const [created] = await this.db.insert(alerts).values(input).onConflictDoNothing({ target: alerts.eventKey }).returning(); return created ?? null; }
  async list(userId: string) { return this.db.select({ alert: alerts, wishName: wishes.name, offerUrl: offers.url }).from(alerts).leftJoin(wishes, eq(alerts.wishId, wishes.id)).leftJoin(offers, eq(alerts.offerId, offers.id)).where(eq(alerts.userId, userId)).orderBy(desc(alerts.createdAt)).limit(100); }
  async unreadCount(userId: string) { const [result] = await this.db.select({ value: count() }).from(alerts).where(and(eq(alerts.userId, userId), isNull(alerts.readAt))); return result?.value ?? 0; }
  async markRead(id: string, userId: string, at: Date) { const [updated] = await this.db.update(alerts).set({ readAt: at }).where(and(eq(alerts.id, id), eq(alerts.userId, userId), isNull(alerts.readAt))).returning(); if (updated) return updated; const [existing] = await this.db.select().from(alerts).where(and(eq(alerts.id, id), eq(alerts.userId, userId))).limit(1); return existing ?? null; }
  async markAllRead(userId: string, at: Date) { return this.db.update(alerts).set({ readAt: at }).where(and(eq(alerts.userId, userId), isNull(alerts.readAt))).returning({ id: alerts.id }); }
}
