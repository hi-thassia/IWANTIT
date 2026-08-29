import { relations } from 'drizzle-orm';
import { alerts } from './alerts.js';
import { authEvents, loginAttempts, notificationPreferences, passwordResetTokens, sessions, twoFactorChallenges } from './auth.js';
import { marketplaces } from './marketplaces.js';
import { offers } from './offers.js';
import { priceHistory } from './price-history.js';
import { users } from './users.js';
import { wishes, wishMarketplaces } from './wishes.js';

export const usersRelations = relations(users, ({ many, one }) => ({
  wishes: many(wishes),
  alerts: many(alerts),
  loginAttempts: many(loginAttempts),
  sessions: many(sessions),
  notificationPreference: one(notificationPreferences),
  passwordResetTokens: many(passwordResetTokens),
  twoFactorChallenges: many(twoFactorChallenges),
  authEvents: many(authEvents),
}));

export const wishesRelations = relations(wishes, ({ many, one }) => ({
  user: one(users, { fields: [wishes.userId], references: [users.id] }),
  offers: many(offers),
  alerts: many(alerts),
  marketplaces: many(wishMarketplaces),
}));

export const marketplacesRelations = relations(marketplaces, ({ many }) => ({
  offers: many(offers),
  wishes: many(wishMarketplaces),
}));

export const wishMarketplacesRelations = relations(wishMarketplaces, ({ one }) => ({
  wish: one(wishes, { fields: [wishMarketplaces.wishId], references: [wishes.id] }),
  marketplace: one(marketplaces, { fields: [wishMarketplaces.marketplaceId], references: [marketplaces.id] }),
}));

export const offersRelations = relations(offers, ({ many, one }) => ({
  wish: one(wishes, { fields: [offers.wishId], references: [wishes.id] }),
  marketplace: one(marketplaces, { fields: [offers.marketplaceId], references: [marketplaces.id] }),
  priceHistory: many(priceHistory),
}));

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
  offer: one(offers, { fields: [priceHistory.offerId], references: [offers.id] }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  user: one(users, { fields: [alerts.userId], references: [users.id] }),
  wish: one(wishes, { fields: [alerts.wishId], references: [wishes.id] }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, { fields: [notificationPreferences.userId], references: [users.id] }),
}));

export const loginAttemptsRelations = relations(loginAttempts, ({ one }) => ({
  user: one(users, { fields: [loginAttempts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, { fields: [passwordResetTokens.userId], references: [users.id] }),
}));

export const twoFactorChallengesRelations = relations(twoFactorChallenges, ({ one }) => ({ user: one(users, { fields: [twoFactorChallenges.userId], references: [users.id] }) }));
export const authEventsRelations = relations(authEvents, ({ one }) => ({ user: one(users, { fields: [authEvents.userId], references: [users.id] }) }));
