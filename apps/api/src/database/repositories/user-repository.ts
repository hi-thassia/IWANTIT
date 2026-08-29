import { eq, sql } from 'drizzle-orm';
import type { Database } from '../client.js';
import { notificationPreferences, type NewUser, users } from '../schema/index.js';

export class UserRepository {
  constructor(private readonly db: Database) {}

  async create(input: NewUser) {
    return this.db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({ ...input, email: input.email.trim().toLowerCase() }).returning();
      if (!user) throw new Error('User insert did not return a row');
      await tx.insert(notificationPreferences).values({ userId: user.id });
      return user;
    });
  }

  async findById(id: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return user ?? null;
  }

  async findByEmail(email: string) {
    const [user] = await this.db.select().from(users).where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`).limit(1);
    return user ?? null;
  }

  async findByGoogleId(googleId: string) {
    const [user] = await this.db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
    return user ?? null;
  }

  async completeOnboarding(userId: string, completedAt = new Date()) {
    const [user] = await this.db.update(users)
      .set({ onboardingCompletedAt: completedAt, updatedAt: completedAt })
      .where(eq(users.id, userId)).returning();
    return user ?? null;
  }

  async updateProfile(userId: string, input: Partial<Pick<NewUser, 'name' | 'email' | 'avatarUrl' | 'theme' | 'passwordHash'>>) {
    const [user] = await this.db.update(users).set({ ...input, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
    return user ?? null;
  }

  async notificationPreferences(userId: string) {
    const [preferences] = await this.db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).limit(1);
    return preferences ?? null;
  }

  async updateNotificationPreferences(userId: string, input: Pick<typeof notificationPreferences.$inferInsert, 'priceTargetAlert' | 'priceDropAlert' | 'newLowAlert' | 'stockAlert'>) {
    const [preferences] = await this.db.update(notificationPreferences).set({ ...input, updatedAt: new Date() }).where(eq(notificationPreferences.userId, userId)).returning();
    return preferences ?? null;
  }

  async findOrCreateFromGoogle(input: { googleId: string; email: string; name: string; avatarUrl?: string | null }) {
    return this.db.transaction(async (tx) => {
      const [byGoogle] = await tx.select().from(users).where(eq(users.googleId, input.googleId)).limit(1);
      if (byGoogle) return { user: byGoogle, created: false, linked: false };
      const [byEmail] = await tx.select().from(users).where(sql`lower(${users.email}) = ${input.email.toLowerCase()}`).limit(1);
      if (byEmail) {
        if (byEmail.googleId && byEmail.googleId !== input.googleId) throw new Error('GOOGLE_IDENTITY_CONFLICT');
        const [linked] = await tx.update(users).set({ googleId: input.googleId, avatarUrl: byEmail.avatarUrl ?? input.avatarUrl, updatedAt: new Date() }).where(eq(users.id, byEmail.id)).returning();
        return { user: linked!, created: false, linked: true };
      }
      const [created] = await tx.insert(users).values({ name: input.name, email: input.email.toLowerCase(), googleId: input.googleId, avatarUrl: input.avatarUrl }).returning();
      if (!created) throw new Error('Google user insert did not return a row');
      await tx.insert(notificationPreferences).values({ userId: created.id });
      return { user: created, created: true, linked: false };
    });
  }
}
