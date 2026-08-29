import type { AuthUser } from '@iwantit/shared';
import { env } from '../../config/env.js';
import type { Database } from '../../database/client.js';
import { AuthRepository, UserRepository } from '../../database/repositories/index.js';
import { AuthError } from './auth.errors.js';
import { createOpaqueToken, hashPassword, hashToken, verifyPassword } from './crypto.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';
import type { PasswordResetMailer } from './mailer.js';
import { decryptSecret, encryptSecret, generateTotpSecret, totpUri, verifyTotp } from './totp.js';
import type { GoogleOAuthProvider } from './google-oauth.js';

type RequestMetadata = { ip: string; device?: string };

export class AuthService {
  private readonly users: UserRepository;
  private readonly auth: AuthRepository;
  private dummyHash?: Promise<string>;

  constructor(private readonly db: Database, private readonly mailer: PasswordResetMailer, private readonly google: GoogleOAuthProvider) {
    this.users = new UserRepository(db);
    this.auth = new AuthRepository(db);
  }

  async beginGoogleOAuth() {
    const state = createOpaqueToken(); const browserBinding = createOpaqueToken(); const nonce = createOpaqueToken(); const codeVerifier = createOpaqueToken();
    await this.auth.createOAuthState({ stateHash: hashToken(state), browserBindingHash: hashToken(browserBinding), codeVerifierEncrypted: encryptSecret(codeVerifier), nonceEncrypted: encryptSecret(nonce), expiresAt: new Date(Date.now() + 10 * 60_000) });
    return { authorizationUrl: await this.google.createAuthorizationUrl({ state, nonce, codeVerifier }), browserBinding };
  }

  async completeGoogleOAuth(input: { callbackUrl: URL; state?: string; browserBinding?: string; providerError?: string }, metadata: RequestMetadata) {
    if (!input.state || !input.browserBinding) throw new AuthError(400, 'Não foi possível validar o login com Google. Tente novamente.');
    const stored = await this.auth.consumeOAuthState(hashToken(input.state), hashToken(input.browserBinding));
    if (!stored) throw new AuthError(400, 'A solicitação de login expirou ou já foi utilizada.');
    if (input.providerError) throw new AuthError(400, input.providerError === 'access_denied' ? 'Login com Google cancelado.' : 'O Google não autorizou o acesso.');
    const identity = await this.google.exchange({ callbackUrl: input.callbackUrl, state: input.state, nonce: decryptSecret(stored.nonceEncrypted), codeVerifier: decryptSecret(stored.codeVerifierEncrypted) });
    if (!identity.emailVerified) throw new AuthError(403, 'O Google não confirmou este endereço de e-mail.');
    const email = identity.email.trim().toLowerCase();
    let result;
    try { result = await this.users.findOrCreateFromGoogle({ googleId: identity.subject, email, name: cleanGoogleName(identity.name), avatarUrl: identity.picture }); }
    catch (error) { if (isUniqueViolation(error) || (error instanceof Error && error.message === 'GOOGLE_IDENTITY_CONFLICT')) throw new AuthError(409, 'Não foi possível associar esta Conta do Google.'); throw error; }
    await this.auth.logEvent({ userId: result.user.id, type: result.created ? 'google_account_created' : result.linked ? 'google_account_linked' : 'google_login_success', email, ip: metadata.ip });
    if (result.user.twoFactorEnabled) {
      const challengeToken = createOpaqueToken();
      await this.auth.createTwoFactorChallenge({ userId: result.user.id, tokenHash: hashToken(challengeToken), expiresAt: new Date(Date.now() + env.TWO_FACTOR_CHALLENGE_TTL_MINUTES * 60_000), ip: metadata.ip, device: metadata.device });
      return { requiresTwoFactor: true as const, challengeToken };
    }
    return { user: publicUser(result.user), ...(await this.issueSession(result.user.id, metadata)) };
  }

  async register(input: RegisterInput, metadata: RequestMetadata) {
    if (await this.users.findByEmail(input.email)) throw new AuthError(409, 'Já existe uma conta com este e-mail.');
    const passwordHash = await hashPassword(input.password);
    try {
      const user = await this.users.create({ name: input.name, email: input.email, passwordHash });
      await this.auth.logEvent({ userId: user.id, type: 'register_success', email: user.email, ip: metadata.ip });
      return { user: publicUser(user), ...(await this.issueSession(user.id, metadata)) };
    } catch (error) {
      if (isUniqueViolation(error)) throw new AuthError(409, 'Já existe uma conta com este e-mail.');
      throw error;
    }
  }

