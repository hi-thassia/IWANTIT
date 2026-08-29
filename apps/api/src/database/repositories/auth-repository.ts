import { and, desc, eq, gt, inArray, isNull, lt, ne, or } from 'drizzle-orm';
import { env } from '../../config/env.js';
import type { Database } from '../client.js';
import { authEvents, loginAttempts, oauthStates, passwordResetTokens, sessions, twoFactorChallenges, users } from '../schema/index.js';

export class AuthRepository {
  constructor(private readonly db: Database) {}

  async createSession(input: typeof sessions.$inferInsert) {
    const [session] = await this.db.insert(sessions).values(input).returning();
    if (!session) throw new Error('Session insert did not return a row');
    const active = await this.db.select({ id: sessions.id }).from(sessions)
      .where(and(eq(sessions.userId, input.userId), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())))
      .orderBy(desc(sessions.createdAt));
    const excess = active.slice(env.MAX_ACTIVE_SESSIONS).map(({ id }) => id);
    if (excess.length) await this.db.update(sessions).set({ revokedAt: new Date() }).where(inArray(sessions.id, excess));
    return session;
  }

  async findActiveSession(tokenHash: string, now = new Date()) {
    const [result] = await this.db.select({ session: sessions, user: users })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt), gt(sessions.expiresAt, now)))
      .limit(1);
    return result ?? null;
  }

  async revokeSession(tokenHash: string, now = new Date()) {
    await this.db.update(sessions).set({ revokedAt: now, updatedAt: now })
      .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt)));
  }

  async recordLoginAttempt(input: typeof loginAttempts.$inferInsert) {
    await this.db.insert(loginAttempts).values(input);
  }

  async loginThrottle(email: string, ip: string, now = new Date()) {
    const attempts = await this.db.select().from(loginAttempts)
      .where(and(eq(loginAttempts.email, email), eq(loginAttempts.ip, ip)))
      .orderBy(desc(loginAttempts.createdAt)).limit(20);
    let failures = 0;
    for (const attempt of attempts) { if (attempt.successful) break; failures += 1; }
    if (failures < 3 || !attempts[0]) return null;
    const cooldownSeconds = Math.min(30 * 2 ** (failures - 3), 900);
    const retryAt = attempts[0].createdAt.getTime() + cooldownSeconds * 1000;
    return retryAt > now.getTime() ? Math.ceil((retryAt - now.getTime()) / 1000) : null;
  }

  async logEvent(input: typeof authEvents.$inferInsert) { await this.db.insert(authEvents).values(input); }

  async createOAuthState(input: typeof oauthStates.$inferInsert) { await this.db.insert(oauthStates).values(input); }
  async consumeOAuthState(stateHash: string, browserBindingHash: string, now = new Date()) {
    return this.db.transaction(async (tx) => {
      const [state] = await tx.select().from(oauthStates).where(and(eq(oauthStates.stateHash, stateHash), eq(oauthStates.browserBindingHash, browserBindingHash), isNull(oauthStates.consumedAt), gt(oauthStates.expiresAt, now))).for('update').limit(1);
      if (!state) return null;
      await tx.update(oauthStates).set({ consumedAt: now }).where(eq(oauthStates.id, state.id));
      return state;
    });
  }

  async createTwoFactorChallenge(input: typeof twoFactorChallenges.$inferInsert) {
    const [challenge] = await this.db.insert(twoFactorChallenges).values(input).returning();
    if (!challenge) throw new Error('Challenge insert did not return a row'); return challenge;
  }

  async findActiveTwoFactorChallenge(tokenHash: string, now = new Date()) {
    const [result] = await this.db.select({ challenge: twoFactorChallenges, user: users }).from(twoFactorChallenges)
      .innerJoin(users, eq(twoFactorChallenges.userId, users.id))
      .where(and(eq(twoFactorChallenges.tokenHash, tokenHash), isNull(twoFactorChallenges.consumedAt), gt(twoFactorChallenges.expiresAt, now), lt(twoFactorChallenges.attempts, 5))).limit(1);
    return result ?? null;
  }

  async failTwoFactorChallenge(id: string) { await this.db.update(twoFactorChallenges).set({ attempts: 5 }).where(eq(twoFactorChallenges.id, id)); }
  async incrementTwoFactorChallenge(id: string, attempts: number) { await this.db.update(twoFactorChallenges).set({ attempts }).where(eq(twoFactorChallenges.id, id)); }
  async consumeTwoFactorChallenge(id: string) { await this.db.update(twoFactorChallenges).set({ consumedAt: new Date() }).where(eq(twoFactorChallenges.id, id)); }

  async setTwoFactorSecret(userId: string, encryptedSecret: string) {
    await this.db.update(users).set({ twoFactorSecretEncrypted: encryptedSecret, twoFactorEnabled: false, lastTotpStep: null, updatedAt: new Date() }).where(eq(users.id, userId));
  }
  async enableTwoFactor(userId: string, step: number) { await this.db.update(users).set({ twoFactorEnabled: true, lastTotpStep: step, updatedAt: new Date() }).where(eq(users.id, userId)); }
  async disableTwoFactor(userId: string) { await this.db.update(users).set({ twoFactorEnabled: false, twoFactorSecretEncrypted: null, lastTotpStep: null, updatedAt: new Date() }).where(eq(users.id, userId)); }
  async consumeTotpStep(userId: string, step: number) {
    const [updated] = await this.db.update(users).set({ lastTotpStep: step, updatedAt: new Date() })
      .where(and(eq(users.id, userId), or(isNull(users.lastTotpStep), lt(users.lastTotpStep, step)))).returning({ id: users.id });
    return Boolean(updated);
  }

  async listSessions(userId: string, now = new Date()) { return this.db.select().from(sessions).where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt), gt(sessions.expiresAt, now))).orderBy(desc(sessions.createdAt)); }
  async revokeSessionById(userId: string, id: string) { await this.db.update(sessions).set({ revokedAt: new Date(), updatedAt: new Date() }).where(and(eq(sessions.userId, userId), eq(sessions.id, id), isNull(sessions.revokedAt))); }
  async revokeOtherSessions(userId: string, currentTokenHash: string) { await this.db.update(sessions).set({ revokedAt: new Date(), updatedAt: new Date() }).where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt), ne(sessions.tokenHash, currentTokenHash))); }

  async createPasswordResetToken(input: typeof passwordResetTokens.$inferInsert) {
    return this.db.transaction(async (tx) => {
      await tx.update(passwordResetTokens).set({ usedAt: new Date() })
        .where(and(eq(passwordResetTokens.userId, input.userId), isNull(passwordResetTokens.usedAt)));
      const [token] = await tx.insert(passwordResetTokens).values(input).returning();
      return token;
    });
  }

  async resetPassword(tokenHash: string, passwordHash: string, now = new Date()) {
    return this.db.transaction(async (tx) => {
      const [token] = await tx.select().from(passwordResetTokens)
        .where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, now)))
        .for('update')
        .limit(1);
      if (!token) return null;
      await tx.update(users).set({ passwordHash, updatedAt: now }).where(eq(users.id, token.userId));
      await tx.update(passwordResetTokens).set({ usedAt: now }).where(eq(passwordResetTokens.id, token.id));
      await tx.update(sessions).set({ revokedAt: now, updatedAt: now })
        .where(and(eq(sessions.userId, token.userId), isNull(sessions.revokedAt)));
      return token.userId;
    });
  }
}
