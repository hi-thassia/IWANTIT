import type { ApiMessage, AuthResponse, LoginResponse, ProfileResponse, SessionInfo } from '@iwantit/shared';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../../config/env.js';
import type { AuthService } from './auth.service.js';
import QRCode from 'qrcode';
import { forgotPasswordSchema, loginSchema, notificationPreferencesSchema, profileAvatarSchema, profileEmailSchema, profileNameSchema, profilePasswordSchema, profileThemeSchema, registerSchema, resetPasswordSchema, sessionIdSchema, twoFactorCodeSchema, twoFactorDisableSchema, twoFactorLoginSchema, twoFactorSetupSchema } from './auth.schemas.js';

const cookieName = env.NODE_ENV === 'production' ? '__Host-iwantit_session' : 'iwantit_session';
const cookieBase = { path: '/', httpOnly: true, sameSite: 'strict' as const, secure: env.NODE_ENV === 'production' };
const oauthBindingCookie = 'iwantit_oauth_binding';
const oauthChallengeCookie = 'iwantit_oauth_2fa';

export async function authRoutes(app: FastifyInstance, service: AuthService) {
  app.get('/google', { config: { rateLimit: { max: 10, timeWindow: '5 minutes' } } }, async (_request, reply) => {
    try {
      const result = await service.beginGoogleOAuth();
      reply.setCookie(oauthBindingCookie, result.browserBinding, { ...cookieBase, sameSite: 'lax', maxAge: 600 });
      return reply.redirect(result.authorizationUrl.toString());
    } catch {
      return reply.redirect(oauthRedirect('unavailable'));
    }
  });

  app.get('/google/callback', async (request, reply) => {
    const query = request.query as { state?: string; error?: string };
    const callbackUrl = new URL(env.GOOGLE_REDIRECT_URI); callbackUrl.search = new URL(request.url, 'http://localhost').search;
    try {
      const result = await service.completeGoogleOAuth({ callbackUrl, state: query.state, browserBinding: request.cookies[oauthBindingCookie], providerError: query.error }, metadata(request));
      reply.clearCookie(oauthBindingCookie, { ...cookieBase, sameSite: 'lax' });
      if ('requiresTwoFactor' in result) {
        reply.setCookie(oauthChallengeCookie, result.challengeToken!, { ...cookieBase, maxAge: env.TWO_FACTOR_CHALLENGE_TTL_MINUTES * 60 });
        return reply.redirect(oauthRedirect('two_factor'));
      }
      setSessionCookie(reply, result.token, result.expiresAt);
      return reply.redirect(env.GOOGLE_OAUTH_SUCCESS_URL);
    } catch (error) {
      request.log.warn({ errorType: error instanceof Error ? error.name : 'unknown' }, 'Google OAuth callback failed');
      reply.clearCookie(oauthBindingCookie, { ...cookieBase, sameSite: 'lax' });
      return reply.redirect(oauthRedirect(query.error === 'access_denied' ? 'cancelled' : 'error'));
    }
  });

  app.post('/google/2fa', { config: { rateLimit: { max: 8, timeWindow: '5 minutes' } } }, async (request, reply): Promise<AuthResponse> => {
    const { code } = twoFactorCodeSchema.parse(request.body);
    const result = await service.completeTwoFactorLogin(request.cookies[oauthChallengeCookie] ?? '', code);
    reply.clearCookie(oauthChallengeCookie, cookieBase); setSessionCookie(reply, result.token, result.expiresAt);
    return { user: result.user };
  });
  app.post('/register', async (request, reply): Promise<AuthResponse> => {
    const result = await service.register(registerSchema.parse(request.body), metadata(request));
    setSessionCookie(reply, result.token, result.expiresAt);
    reply.code(201);
    return { user: result.user };
  });

  app.post('/login', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply): Promise<LoginResponse> => {
    const result = await service.login(loginSchema.parse(request.body), metadata(request));
    if ('requiresTwoFactor' in result) { reply.code(202); return result; }
    setSessionCookie(reply, result.token, result.expiresAt);
    return { user: result.user };
  });

  app.post('/login/2fa', { config: { rateLimit: { max: 8, timeWindow: '5 minutes' } } }, async (request, reply): Promise<AuthResponse> => {
    const input = twoFactorLoginSchema.parse(request.body); const result = await service.completeTwoFactorLogin(input.challengeToken, input.code);
    setSessionCookie(reply, result.token, result.expiresAt); return { user: result.user };
  });

  app.post('/logout', async (request, reply) => {
    await service.logout(request.cookies[cookieName]);
    reply.clearCookie(cookieName, cookieBase).code(204).send();
  });

  app.get('/session', async (request): Promise<AuthResponse> => ({
    user: await service.authenticate(request.cookies[cookieName]),
  }));

  app.post('/forgot-password', async (request, reply): Promise<ApiMessage> => {
    const { email } = forgotPasswordSchema.parse(request.body);
    try {
      await service.requestPasswordReset(email);
    } catch (error) {
      request.log.error(error, 'Failed to deliver password reset email');
    }
    reply.code(202);
    return { message: 'Se existir uma conta com este e-mail, enviaremos as instruções de recuperação.' };
  });

  app.post('/reset-password', async (request): Promise<ApiMessage> => {
    const { token, password } = resetPasswordSchema.parse(request.body);
    await service.resetPassword(token, password);
    return { message: 'Senha redefinida. Entre novamente com sua nova senha.' };
  });

  app.post('/2fa/setup', async (request) => { const input = twoFactorSetupSchema.parse(request.body); const result = await service.setupTwoFactor(request.cookies[cookieName], input.password); return { ...result, qrCode: await QRCode.toDataURL(result.uri, { width: 240, margin: 1 }) }; });
  app.post('/2fa/enable', async (request): Promise<ApiMessage> => { const { code } = twoFactorCodeSchema.parse(request.body); await service.enableTwoFactor(request.cookies[cookieName], code); return { message: 'Autenticação em dois fatores ativada.' }; });
  app.post('/2fa/disable', async (request): Promise<ApiMessage> => { const input = twoFactorDisableSchema.parse(request.body); await service.disableTwoFactor(request.cookies[cookieName], input.password, input.code); return { message: 'Autenticação em dois fatores desativada.' }; });

  app.get('/sessions', async (request): Promise<{ sessions: SessionInfo[] }> => ({ sessions: await service.sessions(request.cookies[cookieName]) }));
  app.delete('/sessions/:id', async (request, reply) => { const { id } = sessionIdSchema.parse(request.params); await service.revokeSession(request.cookies[cookieName], id); reply.code(204).send(); });
}

