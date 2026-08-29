import { hash, verify, type Algorithm } from '@node-rs/argon2';
import { createHash, randomBytes } from 'node:crypto';

const argonOptions = {
  algorithm: 2 as Algorithm,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
};

export const hashPassword = (password: string) => hash(password, argonOptions);
export const verifyPassword = (passwordHash: string, password: string) => verify(passwordHash, password);
export const createOpaqueToken = () => randomBytes(32).toString('base64url');
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
