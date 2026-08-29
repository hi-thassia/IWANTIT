import * as oidc from 'openid-client';
import { env } from '../../config/env.js';

export type GoogleIdentity = { subject: string; email: string; emailVerified: boolean; name: string; picture?: string };
export interface GoogleOAuthProvider {
  createAuthorizationUrl(input: { state: string; nonce: string; codeVerifier: string }): Promise<URL>;
  exchange(input: { callbackUrl: URL; state: string; nonce: string; codeVerifier: string }): Promise<GoogleIdentity>;
}

export class OpenIdGoogleOAuthProvider implements GoogleOAuthProvider {
  private readonly configuration = oidc.discovery(new URL('https://accounts.google.com'), env.GOOGLE_CLIENT_ID!, env.GOOGLE_CLIENT_SECRET!);
  async createAuthorizationUrl({ state, nonce, codeVerifier }: { state: string; nonce: string; codeVerifier: string }) {
    return oidc.buildAuthorizationUrl(await this.configuration, {
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      scope: 'openid email profile',
      response_type: 'code',
      code_challenge: await oidc.calculatePKCECodeChallenge(codeVerifier),
      code_challenge_method: 'S256', state, nonce,
    });
  }
  async exchange({ callbackUrl, state, nonce, codeVerifier }: { callbackUrl: URL; state: string; nonce: string; codeVerifier: string }) {
    const tokens = await oidc.authorizationCodeGrant(await this.configuration, callbackUrl, { pkceCodeVerifier: codeVerifier, expectedState: state, expectedNonce: nonce, idTokenExpected: true });
    const claims = tokens.claims();
    if (!claims?.sub || typeof claims.email !== 'string') throw new Error('Google did not return required identity claims');
    return { subject: claims.sub, email: claims.email, emailVerified: claims.email_verified === true, name: typeof claims.name === 'string' ? claims.name : claims.email.split('@')[0]!, picture: typeof claims.picture === 'string' ? claims.picture : undefined };
  }
}

export class DisabledGoogleOAuthProvider implements GoogleOAuthProvider {
  async createAuthorizationUrl(): Promise<URL> { throw new Error('Google OAuth is not configured'); }
  async exchange(): Promise<GoogleIdentity> { throw new Error('Google OAuth is not configured'); }
}

export function createGoogleOAuthProvider() { return env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? new OpenIdGoogleOAuthProvider() : new DisabledGoogleOAuthProvider(); }
