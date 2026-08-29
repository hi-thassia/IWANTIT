import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret, generateTotp, verifyTotp } from './totp.js';

describe('TOTP', () => {
  it('matches the RFC 6238 SHA-1 vector truncated to six digits', () => {
    const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
    expect(generateTotp(secret, 59_000).code).toBe('287082');
  });
  it('allows one clock step and prevents replay', () => {
    const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'; const generated = generateTotp(secret, 60_000);
    expect(verifyTotp(secret, generated.code, 90_000)).toBe(generated.step);
    expect(verifyTotp(secret, generated.code, 60_000, generated.step)).toBeNull();
  });
  it('encrypts secrets with authenticated encryption', () => {
    const encrypted = encryptSecret('TOPSECRET');
    expect(encrypted).not.toContain('TOPSECRET');
    expect(decryptSecret(encrypted)).toBe('TOPSECRET');
  });
});