  async login(input: LoginInput, metadata: RequestMetadata) {
    const retryAfter = await this.auth.loginThrottle(input.email, metadata.ip);
    if (retryAfter) {
      await this.auth.logEvent({ type: 'login_throttled', email: input.email, ip: metadata.ip, metadata: { retryAfter } });
      throw new AuthError(429, `Muitas tentativas. Aguarde ${retryAfter} segundos e tente novamente.`, retryAfter);
    }
    const user = await this.users.findByEmail(input.email);
    this.dummyHash ??= hashPassword('invalid-password-constant-work');
    const valid = await verifyPassword(user?.passwordHash ?? await this.dummyHash, input.password).catch(() => false);
    await this.auth.recordLoginAttempt({ userId: user?.id, email: input.email, ip: metadata.ip, successful: Boolean(user && valid) });
    if (!user || !valid) { await this.auth.logEvent({ userId: user?.id, type: 'login_failure', email: input.email, ip: metadata.ip }); throw new AuthError(401, 'E-mail ou senha incorretos.'); }
    if (user.twoFactorEnabled) {
      const token = createOpaqueToken();
      await this.auth.createTwoFactorChallenge({ userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + env.TWO_FACTOR_CHALLENGE_TTL_MINUTES * 60_000), ip: metadata.ip, device: metadata.device });
      await this.auth.logEvent({ userId: user.id, type: 'two_factor_challenge_created', email: user.email, ip: metadata.ip });
      return { requiresTwoFactor: true as const, challengeToken: token };
    }
    await this.auth.logEvent({ userId: user.id, type: 'login_success', email: user.email, ip: metadata.ip });
    return { user: publicUser(user), ...(await this.issueSession(user.id, metadata)) };
  }

  async completeTwoFactorLogin(challengeToken: string, code: string) {
    const result = await this.auth.findActiveTwoFactorChallenge(hashToken(challengeToken));
    if (!result?.user.twoFactorSecretEncrypted) throw new AuthError(401, 'Código inválido ou desafio expirado.');
    const step = verifyTotp(decryptSecret(result.user.twoFactorSecretEncrypted), code, Date.now(), result.user.lastTotpStep);
    if (step === null) { await this.auth.incrementTwoFactorChallenge(result.challenge.id, result.challenge.attempts + 1); await this.auth.logEvent({ userId: result.user.id, type: 'two_factor_failure', ip: result.challenge.ip }); throw new AuthError(401, 'Código inválido ou desafio expirado.'); }
    if (!await this.auth.consumeTotpStep(result.user.id, step)) throw new AuthError(401, 'Este código já foi utilizado. Aguarde o próximo.');
    await this.auth.consumeTwoFactorChallenge(result.challenge.id);
    const session = await this.issueSession(result.user.id, { ip: result.challenge.ip, device: result.challenge.device ?? undefined });
    await this.auth.logEvent({ userId: result.user.id, type: 'login_success_2fa', ip: result.challenge.ip });
    return { user: publicUser(result.user), ...session };
  }

  async authenticate(rawToken?: string) {
    if (!rawToken) throw new AuthError(401, 'Faça login para continuar.');
    const result = await this.auth.findActiveSession(hashToken(rawToken));
    if (!result) throw new AuthError(401, 'Sua sessão expirou. Entre novamente.');
    return publicUser(result.user);
  }

  async logout(rawToken?: string) {
    if (rawToken) { const tokenHash = hashToken(rawToken); const current = await this.auth.findActiveSession(tokenHash); await this.auth.revokeSession(tokenHash); if (current) await this.auth.logEvent({ userId: current.user.id, type: 'logout', ip: current.session.ip }); }
  }

  async requestPasswordReset(email: string) {
    const user = await this.users.findByEmail(email);
    if (!user) return;
    const token = createOpaqueToken();
    const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60_000);
    await this.auth.createPasswordResetToken({ userId: user.id, tokenHash: hashToken(token), expiresAt });
    const resetUrl = new URL(env.PASSWORD_RESET_URL);
    resetUrl.searchParams.set('token', token);
    await this.mailer.sendPasswordReset({ email: user.email, name: user.name, resetUrl: resetUrl.toString() });
    await this.auth.logEvent({ userId: user.id, type: 'password_reset_requested', email: user.email });
  }

  async resetPassword(token: string, password: string) {
    const userId = await this.auth.resetPassword(hashToken(token), await hashPassword(password));
    if (!userId) throw new AuthError(400, 'Este link é inválido ou expirou. Solicite um novo link.');
    await this.auth.logEvent({ userId, type: 'password_reset_success' });
  }

  async setupTwoFactor(rawToken: string | undefined, password: string) {
    const current = await this.requireSession(rawToken); const valid = current.user.passwordHash && await verifyPassword(current.user.passwordHash, password);
    if (!valid) throw new AuthError(401, 'Senha incorreta.');
    if (current.user.twoFactorEnabled) throw new AuthError(400, 'Desative o 2FA atual antes de configurar um novo autenticador.');
    const secret = generateTotpSecret(); await this.auth.setTwoFactorSecret(current.user.id, encryptSecret(secret));
    await this.auth.logEvent({ userId: current.user.id, type: 'two_factor_setup', ip: current.session.ip });
    return { secret, uri: totpUri(secret, current.user.email) };
  }

  async enableTwoFactor(rawToken: string | undefined, code: string) {
    const current = await this.requireSession(rawToken); if (!current.user.twoFactorSecretEncrypted) throw new AuthError(400, 'Inicie a configuração do autenticador primeiro.');
    const step = verifyTotp(decryptSecret(current.user.twoFactorSecretEncrypted), code);
    if (step === null) throw new AuthError(400, 'Código inválido. Confira o autenticador e tente novamente.');
    await this.auth.enableTwoFactor(current.user.id, step); await this.auth.revokeOtherSessions(current.user.id, current.session.tokenHash);
    await this.auth.logEvent({ userId: current.user.id, type: 'two_factor_enabled', ip: current.session.ip });
  }

  async disableTwoFactor(rawToken: string | undefined, password: string, code: string) {
    const current = await this.requireSession(rawToken); if (!current.user.twoFactorEnabled || !current.user.twoFactorSecretEncrypted) throw new AuthError(400, 'A autenticação em dois fatores não está ativa.');
    if (!current.user.passwordHash || !await verifyPassword(current.user.passwordHash, password)) throw new AuthError(401, 'Senha ou código incorretos.');
    const step = verifyTotp(decryptSecret(current.user.twoFactorSecretEncrypted), code);
    if (step === null) throw new AuthError(401, 'Senha ou código incorretos.');
    await this.auth.disableTwoFactor(current.user.id); await this.auth.revokeOtherSessions(current.user.id, current.session.tokenHash);
    await this.auth.logEvent({ userId: current.user.id, type: 'two_factor_disabled', ip: current.session.ip });
  }

  async sessions(rawToken?: string) {
    const current = await this.requireSession(rawToken); const rows = await this.auth.listSessions(current.user.id);
    return rows.map((session) => ({ id: session.id, device: session.device, ip: session.ip, createdAt: session.createdAt.toISOString(), expiresAt: session.expiresAt.toISOString(), current: session.tokenHash === current.session.tokenHash }));
  }

  async revokeSession(rawToken: string | undefined, sessionId: string) {
    const current = await this.requireSession(rawToken); await this.auth.revokeSessionById(current.user.id, sessionId);
    await this.auth.logEvent({ userId: current.user.id, type: 'session_revoked', ip: current.session.ip, metadata: { sessionId } });
  }

  async completeOnboarding(rawToken?: string) {
    const current = await this.requireSession(rawToken);
    if (!current.user.onboardingCompletedAt) {
      await this.users.completeOnboarding(current.user.id);
      await this.auth.logEvent({ userId: current.user.id, type: 'onboarding_completed', ip: current.session.ip });
    }
  }

  async profile(rawToken?: string) {
    const current = await this.requireSession(rawToken);
    const notifications = await this.users.notificationPreferences(current.user.id);
    if (!notifications) throw new AuthError(500, 'Não foi possível carregar suas preferências.');
    return { user: publicUser(current.user), notifications: publicNotifications(notifications) };
  }

  async updateName(rawToken: string | undefined, name: string) {
    const current = await this.requireSession(rawToken); const user = await this.users.updateProfile(current.user.id, { name });
    await this.auth.logEvent({ userId: current.user.id, type: 'profile_name_updated', ip: current.session.ip });
    return publicUser(user!);
  }

  async updateAvatar(rawToken: string | undefined, avatarUrl: string | null) {
    const current = await this.requireSession(rawToken); const user = await this.users.updateProfile(current.user.id, { avatarUrl });
    await this.auth.logEvent({ userId: current.user.id, type: avatarUrl ? 'profile_avatar_updated' : 'profile_avatar_removed', ip: current.session.ip });
    return publicUser(user!);
  }

  async updateEmail(rawToken: string | undefined, email: string, password: string) {
    const current = await this.requireSession(rawToken);
    if (!current.user.passwordHash || !await verifyPassword(current.user.passwordHash, password)) throw new AuthError(401, 'Senha incorreta.');
    const existing = await this.users.findByEmail(email); if (existing && existing.id !== current.user.id) throw new AuthError(409, 'Este e-mail já está em uso.');
    const user = await this.users.updateProfile(current.user.id, { email });
    await this.auth.revokeOtherSessions(current.user.id, current.session.tokenHash);
    await this.auth.logEvent({ userId: current.user.id, type: 'profile_email_updated', email, ip: current.session.ip });
    return publicUser(user!);
  }

  async updatePassword(rawToken: string | undefined, currentPassword: string, newPassword: string) {
    const current = await this.requireSession(rawToken);
    if (!current.user.passwordHash || !await verifyPassword(current.user.passwordHash, currentPassword)) throw new AuthError(401, 'Senha atual incorreta.');
    if (await verifyPassword(current.user.passwordHash, newPassword)) throw new AuthError(400, 'A nova senha deve ser diferente da atual.');
    await this.users.updateProfile(current.user.id, { passwordHash: await hashPassword(newPassword) });
    await this.auth.revokeOtherSessions(current.user.id, current.session.tokenHash);
    await this.auth.logEvent({ userId: current.user.id, type: 'profile_password_updated', ip: current.session.ip });
  }

  async updateTheme(rawToken: string | undefined, theme: 'light' | 'dark' | 'system') {
    const current = await this.requireSession(rawToken); const user = await this.users.updateProfile(current.user.id, { theme }); return publicUser(user!);
  }

  async updateNotifications(rawToken: string | undefined, input: { priceTargetAlert: boolean; priceDropAlert: boolean; newLowAlert: boolean; stockAlert: boolean }) {
    const current = await this.requireSession(rawToken); const result = await this.users.updateNotificationPreferences(current.user.id, input);
    if (!result) throw new AuthError(500, 'Não foi possível salvar suas preferências.');
    return publicNotifications(result);
  }

  private async issueSession(userId: string, metadata: RequestMetadata) {
    const token = createOpaqueToken();
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 86_400_000);
    await this.auth.createSession({ userId, tokenHash: hashToken(token), expiresAt, ip: metadata.ip, device: metadata.device });
    return { token, expiresAt };
  }

  private async requireSession(rawToken?: string) {
    if (!rawToken) throw new AuthError(401, 'Faça login para continuar.');
    const result = await this.auth.findActiveSession(hashToken(rawToken));
    if (!result) throw new AuthError(401, 'Sua sessão expirou. Entre novamente.');
    return result;
  }
}

function publicUser(user: { id: string; name: string; email: string; avatarUrl: string | null; twoFactorEnabled: boolean; onboardingCompletedAt: Date | null; theme: 'light' | 'dark' | 'system'; passwordHash: string | null; googleId: string | null }): AuthUser {
  return { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, twoFactorEnabled: user.twoFactorEnabled, onboardingCompleted: Boolean(user.onboardingCompletedAt), theme: user.theme, loginMethods: [...(user.passwordHash ? ['password' as const] : []), ...(user.googleId ? ['google' as const] : [])] };
}

function publicNotifications(value: { priceTargetAlert: boolean; priceDropAlert: boolean; newLowAlert: boolean; stockAlert: boolean }) { return { priceTargetAlert: value.priceTargetAlert, priceDropAlert: value.priceDropAlert, newLowAlert: value.newLowAlert, stockAlert: value.stockAlert }; }

function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

function cleanGoogleName(value: string) { return value.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 120) || 'Usuário'; }