function oauthRedirect(status: 'cancelled' | 'error' | 'two_factor' | 'unavailable') {
  const url = new URL(env.GOOGLE_OAUTH_ERROR_URL); url.searchParams.set('oauth', status); return url.toString();
}

export async function privateRoutes(app: FastifyInstance, service: AuthService) {
  app.get('/private', async (request): Promise<AuthResponse> => ({
    user: await service.authenticate(request.cookies[cookieName]),
  }));
  app.post('/onboarding/complete', async (request): Promise<ApiMessage> => {
    await service.completeOnboarding(request.cookies[cookieName]);
    return { message: 'Onboarding concluído.' };
  });
  app.get('/profile', async (request): Promise<ProfileResponse> => service.profile(request.cookies[cookieName]));
  app.patch('/profile/name', async (request): Promise<AuthResponse> => ({ user: await service.updateName(request.cookies[cookieName], profileNameSchema.parse(request.body).name) }));
  app.patch('/profile/avatar', { bodyLimit: 400_000 }, async (request): Promise<AuthResponse> => ({ user: await service.updateAvatar(request.cookies[cookieName], profileAvatarSchema.parse(request.body).avatarUrl) }));
  app.post('/profile/email', async (request): Promise<AuthResponse> => { const input = profileEmailSchema.parse(request.body); return { user: await service.updateEmail(request.cookies[cookieName], input.email, input.password) }; });
  app.post('/profile/password', async (request): Promise<ApiMessage> => { const input = profilePasswordSchema.parse(request.body); await service.updatePassword(request.cookies[cookieName], input.currentPassword, input.newPassword); return { message: 'Senha alterada com segurança.' }; });
  app.patch('/profile/theme', async (request): Promise<AuthResponse> => ({ user: await service.updateTheme(request.cookies[cookieName], profileThemeSchema.parse(request.body).theme) }));
  app.patch('/profile/notifications', async (request) => ({ notifications: await service.updateNotifications(request.cookies[cookieName], notificationPreferencesSchema.parse(request.body)) }));
}

function setSessionCookie(reply: FastifyReply, token: string, expires: Date) {
  reply.setCookie(cookieName, token, { ...cookieBase, expires, priority: 'high' });
}

function metadata(request: FastifyRequest) {
  const userAgent = request.headers['user-agent'];
  return { ip: request.ip, device: typeof userAgent === 'string' ? userAgent.slice(0, 255) : undefined };
}
