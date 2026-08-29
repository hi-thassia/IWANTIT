import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const stepSeconds = 30;
let developmentKey: Buffer | undefined;

export function generateTotpSecret() { return encodeBase32(randomBytes(20)); }

export function generateTotp(secret: string, timestamp = Date.now()) {
  const step = Math.floor(timestamp / 1000 / stepSeconds);
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac('sha1', decodeBase32(secret)).update(counter).digest();
  const offset = digest[digest.length - 1]! & 15;
  const binary = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return { code: binary.toString().padStart(6, '0'), step };
}

export function verifyTotp(secret: string, input: string, timestamp = Date.now(), lastUsedStep?: number | null) {
  if (!/^\d{6}$/.test(input)) return null;
  for (const drift of [-1, 0]) {
    const result = generateTotp(secret, timestamp + drift * stepSeconds * 1000);
    if (lastUsedStep !== null && lastUsedStep !== undefined && result.step <= lastUsedStep) continue;
    if (timingSafeEqual(Buffer.from(result.code), Buffer.from(input))) return result.step;
  }
  return null;
}

export function totpUri(secret: string, email: string) {
  const label = encodeURIComponent(`I Want It:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent('I Want It')}&algorithm=SHA1&digits=6&period=30`;
}

export function encryptSecret(secret: string) {
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}

export function decryptSecret(payload: string) {
  const [iv, tag, encrypted] = payload.split('.').map((part) => Buffer.from(part!, 'base64url'));
  if (!iv || !tag || !encrypted) throw new Error('Invalid encrypted secret');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv); decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function validateTwoFactorConfiguration() { void encryptionKey(); }

function encryptionKey() {
  if (env.TWO_FACTOR_ENCRYPTION_KEY) {
    const key = Buffer.from(env.TWO_FACTOR_ENCRYPTION_KEY, 'base64');
    if (key.length !== 32) throw new Error('TWO_FACTOR_ENCRYPTION_KEY must decode to exactly 32 bytes');
    return key;
  }
  if (env.NODE_ENV === 'production') throw new Error('TWO_FACTOR_ENCRYPTION_KEY is required in production');
  developmentKey ??= randomBytes(32);
  return developmentKey;
}

function encodeBase32(buffer: Buffer) {
  let bits = ''; for (const byte of buffer) bits += byte.toString(2).padStart(8, '0');
  let output = ''; for (let index = 0; index < bits.length; index += 5) output += alphabet[Number.parseInt(bits.slice(index, index + 5).padEnd(5, '0'), 2)];
  return output;
}

function decodeBase32(value: string) {
  let bits = ''; for (const character of value.replace(/=+$/g, '').toUpperCase()) { const index = alphabet.indexOf(character); if (index < 0) throw new Error('Invalid base32'); bits += index.toString(2).padStart(5, '0'); }
  const bytes: number[] = []; for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  return Buffer.from(bytes);
}
